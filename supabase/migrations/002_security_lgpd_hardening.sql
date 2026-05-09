-- Security and LGPD hardening
-- Applies defense-in-depth controls without changing the app-facing table shape.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

-- Keep helper functions outside exposed schemas.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.categories add column if not exists updated_at timestamptz not null default now();
alter table public.payment_methods add column if not exists updated_at timestamptz not null default now();
alter table public.transactions add column if not exists updated_at timestamptz not null default now();
alter table public.monthly_budgets add column if not exists updated_at timestamptz not null default now();
alter table public.goals add column if not exists updated_at timestamptz not null default now();

alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.categories add column if not exists deleted_at timestamptz;
alter table public.payment_methods add column if not exists deleted_at timestamptz;
alter table public.transactions add column if not exists deleted_at timestamptz;
alter table public.monthly_budgets add column if not exists deleted_at timestamptz;
alter table public.goals add column if not exists deleted_at timestamptz;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
before update on public.categories
for each row execute function private.touch_updated_at();

drop trigger if exists payment_methods_touch_updated_at on public.payment_methods;
create trigger payment_methods_touch_updated_at
before update on public.payment_methods
for each row execute function private.touch_updated_at();

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
before update on public.transactions
for each row execute function private.touch_updated_at();

drop trigger if exists monthly_budgets_touch_updated_at on public.monthly_budgets;
create trigger monthly_budgets_touch_updated_at
before update on public.monthly_budgets
for each row execute function private.touch_updated_at();

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
before update on public.goals
for each row execute function private.touch_updated_at();

-- Privacy request records support LGPD workflows such as export, correction,
-- deletion, and consent/contact requests.
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  request_type text not null check (
    request_type in ('access', 'export', 'correction', 'deletion', 'consent', 'support')
  ),
  status text not null default 'open' check (
    status in ('open', 'in_review', 'completed', 'rejected', 'cancelled')
  ),
  details text,
  response text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.privacy_requests enable row level security;
alter table public.privacy_requests force row level security;

drop trigger if exists privacy_requests_touch_updated_at on public.privacy_requests;
create trigger privacy_requests_touch_updated_at
before update on public.privacy_requests
for each row execute function private.touch_updated_at();

create index if not exists privacy_requests_user_id_requested_at_idx
on public.privacy_requests (user_id, requested_at desc);

-- Keep the Auth trigger privileged, but no longer in the exposed public schema.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )
  );

  insert into public.categories (
    user_id,
    name,
    group_type,
    monthly_limit,
    is_default,
    icon
  )
  values
    (new.id, 'Housing', 'needs', 2000, true, '🏠'),
    (new.id, 'Food', 'needs', 400, true, '🛒'),
    (new.id, 'Transportation', 'needs', 300, true, '🚗'),
    (new.id, 'Health', 'needs', 200, true, '💡'),
    (new.id, 'Education', 'needs', 160, true, '📚'),
    (new.id, 'Important', 'needs', 180, true, '⚡'),
    (new.id, 'Debt', 'needs', 250, true, '🧾'),
    (new.id, 'Leisure', 'wants', 150, true, '📺'),
    (new.id, 'Subscriptions', 'wants', 200, true, '🎬'),
    (new.id, 'Shopping', 'wants', 300, true, '🛍️'),
    (new.id, 'Others', 'wants', 120, true, '🏷️'),
    (new.id, 'Investments', 'savings', 500, true, '📈'),
    (new.id, 'Income', 'income', null, true, '💼');

  insert into public.payment_methods (
    user_id,
    name,
    type,
    credit_limit
  )
  values
    (new.id, 'Pix', 'pix', null),
    (new.id, 'Cash', 'cash', null),
    (new.id, 'Credit Card', 'credit', 0),
    (new.id, 'Debit Card', 'debit', null);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

drop function if exists public.handle_new_user();

-- Prevent a transaction from referencing another user's category/payment method.
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

  return new;
end;
$$;

drop trigger if exists transactions_validate_owner_refs on public.transactions;
create trigger transactions_validate_owner_refs
before insert or update of user_id, category_id, payment_method_id
on public.transactions
for each row execute function private.validate_transaction_owner_refs();

-- Explicit grants: no unauthenticated access to user-owned finance data.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.categories,
  public.payment_methods,
  public.transactions,
  public.monthly_budgets,
  public.goals,
  public.privacy_requests
to authenticated;

-- RLS hardening: split broad "for all" policies into operation-specific
-- authenticated policies and make unauthenticated access fail explicitly.
alter table public.profiles force row level security;
alter table public.categories force row level security;
alter table public.payment_methods force row level security;
alter table public.transactions force row level security;
alter table public.monthly_budgets force row level security;
alter table public.goals force row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Users can manage own categories" on public.categories;
drop policy if exists "Users can select own categories" on public.categories;
drop policy if exists "Users can insert own categories" on public.categories;
drop policy if exists "Users can update own categories" on public.categories;
drop policy if exists "Users can delete own categories" on public.categories;

create policy "Users can select own categories"
on public.categories for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can insert own categories"
on public.categories for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own categories"
on public.categories for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete own categories"
on public.categories for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists "Users can manage own payment methods" on public.payment_methods;
drop policy if exists "Users can select own payment methods" on public.payment_methods;
drop policy if exists "Users can insert own payment methods" on public.payment_methods;
drop policy if exists "Users can update own payment methods" on public.payment_methods;
drop policy if exists "Users can delete own payment methods" on public.payment_methods;

create policy "Users can select own payment methods"
on public.payment_methods for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can insert own payment methods"
on public.payment_methods for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own payment methods"
on public.payment_methods for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete own payment methods"
on public.payment_methods for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists "Users can manage own transactions" on public.transactions;
drop policy if exists "Users can select own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;

create policy "Users can select own transactions"
on public.transactions for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can insert own transactions"
on public.transactions for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own transactions"
on public.transactions for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete own transactions"
on public.transactions for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists "Users can manage own monthly budgets" on public.monthly_budgets;
drop policy if exists "Users can select own monthly budgets" on public.monthly_budgets;
drop policy if exists "Users can insert own monthly budgets" on public.monthly_budgets;
drop policy if exists "Users can update own monthly budgets" on public.monthly_budgets;
drop policy if exists "Users can delete own monthly budgets" on public.monthly_budgets;

create policy "Users can select own monthly budgets"
on public.monthly_budgets for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can insert own monthly budgets"
on public.monthly_budgets for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own monthly budgets"
on public.monthly_budgets for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete own monthly budgets"
on public.monthly_budgets for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists "Users can manage own goals" on public.goals;
drop policy if exists "Users can select own goals" on public.goals;
drop policy if exists "Users can insert own goals" on public.goals;
drop policy if exists "Users can update own goals" on public.goals;
drop policy if exists "Users can delete own goals" on public.goals;

create policy "Users can select own goals"
on public.goals for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can insert own goals"
on public.goals for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own goals"
on public.goals for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete own goals"
on public.goals for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists "Users can select own privacy requests" on public.privacy_requests;
drop policy if exists "Users can insert own privacy requests" on public.privacy_requests;
drop policy if exists "Users can update own open privacy requests" on public.privacy_requests;

create policy "Users can select own privacy requests"
on public.privacy_requests for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can insert own privacy requests"
on public.privacy_requests for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own open privacy requests"
on public.privacy_requests for update
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and status in ('open', 'in_review')
)
with check (
  user_id = (select auth.uid())
  and status in ('open', 'cancelled')
);

comment on table public.profiles is
  'Contains personal data. Access is restricted by RLS. Prefer minimization and avoid storing authorization data in user metadata.';
comment on table public.transactions is
  'Contains financial personal data. Encrypt highly sensitive free-text fields at the application layer before adding stronger search/reporting requirements.';
comment on column public.transactions.description is
  'Sensitive free-text field. Keep concise and avoid credentials, account numbers, or document IDs.';
comment on column public.transactions.notes is
  'Sensitive free-text field. Suitable candidate for application-layer encryption.';
comment on table public.privacy_requests is
  'LGPD workflow table for access, export, correction, deletion, consent, and support requests.';
