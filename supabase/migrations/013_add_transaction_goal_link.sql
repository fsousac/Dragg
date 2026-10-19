-- Links an expense to a savings goal: once the row's date is reached, its
-- amount counts toward the goal (see listGoals). Additive: null by default.

alter table public.transactions
  add column if not exists goal_id uuid
    references public.goals (id) on delete set null;

alter table public.transactions
  drop constraint if exists transactions_goal_only_on_expense;

alter table public.transactions
  add constraint transactions_goal_only_on_expense
  check (goal_id is null or kind = 'expense');

create index if not exists transactions_user_goal_idx
  on public.transactions (user_id, goal_id)
  where goal_id is not null;

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

  if new.goal_id is not null and not exists (
    select 1
    from public.goals
    where id = new.goal_id
      and user_id = new.user_id
  ) then
    raise exception 'invalid goal for transaction owner';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_validate_owner_refs on public.transactions;
create trigger transactions_validate_owner_refs
before insert or update of user_id, category_id, payment_method_id, financing_plan_id, goal_id
on public.transactions
for each row execute function private.validate_transaction_owner_refs();
