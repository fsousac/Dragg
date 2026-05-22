create or replace function public.calculate_total_saved(p_selected_month date)
returns numeric
language sql
stable
set search_path = public
as $$
  with month_bounds as (
    select
      date_trunc('month', p_selected_month)::date as selected_month_start,
      (date_trunc('month', p_selected_month)::date + interval '1 month')::date as next_month_start
  ),
  invested as (
    select coalesce(sum(t.amount), 0)::numeric as amount
    from public.transactions t
    left join public.categories c
      on c.id = t.category_id
      and c.user_id = t.user_id
    cross join month_bounds b
    where t.user_id = (select auth.uid())
      and t.date < b.next_month_start
      and (
        t.kind = 'saving'
        or c.group_type = 'savings'
      )
  ),
  monthly_balances as (
    select
      date_trunc('month', t.date)::date as month,
      coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric as income,
      coalesce(
        sum(t.amount) filter (
          where t.kind = 'expense'
            and coalesce(c.group_type, '') <> 'savings'
        ),
        0
      )::numeric as expenses,
      coalesce(
        sum(t.amount) filter (
          where t.kind = 'saving'
            or c.group_type = 'savings'
        ),
        0
      )::numeric as savings
    from public.transactions t
    left join public.categories c
      on c.id = t.category_id
      and c.user_id = t.user_id
    cross join month_bounds b
    where t.user_id = (select auth.uid())
      and t.date < b.next_month_start
    group by date_trunc('month', t.date)::date
  ),
  closed_month_balance as (
    select coalesce(
      sum(
        case
          when income - expenses < 0 then income - expenses
          else greatest(income - expenses - savings, 0)
        end
      ),
      0
    )::numeric as amount
    from monthly_balances
    cross join month_bounds b
    where month < b.selected_month_start
  ),
  selected_month_deficit as (
    select least(coalesce(income - expenses, 0), 0)::numeric as amount
    from month_bounds b
    left join monthly_balances mb
      on mb.month = b.selected_month_start
  )
  select (
    invested.amount +
    closed_month_balance.amount +
    selected_month_deficit.amount
  )::numeric
  from invested
  cross join closed_month_balance
  cross join selected_month_deficit;
$$;

revoke all on function public.calculate_total_saved(date) from public;
grant execute on function public.calculate_total_saved(date) to authenticated;
