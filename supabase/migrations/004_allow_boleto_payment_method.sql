alter table public.payment_methods
  drop constraint if exists payment_methods_type_check;

alter table public.payment_methods
  add constraint payment_methods_type_check
  check (type in ('pix', 'debit', 'credit', 'cash', 'bank', 'boleto', 'other'));
