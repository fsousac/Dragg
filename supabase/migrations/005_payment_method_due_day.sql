alter table public.payment_methods
  add column if not exists due_day smallint;

alter table public.payment_methods
  drop constraint if exists payment_methods_due_day_check;

alter table public.payment_methods
  add constraint payment_methods_due_day_check
  check (due_day is null or due_day between 1 and 31);
