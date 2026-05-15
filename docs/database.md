# Database Notes

Database changes live in `supabase/migrations`.

## Current tables

The current committed schema defines these Supabase tables:

- `profiles`
- `categories`
- `payment_methods`
- `transactions`
- `monthly_budgets`
- `goals`
- `privacy_requests`

## Current migrations

- `001_init.sql`: creates the finance schema, indexes, initial RLS policies, profile/category/payment-method defaults, and the initial auth user seed trigger.
- `002_security_lgpd_hardening.sql`: adds `updated_at` and `deleted_at` columns, moves helper functions into the private schema, adds privacy requests, hardens grants and RLS policies, validates transaction ownership references, and adds LGPD-oriented comments.

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

## Profile fields used by the app

- `id`
- `email`
- `name`
- `created_at`
- `updated_at`
- `deleted_at`

## Category fields used by the app

- `id`
- `user_id`
- `name`
- `icon`
- `group_type`
- `is_default`
- `monthly_limit`
- `created_at`
- `updated_at`
- `deleted_at`

## Payment method fields used by the app

- `id`
- `user_id`
- `name`
- `type`
- `credit_limit`
- `due_day`
- `closing_day`
- `created_at`
- `updated_at`
- `deleted_at`

The application has backward-compatible fallbacks for older environments that do not have all optional payment-method fields. The current committed schema includes credit-card limit and due/closing day support, but does not define an `is_default` column for payment methods.

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
- `created_at`
- `updated_at`
- `deleted_at`

Installments and subscriptions are modeled as multiple transaction rows. Subscription rows use `notes` values beginning with `subscription`; paused subscriptions use `subscription paused`.

## Monthly budget fields in the schema

- `id`
- `user_id`
- `month`
- `income`
- `needs_limit`
- `wants_limit`
- `savings_limit`
- `created_at`
- `updated_at`
- `deleted_at`

The current UI calculates 50/30/20 budget data from transactions and category limits. The `monthly_budgets` table is available in the schema for persisted monthly budget plans.

## Goal fields used by the app

- `id`
- `user_id`
- `name`
- `icon`
- `target_amount`
- `current_amount`
- `deadline`
- `color`
- `created_at`
- `updated_at`
- `deleted_at`

`lib/finance/transactions.ts` calls the `add_goal_funds` RPC when adding funds to an existing goal. If an environment does not already provide this RPC, add a migration before using the goal funding flow.

## Privacy request fields in the schema

- `id`
- `user_id`
- `request_type`
- `status`
- `details`
- `response`
- `requested_at`
- `resolved_at`
- `updated_at`

The table supports LGPD workflows for access, export, correction, deletion, consent, and support requests.

## Database functions and triggers

- `private.handle_new_user()` creates a profile, default categories, and default payment methods after Supabase Auth user creation.
- `private.touch_updated_at()` keeps `updated_at` current on updates.
- `private.validate_transaction_owner_refs()` prevents transactions from referencing categories or payment methods owned by another user.
- `on_auth_user_created` runs after inserts on `auth.users`.

## Applying migrations

Preferred:

```bash
supabase db push
```

Fallback:

Apply the SQL files in `supabase/migrations` through the Supabase SQL editor.

## Security requirements

- Keep RLS enabled on exposed user-owned tables.
- Force RLS where the current migrations force it.
- Policies should restrict rows by the authenticated user's ID and should be operation-specific when possible.
- Do not grant broad public write access.
- Keep unauthenticated `anon` access revoked for user-owned finance data.
- Do not expose service-role credentials to the application frontend.
- Keep privileged helper functions out of exposed schemas.
