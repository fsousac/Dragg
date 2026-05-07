alter table public.payment_methods
  add column if not exists closing_day smallint;

alter table public.payment_methods
  drop constraint if exists payment_methods_closing_day_check;

alter table public.payment_methods
  add constraint payment_methods_closing_day_check
  check (closing_day is null or closing_day between 1 and 31);
