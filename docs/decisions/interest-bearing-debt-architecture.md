# Interest-Bearing Purchases, Loans, Financing, and Savings Funding — Architecture

Addresses GitHub issue #63.

## Status

Implemented (first delivery of #63). Design: `docs/superpowers/specs/2026-09-23-interest-bearing-debt-design.md`.

## Supported financial models

All math lives in `lib/finance/financing.ts` as pure functions shared by the server (`createTransaction`) and the form preview.

- **Simple interest**: each installment pays `F / n` principal plus a constant interest of `F · i`.
- **Price (fixed installments)**: `PMT = F · i / (1 − (1 + i)^−n)`. Interest is charged on the outstanding balance, and principal is `PMT − interest`.
- **SAC (decreasing installments)**: constant principal of `F / n`, with interest on the outstanding balance.
- **Implied rate**: the user types the installment amount instead of the rate. The monthly rate is solved with Newton-Raphson on the annuity equation. This mode is Price-only, and it rejects installments that do not repay the financed amount.
- **Zero rate**: every system falls back to linear division, which is identical to the plain installments.

`F` is the financed amount, `i` the monthly rate, and `n` the number of installments.

## Rate conversion

The user enters a rate per month or per year, and it is converted to a monthly rate:

- monthly: `r`
- annual, simple system: `r / 12`
- annual, Price/SAC: `(1 + r)^(1/12) − 1`

## Down payment, fees, and loans

- Financed amount = principal − down payment + upfront fees.
- The down payment is its own expense row on the purchase date.
- A **loan** has no down payment. It creates an **income** row for the principal on the operation date, and its installments are expenses.

## CET (total effective cost)

The CET is the IRR of `+(principal − down payment)` at t0 against the installment payments. It is reported per month and annualized as `(1 + m)^12 − 1`. When the payments do not exceed the amount received, it is reported as 0.

## Rounding

Values are rounded to the cent on each row. The last installment absorbs the rounding residue, so the balance closes at exactly 0.00.

## First installment date

The first installment falls on the purchase date, the same as today's plain installments. For a loan, or a purchase with a down payment, installments start one month later.

## Savings funding

Any expense, financed or not, can be paid fully or partly from the **saved total**:

- The split is stored per row in `transactions.savings_funded_amount`, consumed from the earliest rows first.
- That part reduces the saved total, not the month's available balance. `calculate_total_saved`, `lib/finance/savings.ts`, and the dashboard's `currentBalance` all subtract it.
- The server rejects savings funding above what is still available (the current saved total minus funded slices already allocated to later months), on non-expense transactions, and on savings-group categories.
- Editing a row keeps it consistent: the funded part is clamped to the new amount and dropped when the row stops being an expense. A financed row cannot change its amount or kind (see `private.normalize_transaction_update`).
- When the balance-funded part leaves the month negative, the existing automatic deficit coverage (migration 004) still applies.

## Data model (migration 011)

- `financing_plans` stores one row per financed operation: the parameters the user entered (system, rate, period, principal, down payment, fees, count, savings amount). It is **immutable**, with RLS allowing select, insert, and delete by the owner only.
- `transactions` gains four columns:
  - `financing_plan_id` → `financing_plans(id) on delete cascade`. Every row of the operation carries it: the down payment, the installments, and the loan income.
  - `principal_portion` and `interest_portion`, set per installment.
  - `savings_funded_amount`, which defaults to 0 and is always ≤ `amount`.
- `installment_group_id` alone could not link the operation. Check `transactions_installment_fields_consistent` (migration 005) requires an installment number whenever the group id is set, and the down-payment and income rows have none. Installment rows still use the plan id as their `installment_group_id`, so the existing installment features (advance and scoped delete) keep working.
- Deleting a financed group with scope "all" deletes the plan, and the cascade removes every row of the operation.
- The owner-refs trigger also validates `financing_plan_id`, so a row cannot point to another user's plan.

## UI

- The transaction form has an "Opções avançadas" section for expenses:
  - the funding source (balance, saved total, or split);
  - interest settings, with a live preview (first and last installment, total interest, total payable, CET, implied rate);
  - an alert when the month's available balance is lower than the balance-funded part.
- The transaction details dialog shows the financing breakdown: totals, rates, outstanding balance, and the per-installment schedule.
- The `/debts` page lists every financing plan (`listDebtOverview` → `lib/finance/debts.ts`). It shows the total still owed, split into principal and interest, the amount due in the selected month, and the interest already paid. Each debt shows its progress, next installment, and CET, plus the same schedule dialog. "Paid" means the due date has passed, because there is no payment status yet.

## Limitations and next steps

- There is no payment status or overdue debt yet, and therefore no late interest, penalties, or rollover.
- Prepayment gives no interest discount. Advancing installments keeps the full amounts.
- The American and SAM systems, post-fixed/indexed rates, and intermediate or balloon payments are not supported.
- Plans are immutable. To change terms, delete the operation and recreate it.
