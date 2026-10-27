-- Early amortization of a financed debt (issue #63 follow-up).
-- Additive only: the flag marks the extra payment row of a financing plan,
-- which reduces the principal outside the installment numbering.

alter table public.transactions
  add column if not exists is_amortization boolean not null default false;

-- An extra payment is only meaningful together with the installments it
-- reshaped, so it cannot be deleted alone. pg_trigger_depth() = 1 is a direct
-- DELETE; a cascade from the plan (or the user) fires this trigger one level deeper.
create or replace function private.protect_amortization_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_amortization and pg_trigger_depth() = 1 then
    raise exception 'amortization rows can only be removed with their financing plan';
  end if;

  return old;
end;
$$;

drop trigger if exists transactions_protect_amortization on public.transactions;
create trigger transactions_protect_amortization
before delete on public.transactions
for each row execute function private.protect_amortization_delete();
