# Architecture

Dragg is a Next.js App Router application backed by Supabase Auth and Supabase Postgres. The current app targets Next.js 16, React 19, Node.js 24, pnpm 10, Tailwind CSS 4, shadcn/ui primitives, Recharts, and Vitest.

## Application flow

- Public users land on `/` and sign in with Google OAuth through Supabase Auth.
- Supabase SSR clients live in `lib/supabase/server.ts`, `lib/supabase/client.ts`, and `lib/supabase/proxy.ts`.
- `proxy.ts` refreshes Supabase session cookies for app requests.
- Authenticated routes are wrapped by `AppShell`, which verifies Supabase claims and user data before rendering.
- Finance reads are centralized in `lib/finance/transactions.ts` and supporting modules under `lib/finance/`.
- Mutations use Server Actions in `app/transactions/actions.ts` and `app/goals/actions.ts`.
- Server Actions validate input with Zod and then call server-side finance functions.
- Client components receive already-scoped data and trigger Server Actions for writes.

## Routes

- `/`: Google OAuth login screen. Authenticated users are redirected to `/dashboard`.
- `/auth/callback`: Supabase OAuth code exchange with guarded same-origin redirect handling.
- `/dashboard`: summary cards, transaction form, budget split, trends, latest transactions, and quick actions.
- `/transactions`: transaction list with update/delete flows.
- `/transactions/new`: focused new transaction flow.
- `/categories`: category management with icons, groups, and monthly limits.
- `/budgets`: 50/30/20 allocation and category budget progress.
- `/payments`: payment methods, credit limits, due payments, and subscription management.
- `/goals`: goals with target/current amounts, funding, deadlines, colors, and icons.
- `/reports`: monthly reports, net worth progression, and transaction exports.
- `/settings`: read-only OAuth profile information and user preferences UI.

## Finance model

- Transactions are income, expense, or saving records.
- Expenses can be split into installments; each occurrence is stored as its own transaction.
- Monthly subscriptions are represented by future transaction rows whose `notes` start with `subscription`.
- Categories belong to one authenticated user and are grouped by Needs, Wants, Savings, or Income.
- Categories can include emoji icons and monthly limits.
- The dashboard computes the 50/30/20 split from the selected month's income and planned usage.
- Payment methods belong to one authenticated user. Pix and Cash are protected defaults.
- Credit cards support `credit_limit`, `due_day`, and `closing_day`. Invoice rows are calculated in `lib/finance/credit-card-invoices.ts` for display and planning.
- Payment method usage is calculated in `lib/finance/payment-method-overview.ts`.
- Goals are stored separately from transactions and support create, edit, fund, and delete operations.
- Reports aggregate transactions by financial month, including credit card due-month behavior.

## UI conventions

- Use shadcn/ui primitives for dialogs, inputs, selects, cards, and destructive confirmations.
- Desktop dialogs should use 50vw by 50vh, except the new transaction dialog.
- Visible strings must use `lib/i18n.tsx`.
- Currency formatting lives in `lib/i18n/currency.ts` and `lib/i18n-currency.ts`.
- Theme, language, toast, Vercel Analytics, and Speed Insights are configured in `app/layout.tsx`.

## Quality and delivery

- Linting uses ESLint 9 with Next.js core web vitals and TypeScript rules.
- Tests use Vitest with 100% coverage thresholds.
- GitHub Actions run CodeQL first, then lint, coverage, and build.
- Production Vercel deployment runs after successful checks on `main`.
