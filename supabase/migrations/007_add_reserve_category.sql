insert into
  public.categories (
    user_id,
    name,
    group_type,
    monthly_limit,
    is_default,
    icon
  )
select
  u.id,
  'Reserve',
  'savings',
  200,
  true,
  '🛟'
from
  auth.users u
where
  not exists (
    select
      1
    from
      public.categories c
    where
      c.user_id = u.id
      and lower(c.name) = 'reserve'
  );