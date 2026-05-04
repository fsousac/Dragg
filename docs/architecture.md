# Architecture

Dragg is a Next.js App Router application backed by Supabase Auth and Supabase Postgres.

## Application flow

- Public users land on `/` and sign in with Google OAuth through Supabase Auth.
- Authenticated dashboard routes are wrapped by `AppShell`, which verifies Supabase claims and user data.
- Finance data is loaded from server-side modules in `lib/finance`.
- Mutations use Server Actions in `app/transactions/actions.ts`.
- Client components receive already-scoped data and trigger Server Actions for writes.

## Finance model

- Transactions are monthly income, expense, or saving records.
- Categories belong to one authenticated user and are grouped by Needs, Wants, or Savings.
- Categories can include emoji icons and monthly limits.
- The dashboard computes the 50/30/20 split from the selected month's income.
- Payment methods belong to one authenticated user. Pix and Payment/Cash are protected defaults.
- The payments page shows payment methods first, then subscription-style payment reminders from the current mock data set.

## UI conventions

- Use shadcn/ui primitives for dialogs, inputs, selects, cards, and destructive confirmations.
- Desktop dialogs should use 50vw by 50vh, except the new transaction dialog.
- Visible strings must use `lib/i18n.tsx`.
