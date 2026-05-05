# Database Notes

Database changes live in `supabase/migrations`.

## Expected tables

The app currently reads and writes these Supabase tables:

- `categories`
- `payment_methods`
- `transactions`

## Current migrations

- `20260501000000_create_finance_schema.sql`: creates the finance schema, indexes, RLS policies, updated-at triggers, and default user seed trigger.
- `20260503232000_add_category_icon.sql`: keeps `categories.icon` available for environments that adopted the schema before emoji support.

## What belongs in the repository

The repository should include:

- schema migrations
- table constraints
- indexes
- RLS policies
- trigger/function definitions required to run the app
- seed/default data that does not contain private user information

The repository must not include:

- Supabase service-role keys
- OAuth client secrets
- `.env.local`
- production database URLs
- dumps with real user data
- access tokens or refresh tokens

## Category fields used by the app

- `id`
- `user_id`
- `name`
- `icon`
- `group_type`
- `is_default`
- `monthly_limit`

## Payment method fields used by the app

- `id`
- `user_id`
- `name`
- `type`
- `is_default`

## Transaction fields used by the app

- `id`
- `user_id`
- `amount`
- `category_id`
- `date`
- `description`
- `kind`
- `notes`
- `payment_method_id`

## Applying migrations

Preferred:

```bash
supabase db push
```

Fallback:

Apply the SQL files in `supabase/migrations` through the Supabase SQL editor.

## Security requirements

- Keep RLS enabled on exposed user-owned tables.
- Policies should restrict rows by the authenticated user's ID.
- Do not grant broad public write access.
- Do not expose service-role credentials to the application frontend.
