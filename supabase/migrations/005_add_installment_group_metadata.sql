alter table public.transactions
  add column if not exists installment_group_id uuid,
  add column if not exists installment_number integer,
  add column if not exists installment_total integer;

alter table public.transactions
  add constraint transactions_installment_number_positive
  check (installment_number is null or installment_number >= 1);

alter table public.transactions
  add constraint transactions_installment_total_positive
  check (installment_total is null or installment_total >= 1);

alter table public.transactions
  add constraint transactions_installment_number_not_greater_than_total
  check (
    installment_number is null
    or installment_total is null
    or installment_number <= installment_total
  );

alter table public.transactions
  add constraint transactions_installment_fields_consistent
  check (
    (
      installment_group_id is null
      and installment_number is null
      and installment_total is null
    )
    or
    (
      installment_group_id is not null
      and installment_number is not null
      and installment_total is not null
    )
  );

create index if not exists transactions_user_installment_group_idx
  on public.transactions (user_id, installment_group_id)
  where installment_group_id is not null;
