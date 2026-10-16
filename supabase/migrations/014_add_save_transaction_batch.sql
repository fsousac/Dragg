-- Atomic multi-row writes for financing and amortization (issue #63).
-- supabase-js cannot run several statements in one transaction, so the plan
-- insert, the transaction inserts and the replaced-row deletes run inside one
-- function call. SECURITY INVOKER: RLS and the ownership triggers still apply.

create or replace function public.save_transaction_batch(
  p_plan jsonb,
  p_rows jsonb,
  p_delete_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_plan is not null then
    insert into public.financing_plans (
      id, user_id, operation_type, interest_system, rate_input_mode, rate,
      rate_period, principal, down_payment, fees, installment_count,
      savings_funded_amount
    )
    select
      r.id, r.user_id, r.operation_type, r.interest_system,
      r.rate_input_mode, r.rate, r.rate_period, r.principal, r.down_payment,
      r.fees, r.installment_count, r.savings_funded_amount
    from jsonb_populate_record(null::public.financing_plans, p_plan) r;
  end if;

  insert into public.transactions (
    user_id, date, description, amount, kind, category_id, payment_method_id,
    notes, installment_group_id, installment_number, installment_total,
    financing_plan_id, principal_portion, interest_portion,
    savings_funded_amount, is_amortization, goal_id
  )
  select
    r.user_id, r.date, r.description, r.amount, r.kind, r.category_id,
    r.payment_method_id, r.notes, r.installment_group_id,
    r.installment_number, r.installment_total, r.financing_plan_id,
    r.principal_portion, r.interest_portion,
    coalesce(r.savings_funded_amount, 0), coalesce(r.is_amortization, false),
    r.goal_id
  from jsonb_populate_recordset(null::public.transactions, p_rows) r;

  if p_delete_ids is not null then
    delete from public.transactions
    where id = any (p_delete_ids)
      and user_id = (select auth.uid());
  end if;
end;
$$;

revoke all on function public.save_transaction_batch(jsonb, jsonb, uuid[]) from public;
grant execute on function public.save_transaction_batch(jsonb, jsonb, uuid[]) to authenticated;
