-- Dragg Database Schema
-- Complete schema with all tables, policies, and functions

create extension if not exists "pgcrypto";

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now ()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  name text not null,
  group_type text not null check (
    group_type in ('needs', 'wants', 'savings', 'income')
  ),
  monthly_limit numeric,
  is_default boolean not null default false,
  icon text not null default '🏷️',
  created_at timestamptz not null default now ()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (
    type in ('pix', 'debit', 'credit', 'cash', 'bank', 'boleto', 'other')
  ),
  credit_limit numeric,
  due_day smallint check (due_day is null or due_day between 1 and 31),
  closing_day smallint check (closing_day is null or closing_day between 1 and 31),
  created_at timestamptz not null default now ()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric not null check (amount >= 0),
  kind text not null check (kind in ('income', 'expense', 'saving')),
  category_id uuid references public.categories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  notes text,
  created_at timestamptz not null default now ()
);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  month date not null,
  income numeric,
  needs_limit numeric,
  wants_limit numeric,
  savings_limit numeric,
  created_at timestamptz not null default now (),
  unique (user_id, month)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '🎯',
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  deadline date not null,
  color text not null default '#22C55E',
  created_at timestamptz not null default now ()
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.goals enable row level security;

create policy "Users can read own profile" on public.profiles for
select
  using (id = auth.uid ());

create policy "Users can update own profile" on public.profiles for
update using (id = auth.uid ())
with
  check (id = auth.uid ());

create policy "Users can manage own categories" on public.categories for all using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "Users can manage own payment methods" on public.payment_methods for all using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "Users can manage own transactions" on public.transactions for all using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "Users can manage own monthly budgets" on public.monthly_budgets for all using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "Users can manage own goals" on public.goals for all using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
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
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists categories_user_id_idx on public.categories (user_id);
create index if not exists payment_methods_user_id_idx on public.payment_methods (user_id);
create index if not exists transactions_user_id_date_idx on public.transactions (user_id, date);
create index if not exists transactions_category_id_idx on public.transactions (category_id);
create index if not exists transactions_payment_method_id_idx on public.transactions (payment_method_id);
create index if not exists monthly_budgets_user_id_month_idx on public.monthly_budgets (user_id, month);
create index if not exists goals_user_id_deadline_idx on public.goals (user_id, deadline);

-- Add index for faster subscription lookups by user_id and description
CREATE INDEX IF NOT EXISTS transactions_user_id_description_idx
  ON public.transactions (user_id, description);

-- Add index for subscription lookups by notes pattern (optional, depends on query patterns)
CREATE INDEX IF NOT EXISTS transactions_user_id_notes_idx
  ON public.transactions (user_id, notes)
  WHERE notes LIKE 'subscription%';
