# Interest-Bearing Purchases, Loans and Savings Funding — Design

Implements the first delivery of GitHub issue #63. Branch:
`feature/63-interest-bearing-debt-feasibility` → `develop`.

## Scope

In scope:

- Purchases, financing and loans with interest: Simple, Price, SAC, and
  "Price from installment amount" (implied rate).
- Monthly or annual rate input.
- Down payment and upfront fees (financed).
- Varying installment amounts (SAC).
- CET (Custo Efetivo Total), monthly and annual.
- Outstanding balance over time.
- Funding source: available balance, saved balance ("Total guardado"), or a
  user-chosen split.
- Creation UI with live preview, and a breakdown in the transaction details
  dialog.
- Documentation of the financial models.

Out of scope (follow-up branches, recorded in the architecture doc):

- Payment status (paid/unpaid), overdue debt, late-payment interest,
  penalties, and debt rollover. The app has no payment-status concept today:
  a transaction counts as settled on its date.
- Interest discount when installments are advanced (prepaid). Advancing
  interest-bearing installments keeps their full amounts.
- American system, SAM/SACRE, post-fixed (CDI/IPCA/TR) rates, and
  intermediate or balloon payments.

## Invariants

- Existing simple transactions and fixed-value installments behave exactly
  as before. Every schema change is additive with neutral defaults.
- "Paid" means `date <= today` (existing model). Outstanding balance is the
  sum of the group's rows dated after today.
- The server recomputes every amount. Nothing monetary from the client is
  trusted beyond the validated parameters.
- `user_id` always comes from the authenticated context. Plans are
  RLS-scoped to `auth.uid()`.

## Data model — `supabase/migrations/011_add_financing_plans.sql`

New table `public.financing_plans`:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | equals the `installment_group_id` of its rows |
| `user_id` | uuid not null | default `auth.uid()`, fk `auth.users` on delete cascade |
| `operation_type` | text not null | `check in ('purchase','loan')` |
| `interest_system` | text not null | `check in ('simple','price','sac')` |
| `rate_input_mode` | text not null | `check in ('rate','installment')` |
| `rate` | numeric not null | as entered (percent), `check (rate >= 0 and rate <= 1000)`; for `installment` mode, the solved monthly rate |
| `rate_period` | text not null | `check in ('monthly','annual')` |
| `principal` | numeric not null | `check (principal > 0)` |
| `down_payment` | numeric not null default 0 | `check (down_payment >= 0 and down_payment < principal)` |
| `fees` | numeric not null default 0 | `check (fees >= 0)` |
| `installment_count` | int not null | `check (installment_count between 1 and 120)` |
| `savings_funded_amount` | numeric not null default 0 | `check (savings_funded_amount >= 0)` |
| `created_at` | timestamptz not null default now() | |

RLS is enabled with `select`, `insert` and `delete` policies
`using/with check (user_id = (select auth.uid()))`, the same pattern as the
other user-owned tables. There is no update policy, because plans are
immutable.

New columns on `public.transactions`:

- `principal_portion numeric null`
- `interest_portion numeric null`
- `savings_funded_amount numeric not null default 0`, with
  `check (savings_funded_amount >= 0 and savings_funded_amount <= amount)`

The same migration re-creates `public.calculate_total_saved(date)`:

- `invested` subtracts `sum(t.savings_funded_amount)`.
- `monthly_balances.expenses` uses `t.amount - t.savings_funded_amount`
  for non-savings expenses.

The saved balance therefore drops by the savings-funded part, and the month's
available balance is not reduced by it.

## Calculation module — `lib/finance/financing.ts`

This module contains pure functions only: no I/O, and nothing imported from
Supabase. It is usable on both server and client.

```ts
type InterestSystem = "simple" | "price" | "sac";
type RatePeriod = "monthly" | "annual";

toMonthlyRate(ratePct: number, period: RatePeriod, system: InterestSystem): number
// monthly → ratePct/100
// annual + simple → (ratePct/100)/12
// annual + price|sac → (1 + ratePct/100)^(1/12) − 1

solveImpliedMonthlyRate(financed: number, installment: number, count: number): number
// Price present-value equation solved by Newton-Raphson.
// installment*count < financed          → throws FinancingError("installment_too_low")
// installment*count === financed (±0.005) → 0
// No convergence in 100 iterations, tol 1e-10 → throws FinancingError("rate_not_converged")

buildFinancingSchedule(input: {
  principal: number; downPayment: number; fees: number;
  monthlyRate: number; system: InterestSystem; installmentCount: number;
}): {
  financed: number;            // principal − downPayment + fees
  rows: { number: number; payment: number; principal: number; interest: number; balanceAfter: number }[];
  totals: { principal: number; downPayment: number; fees: number; interest: number; payable: number };
}

computeCet(received: number, payments: number[]): { monthly: number; annual: number }
// IRR of: +received at t0, −payments[k] at t(k+1), solved by Newton-Raphson.
// received = principal − downPayment. Annual = (1+monthly)^12 − 1.

allocateSavingsFunding(amounts: number[], savingsAmount: number): number[]
// Consumes savingsAmount across amounts in order (earliest first).
// Each slice is ≤ its amount. Throws if savingsAmount > sum(amounts).
```

Formulas, with F = financed amount, i = monthly rate, n = count:

- **Simple:** each row has interest `F·i`, principal `F/n`, and payment
  `F/n + F·i`.
- **Price:** `PMT = F·i / (1 − (1+i)^−n)`. Each row has interest
  `balance·i` and principal `PMT − interest`.
- **SAC:** principal `F/n`, interest `balance·i`, and payment
  `principal + interest`, so payments decrease.
- **i = 0:** every system reduces to linear division, identical to today.

Rounding is done to cents per row. The last row's principal equals the
remaining balance, so `balanceAfter` of the last row is exactly `0.00`, and
the rounding residue is absorbed there, the same as today.

Invalid inputs throw `FinancingError` with a code: a negative rate, a down
payment ≥ principal, negative fees, or a count outside 1..120.

## Row generation — `lib/finance/transactions.ts`

`NewTransactionInput` gains optional `financing` and `savingsFundedAmount`.
When `financing` is present:

1. **Validation:**
   - `kind === 'expense'`, and the category is not in the `savings` group.
   - The date is not before the user's creation month, which avoids
     `filterRowsByUserCreatedMonth` silently dropping rows.
   - `savingsFundedAmount ≤` the current saved total (`calculate_total_saved`
     for today's month), and `≤` the total of the expense rows.
2. The monthly rate comes from `toMonthlyRate`, or from
   `solveImpliedMonthlyRate` in installment mode. The schedule comes from
   `buildFinancingSchedule`.
3. **Rows**, all sharing one new `installment_group_id`:
   - **Down payment** (if > 0): an expense on `date`, with `principal_portion`
     equal to the amount and `interest_portion` 0, and no `k/n` suffix.
   - **Installments** 1..n: expenses carrying `principal_portion` and
     `interest_portion`, with existing installment metadata and
     `description (k/n)` naming. The first installment is on `date + 1 month`
     when `operation_type = 'loan'` or `down_payment > 0`. Otherwise it is on
     `date`, preserving the current credit-card installment behaviour.
   - **Loan** only: an `income` row on `date` for `principal`, with the same
     description, category null and the same payment method. It does not
     consume savings.
4. `allocateSavingsFunding` distributes `savingsFundedAmount` over the expense
   rows in date order, and each row stores its slice.
5. **Persistence:**
   - Insert the `financing_plans` row, then the transaction rows.
   - If the rows insert fails, delete the plan (compensation) and rethrow.

Without `financing`, the existing path is unchanged, except that
`savingsFundedAmount` is spread over the linear rows by the same
`allocateSavingsFunding`, whose default of 0 leaves them unchanged. Savings
funding is therefore independent of interest. A plain expense, lump-sum or
interest-free installments, can be funded fully or partly from savings,
with no `financing_plans` row.

Example: a R$ 500 lump-sum expense with "Pagar com: Total guardado" is one
row with `amount = 500` and `savings_funded_amount = 500`. The month's
available balance is unchanged and the saved total drops by R$ 500. The same
validations apply: the expense cannot use a savings-group category, and the
amount cannot exceed the saved total.

`deleteInstallments`: when the whole group is deleted, it also deletes the
`financing_plans` row with the same id (user-scoped).

`listTransactions` maps the new columns into `Transaction` as
`savingsFundedAmount` and `financingGroupId`. `financingGroupId` is set when
`interest_portion` is not null.

**Balance effects:**

- Dashboard `currentBalance` subtracts
  `Σ(expense amount − savingsFundedAmount)` instead of `Σ expense amount`.
- `lib/finance/savings.ts` makes the same change in `sumExpenses`, and
  subtracts `Σ savingsFundedAmount` from the saved total, mirroring the RPC.
- Total expenses, categories, budgets, reports, and credit-card invoices are
  unchanged. A savings-funded purchase is still spending.

## Server actions — `app/transactions/actions.ts`

`createTransactionActionSchema` (Zod, `.strict()`) gains:

- `savingsFundedAmount: z.number().finite().min(0).max(1_000_000_000).optional()`
- `financing` (optional, strict object) with these fields:
  - `operationType`: `purchase` or `loan`
  - `interestSystem`: `simple`, `price` or `sac`
  - `rateInputMode`: `rate` or `installment`
  - `rate`: from 0 to 1000, required when `rateInputMode` is `rate`
  - `ratePeriod`: `monthly` or `annual`
  - `installmentAmount`: positive, required when `rateInputMode` is
    `installment`
  - `downPayment`: ≥ 0, default 0; must be 0 for a loan
  - `fees`: ≥ 0, default 0

`.superRefine` rejects:

- `financing` when `type !== 'expense'`;
- `downPayment >= amount`;
- `installment` mode with a system other than `price`;
- `savingsFundedAmount > amount`.

Errors surface as the existing localized action error, not raw messages.

The new action `getFinancingBreakdownAction(groupId)` validates the UUID and
calls `getFinancingBreakdown(groupId)`. That function reads the plan and the
group's rows filtered by `user_id`, and returns:

- the plan parameters;
- the equivalent monthly rate;
- the CET;
- the totals;
- each row: number, date, payment, principal, interest, savings slice,
  `isPaid` (`date <= today`), and balance after;
- the outstanding principal, outstanding interest and outstanding total,
  from rows dated after today.

The function returns `null` when no plan belongs to the user.

`getTransactionFormOptions` additionally returns `totalSaved` and
`availableBalance` for the current month, both used by the form.

## UI

**`components/dashboard/transaction-form.tsx`** (expense type only):

- **"Opções avançadas"**: a `Switch` (the slide toggle) controlling a
  `Collapsible`, closed by default. The simple form is unchanged when it is
  off.
  - **Pagar com**: `ToggleGroup` with *Saldo disponível* / *Total guardado*
    / *Dividir*. *Dividir* shows an amount input for the part taken from
    savings, and displays the remainder from balance. *Total guardado*
    shows the current saved total.
  - **Com juros / financiamento**: a `Switch` revealing:
    - operation (compra/financiamento, empréstimo);
    - input mode (sei a taxa / sei o valor da parcela);
    - system (Simples/Price/SAC with one-line hints; forced to Price in
      installment mode);
    - rate plus period, or installment amount;
    - down payment and fees.
  - With interest on, the installment count is enabled for every payment
    method.
- **Live preview**, client-side via `financing.ts`: first and last payment,
  total interest, total payable, CET, and the implied rate in installment
  mode.
- **Info alert**: shown when the balance-funded part is larger than the
  month's `availableBalance`. It explains that the excess is covered by the
  saved total when the month closes, which is the existing behaviour of
  migration 004. It is informational only.

**`components/dashboard/financing-breakdown.tsx`** (new): rendered inside
`TransactionDetailsDialog` when the transaction has `financingGroupId`. It
fetches through `getFinancingBreakdownAction` and shows:

- summary cards: principal, down payment, fees, total interest, total
  payable, outstanding balance, and funding split;
- the rate as entered, plus the equivalent monthly rate when the input was
  annual, and the CET (a.m./a.a.);
- a schedule `Table`: nº, data, parcela, amortização, juros, do guardado,
  saldo. Paid rows are marked.

Only existing `components/ui` primitives are used (`switch`, `collapsible`,
`toggle-group`, `table`, `alert`, `select`, `input`). All visible strings are
new `lib/i18n.tsx` keys in pt-BR and en.

## Testing

- `tests/finance/financing.test.ts`:
  - reference values: Price with 1000 at 2% a.m. over 12 gives a 94.56
    payment;
  - SAC payments decrease;
  - Simple interest totals;
  - annual→monthly conversion per system;
  - down payment and fees;
  - rate 0 equals linear division;
  - n = 1;
  - the last row closes at 0.00;
  - implied-rate round-trip (rate → PMT → rate);
  - `installment_too_low`;
  - CET equals the nominal rate without fees and is greater with fees;
  - `allocateSavingsFunding` ordering and overflow;
  - invalid inputs.
- Action schema tests covering every refine branch. `actions.ts` stays at
  100% coverage.
- `createTransaction` / `deleteInstallments` / `getFinancingBreakdown` with
  a mocked Supabase:
  - plan and rows written;
  - portions and savings slices;
  - loan income row;
  - first-installment date rule;
  - compensation on insert failure;
  - ownership (`null` for a foreign group);
  - validation against the saved total.
- `savings.ts` and dashboard balance with savings-funded rows.
- Regression: a non-financed installment purchase produces identical rows.
- Form tests: advanced section hidden by default, switch reveals it, preview
  updates, and the payload shape. A breakdown component render test.

## Documentation

- Rewrite `docs/decisions/interest-bearing-debt-architecture.md` to this
  design (drop `debt_schedules`). It covers formulas, rate conversion, CET,
  savings allocation order, the first-installment date rule, limitations,
  and next steps (payment status/overdue/rollover, prepayment discount).
- Link it from the "Finance model" section of `docs/architecture.md`.
- Document the new table and columns in `docs/database.md`.

## Verification

`pnpm run lint`, `pnpm run test` (coverage gates), and `pnpm run build`.
Apply migration 011 against local Supabase when the local stack is
available. Nothing is committed or pushed.
