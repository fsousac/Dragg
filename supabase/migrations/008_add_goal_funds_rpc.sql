-- lib/finance/transactions.ts's addGoalFunds() calls this RPC, but it was
-- never defined in a migration, so every "add funds to goal" attempt failed
-- with a "function does not exist" error.
create or replace function public.add_goal_funds(
  p_goal_id uuid,
  p_user_id uuid,
  p_amount numeric
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row_count int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  update public.goals
  set current_amount = least(current_amount + p_amount, target_amount)
  where id = p_goal_id
    and user_id = p_user_id;

  get diagnostics v_row_count = row_count;

  return v_row_count > 0;
end;
$$;

revoke all on function public.add_goal_funds(uuid, uuid, numeric) from public;
grant execute on function public.add_goal_funds(uuid, uuid, numeric) to authenticated;
