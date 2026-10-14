alter table public.transactions
  add column if not exists import_key text;

alter table public.transactions
  add constraint transactions_import_key_length
  check (import_key is null or char_length(import_key) <= 300);

-- Re-importing the same statement must never create the same row twice.
create unique index if not exists transactions_user_import_key_idx
  on public.transactions (user_id, import_key)
  where import_key is not null;

comment on column public.transactions.import_key is
  'Dedupe key of a row imported from a bank statement (bank id or date|amount|description). Null for manually created transactions.';
