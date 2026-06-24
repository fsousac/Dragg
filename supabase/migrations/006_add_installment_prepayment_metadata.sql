alter table public.transactions
  add column if not exists advanced_to_month text,
  add column if not exists advanced_at timestamptz;

alter table public.transactions
  add constraint transactions_advanced_to_month_format
  check (advanced_to_month is null or advanced_to_month ~ '^\d{4}-\d{2}$');

alter table public.transactions
  add constraint transactions_advanced_fields_consistent
  check (
    (advanced_to_month is null and advanced_at is null)
    or
    (advanced_to_month is not null and advanced_at is not null)
  );

create index if not exists transactions_user_advanced_to_month_idx
  on public.transactions (user_id, advanced_to_month)
  where advanced_to_month is not null;
