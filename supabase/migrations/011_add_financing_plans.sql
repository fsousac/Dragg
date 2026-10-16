-- Interest-bearing purchases, loans and savings-funded expenses (issue #63).
-- Additive only: every new column has a neutral default, so existing rows
-- and flows are unchanged.

create table if not exists public.financing_plans (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  operation_type text not null
    check (operation_type in ('purchase', 'loan')),
  interest_system text not null
    check (interest_system in ('simple', 'price', 'sac')),
  rate_input_mode text not null
    check (rate_input_mode in ('rate', 'installment')),
  rate numeric not null check (rate >= 0 and rate <= 1000),
  rate_period text not null check (rate_period in ('monthly', 'annual')),
  principal numeric not null check (principal > 0),
  down_payment numeric not null default 0
    check (down_payment >= 0 and down_payment < principal),
  fees numeric not null default 0 check (fees >= 0),
  installment_count integer not null
    check (installment_count between 1 and 120),
  savings_funded_amount numeric not null default 0
    check (savings_funded_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists financing_plans_user_id_idx
  on public.financing_plans (user_id);

alter table public.financing_plans enable row level security;

revoke all on public.financing_plans from anon;
grant select, insert, delete on public.financing_plans to authenticated;

-- Plans are immutable: no update policy.
create policy "Users can select own financing plans"
on public.financing_plans for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can insert own financing plans"
on public.financing_plans for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can delete own financing plans"
on public.financing_plans for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

-- financing_plan_id links every row of a financed operation (down payment,
-- installments, loan income). installment_group_id cannot be reused for
-- that: transactions_installment_fields_consistent requires an
-- installment_number whenever the group id is set.
alter table public.transactions
  add column if not exists financing_plan_id uuid
    references public.financing_plans (id) on delete cascade,
  add column if not exists principal_portion numeric,
  add column if not exists interest_portion numeric,
  add column if not exists savings_funded_amount numeric not null default 0;

alter table public.transactions
  drop constraint if exists transactions_savings_funded_amount_range;

alter table public.transactions
  add constraint transactions_savings_funded_amount_range
  check (savings_funded_amount >= 0 and savings_funded_amount <= amount);

create index if not exists transactions_user_financing_plan_idx
  on public.transactions (user_id, financing_plan_id)
  where financing_plan_id is not null;

create or replace function private.validate_transaction_owner_refs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1
    from public.categories
    where id = new.category_id
      and user_id = new.user_id
  ) then
    raise exception 'invalid category for transaction owner';
  end if;

  if new.payment_method_id is not null and not exists (
    select 1
    from public.payment_methods
    where id = new.payment_method_id
      and user_id = new.user_id
  ) then
    raise exception 'invalid payment method for transaction owner';
  end if;

  if new.financing_plan_id is not null and not exists (
    select 1
    from public.financing_plans
    where id = new.financing_plan_id
      and user_id = new.user_id
  ) then
    raise exception 'invalid financing plan for transaction owner';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_validate_owner_refs on public.transactions;
create trigger transactions_validate_owner_refs
before insert or update of user_id, category_id, payment_method_id, financing_plan_id
on public.transactions
for each row execute function private.validate_transaction_owner_refs();

-- Keeps edits consistent with savings funding and financing: the funded part
-- follows the edited amount, only an expense outside the savings group keeps
-- it, and a financed row keeps the amount/kind its principal and interest
-- portions were computed from.
create or replace function private.normalize_transaction_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.financing_plan_id is not null
    and (new.amount <> old.amount or new.kind <> old.kind) then
    raise exception 'financed transactions cannot change amount or kind';
  end if;

  if new.kind <> 'expense' or exists (
    select 1
    from public.categories
    where id = new.category_id
      and group_type = 'savings'
  ) then
    new.savings_funded_amount := 0;
  else
    new.savings_funded_amount := least(new.savings_funded_amount, new.amount);
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_normalize_update on public.transactions;
create trigger transactions_normalize_update
before update of amount, kind, category_id, savings_funded_amount
on public.transactions
for each row execute function private.normalize_transaction_update();

-- Same as 004, except that the savings-funded part of an expense is taken
-- from the saved total ("invested") instead of the month's balance.
create or replace function public.calculate_total_saved(p_selected_month date)
returns numeric
language sql
stable
set search_path = public
as $$
  with month_bounds as (
    select
      date_trunc('month', p_selected_month)::date as selected_month_start,
      (date_trunc('month', p_selected_month)::date + interval '1 month')::date as next_month_start
  ),
  invested as (
    select (
      coalesce(
        sum(t.amount) filter (
          where t.kind = 'saving'
            or c.group_type = 'savings'
        ),
        0
      ) - coalesce(sum(t.savings_funded_amount), 0)
    )::numeric as amount
    from public.transactions t
    left join public.categories c
      on c.id = t.category_id
      and c.user_id = t.user_id
    cross join month_bounds b
    where t.user_id = (select auth.uid())
      and t.date < b.next_month_start
  ),
  monthly_balances as (
    select
      date_trunc('month', t.date)::date as month,
      coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric as income,
      coalesce(
        sum(t.amount - t.savings_funded_amount) filter (
          where t.kind = 'expense'
            and coalesce(c.group_type, '') <> 'savings'
        ),
        0
      )::numeric as expenses,
      coalesce(
        sum(t.amount) filter (
          where t.kind = 'saving'
            or c.group_type = 'savings'
        ),
        0
      )::numeric as savings
    from public.transactions t
    left join public.categories c
      on c.id = t.category_id
      and c.user_id = t.user_id
    cross join month_bounds b
    where t.user_id = (select auth.uid())
      and t.date < b.next_month_start
    group by date_trunc('month', t.date)::date
  ),
  closed_month_balance as (
    select coalesce(
      sum(
        case
          when income - expenses < 0 then income - expenses
          else greatest(income - expenses - savings, 0)
        end
      ),
      0
    )::numeric as amount
    from monthly_balances
    cross join month_bounds b
    where month < b.selected_month_start
  ),
  selected_month_deficit as (
    select least(coalesce(income - expenses, 0), 0)::numeric as amount
    from month_bounds b
    left join monthly_balances mb
      on mb.month = b.selected_month_start
  )
  select (
    invested.amount +
    closed_month_balance.amount +
    selected_month_deficit.amount
  )::numeric
  from invested
  cross join closed_month_balance
  cross join selected_month_deficit;
$$;

revoke all on function public.calculate_total_saved(date) from public;
grant execute on function public.calculate_total_saved(date) to authenticated;
