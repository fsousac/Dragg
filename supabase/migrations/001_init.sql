create extension if not exists "pgcrypto";

create table
  if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text,
    name text,
    created_at timestamptz not null default now ()
  );

create table
  if not exists public.categories (
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

create table
  if not exists public.payment_methods (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
    name text not null,
    type text not null check (
      type in ('pix', 'debit', 'credit', 'cash', 'bank', 'boleto', 'other')
    ),
    credit_limit numeric,
    created_at timestamptz not null default now ()
  );

create table
  if not exists public.transactions (
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

create table
  if not exists public.monthly_budgets (
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

create index if not exists categories_user_id_idx on public.categories (user_id);

create index if not exists payment_methods_user_id_idx on public.payment_methods (user_id);

create index if not exists transactions_user_id_date_idx on public.transactions (user_id, date);

create index if not exists transactions_category_id_idx on public.transactions (category_id);

create index if not exists transactions_payment_method_id_idx on public.transactions (payment_method_id);

create index if not exists monthly_budgets_user_id_month_idx on public.monthly_budgets (user_id, month);
