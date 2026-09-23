# Interest-Bearing Purchases, Loans, Financing, and Overdue Debt — Architecture

Addresses GitHub issue #63.

## Summary

Feasible, but this is the largest and most architecturally invasive change
in the current backlog — it touches transaction creation, credit card
invoicing, goal-funded purchases, and reporting at once. `lib/finance/`
(9 files, ~5,092 lines: `budget.ts`, `category-aggregation.ts`,
`credit-card-invoices.ts`, `group-colors.ts`, `installments.ts`,
`payment-method-overview.ts`, `savings.ts`, `subscriptions.ts`,
`transactions.ts`) has **zero** interest, loan, or amortization logic today
— installments are pure linear division of a fixed amount
(`amount / installmentCount`, remainder absorbed by the last row), with no
concept of interest, principal, or a funding source other than "current
balance." This is a from-scratch feature, best delivered as four phased
follow-up issues (below) rather than one PR. Recommend proceeding, scoped to
the phased plan.

## Current baseline (read before building on this)

- `lib/finance/transactions.ts`: `computeInstallmentPlan` and
  `buildInstallmentTransactionRows` create N linear installment rows tied by
  `installment_group_id` (from `supabase/migrations/005_add_installment_group_metadata.sql`),
  with `installment_number`/`installment_total` columns and no upper bound
  in the DB (only app-level `min(1).max(120)` in
  `app/transactions/actions.ts`).
- `lib/finance/credit-card-invoices.ts`: computes invoice groupings from
  `closingDay`/`dueDay` on the payment method, with its own "advance
  payment" concept (`invoice_advance:` note prefix) for moving an obligation
  to an earlier month without changing the original purchase date. Per
  project history, this file already has known financial-month vs.
  calendar-date subtleties (see the credit-card financial-month bug fixed
  previously) — any new overdue-rollover logic must be reconciled with this
  existing behavior, not built in ignorance of it.
- `lib/finance/savings.ts`: aggregates *reporting* totals for the
  Savings transaction group (`calculateTotalSaved`) — it is not where a
  user's goal balance is debited. The actual goal balance lives behind
  `app/goals/actions.ts` (`createGoalAction`, `updateGoalAction`,
  `addGoalFundsAction`, `deleteGoalAction`), which is the real integration
  point for "fund this purchase from a saved/reserved balance" — not
  `savings.ts`. (This corrects an initial assumption from the issue
  investigation; `addGoalFundsAction` is the existing function whose
  balance-adjustment path a new "debit from goal" action would mirror.)
- Existing acceptance requirement to preserve: "Existing simple transactions
  and fixed-value installments continue to work without regression" — every
  addition below is additive (new nullable columns, a new optional table),
  never a rewrite of the existing linear-installment path.

## Data model additions

All additions are nullable/optional so existing rows and flows are
untouched:

- `transactions.principal_amount numeric null` — the original amount before
  interest, when different from `transactions.amount`.
- `transactions.interest_rate numeric null` and
  `transactions.interest_type text null` (`'simple' | 'compound'`) — null
  for every existing/simple transaction.
- `transactions.funding_source text null` (`'balance' | 'goal'`) and
  `transactions.funding_goal_id uuid null references goals(id)` — when set
  to `'goal'`, the transaction's amount is debited from the referenced
  goal's balance (via the same ownership-checked path `addGoalFundsAction`
  uses today, negated) instead of being treated as a draw against the
  general available balance used elsewhere in reporting.
- A new `debt_schedules` table: one row per amortization period —
  `id`, `transaction_group_id` (ties back to the originating
  `installment_group_id`), `due_date`, `principal_portion`,
  `interest_portion`, `penalty_amount`, `paid boolean`, `user_id` (RLS
  scoped like every other user-owned table per `docs/security.md`). This
  table is used *only* for debts that opt into interest — a plain
  fixed-value installment purchase keeps using today's
  `installment_number`/`installment_total` mechanism unchanged, so the two
  systems coexist rather than one replacing the other.

Because `debt_schedules` stores `principal_portion`/`interest_portion` per
row rather than a single shared installment amount, installments naturally
carry different values across periods when the financial model calls for it
(e.g. front-loaded interest in an amortization schedule) — this replaces the
current linear-split assumption only for rows that opt into interest, per
the "Existing simple transactions... continue to work" constraint above. A
transaction's **total outstanding balance** at any point in time is defined
as the sum of `principal_portion + interest_portion + penalty_amount` across
all `debt_schedules` rows for its `transaction_group_id` where `paid` is
false — giving principal, interest, fees, funding source, and outstanding
balance each their own explicit, queryable field rather than one blended
number.

## Calculation module

Propose `lib/finance/debt-schedule.ts` with pure, deterministic,
independently unit-testable functions — no DB access, so the "automated
tests cover the financial calculations" acceptance criterion is satisfied
by ordinary unit tests with no fixtures or mocked Supabase clients:

- `computeSimpleInterestSchedule(principal: number, annualRatePct: number, periods: number): DebtScheduleRow[]`
- `computeCompoundInterestSchedule(principal: number, annualRatePct: number, periods: number, compoundingsPerYear: number): DebtScheduleRow[]`
- `applyOverdueRollover(schedule: DebtScheduleRow[], asOfDate: string, penaltyRatePct: number): DebtScheduleRow[]` —
  returns a new schedule with any past-due unpaid row's balance carried into
  a newly appended row for the next period, with penalty/interest
  recalculated on the carried balance.

Each function takes primitives and plain objects in, returns plain objects
out — deterministic and auditable, directly satisfying the issue's explicit
"Calculations must be deterministic and auditable" requirement, and testable
with a handful of `expect(computeSimpleInterestSchedule(1000, 12, 3)).toEqual([...])`
cases covering zero-interest, single-period, and multi-period inputs.

## Funding source (saved/reserved balance)

A transaction created with `funding_source: 'goal'` needs a new action
mirroring `addGoalFundsAction`'s ownership/validation pattern but in
reverse — e.g. `debitGoalFundsAction(goalId, amount)` in
`app/goals/actions.ts` — called from the transaction-creation path when
`funding_source === 'goal'`, instead of the transaction being counted
against the general available-balance calculation used elsewhere in
`lib/finance/transactions.ts`. The chosen funding source must be carried
onto every row generated for a multi-installment purchase (all rows sharing
the same `installment_group_id` inherit the same `funding_source`), so
partial installments cannot silently split across balance and goal funding.

## Overdue rollover and credit-card invoice interaction

An unpaid `debt_schedules` row past its `due_date` triggers
`applyOverdueRollover`, which appends a new row for the next period with
interest/penalty recalculated on the carried balance. Where the debt is tied
to a credit card payment method, this must be reconciled with
`lib/finance/credit-card-invoices.ts`'s existing invoice-month computation
(`closingDay`/`dueDay`) rather than introducing a second, conflicting
definition of "when is this due" — the rollover trigger should read the
same `closingDay`/`dueDay` fields already used there, not duplicate that
date math.

## UI impact

A breakdown view (principal / interest / fees / remaining schedule) belongs
in the existing transaction detail view (wherever a single transaction's
detail is already rendered today) as a new, conditionally-shown section —
only for transactions with a non-null `interest_type` — rather than a new
page. The transaction *creation* form gains an optional "advanced" section
(interest rate, type, funding source) that stays hidden unless the user
opts in, so simple transactions keep the same short form (existing
acceptance criterion: don't make simple transactions unnecessarily
complex).

## Phased delivery plan

Recommend four follow-up issues, in this order, none of which alone
attempts the full scope of #63:

1. **Schema + pure calculation module.** The `debt_schedules` table and
   `transactions` column additions (migration), plus
   `lib/finance/debt-schedule.ts` with full unit test coverage of simple
   and compound interest math. No UI yet — this phase is entirely testable
   in isolation.
2. **UI for creating an interest-bearing transaction.** The advanced-section
   form fields, wired to the schema from phase 1, plus the transaction
   detail breakdown view.
3. **Overdue rollover.** `applyOverdueRollover` wired into a scheduled or
   on-read recalculation path, reconciled with
   `lib/finance/credit-card-invoices.ts` as described above.
4. **Goal-funded purchases.** `debitGoalFundsAction` and the
   `funding_source`/`funding_goal_id` wiring through transaction creation
   and installment generation.

## Documentation

This document is the "feasibility and architecture... documented" and
"documentation explains the supported financial models" deliverables the
issue asks for. Once approved, link it from `docs/architecture.md`'s
"Finance model" section so it's discoverable alongside the rest of the
domain model documentation.
