alter table public.profiles enable row level security;

alter table public.categories enable row level security;

alter table public.payment_methods enable row level security;

alter table public.transactions enable row level security;

alter table public.monthly_budgets enable row level security;

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