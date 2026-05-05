create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )
  );

  insert into public.categories (
    user_id,
    name,
    group_type,
    monthly_limit,
    is_default,
    icon
  )
  values
    (new.id, 'Housing', 'needs', 2000, true, '🏠'),
    (new.id, 'Food', 'needs', 400, true, '🛒'),
    (new.id, 'Transportation', 'needs', 300, true, '🚗'),
    (new.id, 'Health', 'needs', 200, true, '💡'),
    (new.id, 'Education', 'needs', 160, true, '📚'),
    (new.id, 'Important', 'needs', 180, true, '⚡'),
    (new.id, 'Debt', 'needs', 250, true, '🧾'),
    (new.id, 'Leisure', 'wants', 150, true, '📺'),
    (new.id, 'Subscriptions', 'wants', 200, true, '🎬'),
    (new.id, 'Shopping', 'wants', 300, true, '🛍️'),
    (new.id, 'Others', 'wants', 120, true, '🏷️'),
    (new.id, 'Investments', 'savings', 500, true, '📈'),
    (new.id, 'Income', 'income', null, true, '💼');

  insert into public.payment_methods (
    user_id,
    name,
    type,
    credit_limit
  )
  values
    (new.id, 'Pix', 'pix', null),
    (new.id, 'Cash', 'cash', null),
    (new.id, 'Credit Card', 'credit', 0),
    (new.id, 'Debit Card', 'debit', null);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();