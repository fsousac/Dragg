# Interest-Bearing Purchases, Loans and Savings Funding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users record expenses with interest (Simple / Price / SAC / implied-rate), loans, down payment and fees, fund any expense from the saved total, and inspect the financing breakdown (schedule, CET, outstanding balance).

**Architecture:** A pure calculation module (`lib/finance/financing.ts`) is shared by the server and the form preview. `createTransaction` gains a financed path that writes one immutable `financing_plans` row plus the transaction rows (with principal/interest portions and per-row savings slices). Balance math (`calculate_total_saved` RPC, `savings.ts`, and the dashboard `currentBalance`) subtracts the savings-funded part. The UI adds an "Opções avançadas" section to the form and a breakdown in the details dialog.

**Tech Stack:** Next.js App Router, Supabase Postgres + RLS, Zod, Vitest + Testing Library, shadcn/ui (Radix), `lib/i18n.tsx`.

**Spec:** `docs/superpowers/specs/2026-09-23-interest-bearing-debt-design.md`

## Global Constraints

- **NEVER commit or push.** Every "checkpoint" step is only `git status` / `git diff --stat`. The user commits and pushes. Branch: `feature/63-interest-bearing-debt-feasibility` → `develop`.
- Do not touch the user's own uncommitted changes: `package.json` and `scripts/e2e-local-supabase.sh`.
- Vitest coverage thresholds are **100%** (branches/functions/lines/statements) for everything that is not excluded. `lib/finance/**` and `app/**/actions.ts` are included. `components/dashboard/**`, `components/ui/**`, and `lib/i18n.tsx` are excluded, but they still need the tests listed below.
- Visible strings must use `lib/i18n.tsx` keys and be added in **both** the `en` dictionary (around line 591) and the `pt-BR` dictionary (around line 1255).
- Only use existing `components/ui` primitives (`switch`, `collapsible`, `toggle-group`, `table`, `alert`, `input`, `label`). Add no dependencies.
- Mutations validate input at runtime (Zod `.strict()`), and every query is scoped by `user_id`.
- Semgrep Guardian may silently revert Edit/Write. After each file edit batch, check `git diff --stat` and re-apply the edit with Bash/python3 if needed.
- Existing simple transactions and linear installments must produce **byte-identical insert payloads** when no savings funding or financing is sent. No new keys are allowed on those rows.
- **Database: test locally first, production only with the user's OK.** There is no dev branch; `main` (`xmchbjntitcwwjetxwug`) is production. Migration 011 and all SQL checks run first against the local Supabase container (`supabase_db_Dragg`, started with `supabase start`, which ships the `auth` schema the migrations need). Applying to production happens only in Task 11, after an explicit "pode aplicar" from the user. Never run `supabase db reset` against anything other than the local stack, and never run `supabase db push` without that OK.

## Deviations from the spec (decided while planning, from code facts)

1. **`financing_plan_id` column instead of reusing `installment_group_id` for every row.** Migration 005 has the check `transactions_installment_fields_consistent`, which rejects a row with a non-null `installment_group_id` and a null `installment_number`. The down-payment row and the loan income row cannot carry the group id. Every financed row instead carries `financing_plan_id uuid references financing_plans(id) on delete cascade`. Installment rows also keep `installment_group_id = plan id`. `Transaction.financingGroupId` maps from `financing_plan_id`.
2. **Deleting a whole financed group deletes the plan, and the FK cascade removes all of its rows,** including the down payment and the loan income. With `scope: "all"`, the entire operation disappears, not only the installments.
3. **The funding context is loaded lazily instead of through `getTransactionFormOptions`.** `getTransactionFormOptions` runs on every dashboard/transactions/payments render. Adding an RPC call plus a month listing there would tax every page. A new `getFundingContextAction()` is called only when the user opens "Opções avançadas". Components import it directly from `@/app/transactions/actions`; importing that module under jsdom was verified to work.
4. **Test paths.** `tests/finance/…` in the spec becomes `tests/lib/finance/…`, following repo convention.
5. **The owner-refs trigger also validates `financing_plan_id`,** so a user cannot attach rows to another user's plan.

## Review Focus

1. **Implied rate with an absurd installment** (e.g. R$ 900 × 12 for R$ 1000): the solver converges to about 89.96% a.m. The server then stores `rate` = 89.96. Anything above 1000 would violate the DB check, and the error must surface as the normal "could not save" toast without leaving an orphan plan. Task 4 covers plan-insert failure.
2. **A savings-funded expense whose rows are partly dropped by `filterRowsByUserCreatedMonth`** (non-financed installments starting before signup): allocation must run *after* filtering. It throws if the savings no longer fit. Tested in Task 4.
3. **Changing the amount after choosing "Total guardado"**: the savings share must follow the new amount at submit time, not a stale value. Tested in Task 7 (`buildTransactionSubmitData`).
4. **Toggling "Com juros" on a debit method** enables the installment count. Toggling it off again must not submit `financing`. Tested in Task 7.
5. **Breakdown for a partially deleted group** (`this_and_following`): the remaining rows must still render with a consistent running balance and must not crash. `buildFinancingBreakdown` only uses the rows it receives. Tested in Task 5.

---

### Task 1: Pure financing calculation module

**Files:**
- Create: `lib/finance/financing.ts`
- Test: `tests/lib/finance/financing.test.ts`

**Interfaces:**
- Produces (all exported from `@/lib/finance/financing`):
  - types `InterestSystem = "simple"|"price"|"sac"`, `RatePeriod = "monthly"|"annual"`, `OperationType = "purchase"|"loan"`, `RateInputMode = "rate"|"installment"`
  - `TransactionFinancingInput = { operationType; interestSystem; rateInputMode; rate?: number; ratePeriod; installmentAmount?: number; downPayment: number; fees: number }`
  - `class FinancingError extends Error { code: FinancingErrorCode }`
  - `toMonthlyRate(ratePct: number, period: RatePeriod, system: InterestSystem): number`
  - `solveImpliedMonthlyRate(financed: number, installment: number, count: number): number`
  - `buildFinancingSchedule(input): FinancingSchedule` with `FinancingSchedule = { financed; rows: FinancingScheduleRow[]; totals: { principal; downPayment; fees; interest; payable } }` and `FinancingScheduleRow = { number; payment; principal; interest; balanceAfter }`
  - `computeCet(received: number, payments: number[]): { monthly: number; annual: number }`
  - `allocateSavingsFunding(amounts: number[], savingsAmount: number): number[]`
  - `resolveFinancingSchedule({ principal, installmentCount, financing }): { monthlyRate; system: InterestSystem; schedule: FinancingSchedule; cet }`

- [ ] **Step 1: Write the failing test** at `tests/lib/finance/financing.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  allocateSavingsFunding,
  buildFinancingSchedule,
  computeCet,
  FinancingError,
  resolveFinancingSchedule,
  solveImpliedMonthlyRate,
  toMonthlyRate,
  type TransactionFinancingInput,
} from "@/lib/finance/financing";

const base = { principal: 1000, downPayment: 0, fees: 0 };

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(FinancingError);
    expect((error as FinancingError).code).toBe(code);
    return;
  }
  throw new Error(`expected FinancingError ${code}`);
}

describe("toMonthlyRate", () => {
  it("converts monthly, simple-annual and compound-annual rates", () => {
    expect(toMonthlyRate(2, "monthly", "sac")).toBe(0.02);
    expect(toMonthlyRate(12, "annual", "simple")).toBeCloseTo(0.01, 10);
    expect(toMonthlyRate(12.682503013196978, "annual", "price")).toBeCloseTo(0.01, 10);
  });

  it.each([-1, 1001, Number.NaN])("rejects rate %s", (rate) => {
    expectCode(() => toMonthlyRate(rate, "monthly", "price"), "invalid_rate");
  });
});

describe("buildFinancingSchedule", () => {
  it("matches the Price reference case (1000 at 2% a.m. over 12)", () => {
    const schedule = buildFinancingSchedule({ ...base, monthlyRate: 0.02, system: "price", installmentCount: 12 });
    expect(schedule.financed).toBe(1000);
    expect(schedule.rows[0]).toEqual({ number: 1, payment: 94.56, principal: 74.56, interest: 20, balanceAfter: 925.44 });
    expect(schedule.rows[11]).toEqual({ number: 12, payment: 94.54, principal: 92.69, interest: 1.85, balanceAfter: 0 });
    expect(schedule.totals).toEqual({ principal: 1000, downPayment: 0, fees: 0, interest: 134.7, payable: 1134.7 });
  });

  it("produces decreasing SAC payments", () => {
    const schedule = buildFinancingSchedule({ principal: 1200, downPayment: 0, fees: 0, monthlyRate: 0.01, system: "sac", installmentCount: 12 });
    expect(schedule.rows[0].payment).toBe(112);
    expect(schedule.rows[11].payment).toBe(101);
    expect(schedule.rows[11].balanceAfter).toBe(0);
    expect(schedule.totals.interest).toBe(78);
  });

  it("charges constant simple interest on the financed amount", () => {
    const schedule = buildFinancingSchedule({ ...base, monthlyRate: 0.02, system: "simple", installmentCount: 10 });
    expect(schedule.rows.every((row) => row.payment === 120 && row.interest === 20)).toBe(true);
    expect(schedule.totals.payable).toBe(1200);
  });

  it.each(["simple", "price", "sac"] as const)("falls back to linear division at rate 0 (%s)", (system) => {
    const schedule = buildFinancingSchedule({ principal: 100, downPayment: 0, fees: 0, monthlyRate: 0, system, installmentCount: 3 });
    expect(schedule.rows.map((row) => row.payment)).toEqual([33.33, 33.33, 33.34]);
  });

  it("finances principal minus down payment plus fees", () => {
    const schedule = buildFinancingSchedule({ principal: 1000, downPayment: 200, fees: 50, monthlyRate: 0.02, system: "price", installmentCount: 12 });
    expect(schedule.financed).toBe(850);
    expect(schedule.rows[0].payment).toBe(80.38);
    expect(schedule.totals).toEqual({ principal: 1000, downPayment: 200, fees: 50, interest: 114.51, payable: 1164.51 });
  });

  it("supports a single installment", () => {
    const schedule = buildFinancingSchedule({ ...base, monthlyRate: 0.02, system: "price", installmentCount: 1 });
    expect(schedule.rows).toEqual([{ number: 1, payment: 1020, principal: 1000, interest: 20, balanceAfter: 0 }]);
  });

  it.each([
    [{ principal: 0 }, "invalid_principal"],
    [{ downPayment: 1000 }, "invalid_down_payment"],
    [{ downPayment: -1 }, "invalid_down_payment"],
    [{ fees: -1 }, "invalid_fees"],
    [{ monthlyRate: -0.01 }, "invalid_rate"],
    [{ installmentCount: 0 }, "invalid_count"],
    [{ installmentCount: 121 }, "invalid_count"],
    [{ installmentCount: 2.5 }, "invalid_count"],
  ])("rejects %o with %s", (override, code) => {
    expectCode(
      () => buildFinancingSchedule({ ...base, monthlyRate: 0.02, system: "price", installmentCount: 12, ...override }),
      code,
    );
  });
});

describe("solveImpliedMonthlyRate", () => {
  it("round-trips rate → PMT → rate", () => {
    expect(solveImpliedMonthlyRate(1000, 94.56, 12)).toBeCloseTo(0.02, 5);
  });

  it("returns 0 when installments sum to the financed amount", () => {
    expect(solveImpliedMonthlyRate(1000, 100, 10)).toBe(0);
  });

  it("solves very high implied rates", () => {
    expect(solveImpliedMonthlyRate(1000, 900, 12)).toBeCloseTo(0.8996, 3);
  });

  it("rejects installments that do not repay the financed amount", () => {
    expectCode(() => solveImpliedMonthlyRate(1000, 80, 12), "installment_too_low");
  });

  it("reports non-convergence", () => {
    expectCode(() => solveImpliedMonthlyRate(1, 1e12, 120), "rate_not_converged");
  });
});

describe("computeCet", () => {
  it("equals the nominal rate without fees", () => {
    const { rows } = buildFinancingSchedule({ ...base, monthlyRate: 0.02, system: "price", installmentCount: 12 });
    const cet = computeCet(1000, rows.map((row) => row.payment));
    expect(cet.monthly).toBeCloseTo(0.02, 3);
    expect(cet.annual).toBeCloseTo(0.2682, 3);
  });

  it("is greater than the nominal rate with fees", () => {
    const { rows } = buildFinancingSchedule({ principal: 1000, downPayment: 200, fees: 50, monthlyRate: 0.02, system: "price", installmentCount: 12 });
    expect(computeCet(800, rows.map((row) => row.payment)).monthly).toBeCloseTo(0.03, 3);
  });

  it("is 0 when payments do not exceed the amount received", () => {
    expect(computeCet(100, [50, 50])).toEqual({ monthly: 0, annual: 0 });
  });
});

describe("allocateSavingsFunding", () => {
  it("consumes savings earliest first", () => {
    expect(allocateSavingsFunding([100, 94.56, 94.56], 150)).toEqual([100, 50, 0]);
  });

  it("returns zeros for no savings", () => {
    expect(allocateSavingsFunding([10, 20], 0)).toEqual([0, 0]);
  });

  it.each([400, -1, Number.NaN])("rejects %s", (savings) => {
    expectCode(() => allocateSavingsFunding([100, 200], savings), "savings_exceeds_total");
  });
});

describe("resolveFinancingSchedule", () => {
  const financing: TransactionFinancingInput = {
    operationType: "purchase",
    interestSystem: "price",
    rateInputMode: "rate",
    rate: 2,
    ratePeriod: "monthly",
    downPayment: 0,
    fees: 0,
  };

  it("uses the entered rate", () => {
    const result = resolveFinancingSchedule({ principal: 1000, installmentCount: 12, financing });
    expect(result.monthlyRate).toBe(0.02);
    expect(result.system).toBe("price");
    expect(result.schedule.rows[0].payment).toBe(94.56);
    expect(result.cet.monthly).toBeCloseTo(0.02, 3);
  });

  it("ignores the down payment for loans", () => {
    const result = resolveFinancingSchedule({
      principal: 1000,
      installmentCount: 12,
      financing: { ...financing, operationType: "loan", downPayment: 300 },
    });
    expect(result.schedule.financed).toBe(1000);
    expect(result.schedule.totals.downPayment).toBe(0);
  });

  it("solves the rate and forces Price in installment mode", () => {
    const result = resolveFinancingSchedule({
      principal: 1000,
      installmentCount: 12,
      financing: { ...financing, interestSystem: "sac", rateInputMode: "installment", rate: undefined, installmentAmount: 94.56 },
    });
    expect(result.system).toBe("price");
    expect(result.monthlyRate).toBeCloseTo(0.02, 5);
    expect(result.schedule.rows[0].payment).toBe(94.56);
  });

  it("requires an installment amount in installment mode", () => {
    expectCode(
      () => resolveFinancingSchedule({ principal: 1000, installmentCount: 12, financing: { ...financing, rateInputMode: "installment" } }),
      "invalid_installment",
    );
  });

  it("requires a rate in rate mode", () => {
    expectCode(
      () => resolveFinancingSchedule({ principal: 1000, installmentCount: 12, financing: { ...financing, rate: undefined } }),
      "invalid_rate",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify that it fails**

Run: `pnpm exec vitest run tests/lib/finance/financing.test.ts`
Expected: FAIL, with `Failed to resolve import "@/lib/finance/financing"`.

- [ ] **Step 3: Write the implementation** at `lib/finance/financing.ts`:

```ts
export type InterestSystem = "simple" | "price" | "sac";
export type RatePeriod = "monthly" | "annual";
export type OperationType = "purchase" | "loan";
export type RateInputMode = "rate" | "installment";

export type TransactionFinancingInput = {
  operationType: OperationType;
  interestSystem: InterestSystem;
  rateInputMode: RateInputMode;
  rate?: number;
  ratePeriod: RatePeriod;
  installmentAmount?: number;
  downPayment: number;
  fees: number;
};

export type FinancingErrorCode =
  | "installment_too_low"
  | "invalid_count"
  | "invalid_down_payment"
  | "invalid_fees"
  | "invalid_installment"
  | "invalid_principal"
  | "invalid_rate"
  | "rate_not_converged"
  | "savings_exceeds_total";

export class FinancingError extends Error {
  readonly code: FinancingErrorCode;

  constructor(code: FinancingErrorCode) {
    super(`Financing input is invalid: ${code}`);
    this.name = "FinancingError";
    this.code = code;
  }
}

export type FinancingScheduleRow = {
  number: number;
  payment: number;
  principal: number;
  interest: number;
  balanceAfter: number;
};

export type FinancingSchedule = {
  financed: number;
  rows: FinancingScheduleRow[];
  totals: {
    principal: number;
    downPayment: number;
    fees: number;
    interest: number;
    payable: number;
  };
};

const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-10;
const CENT_TOLERANCE = 0.005;

export function toCents(value: number) {
  return Math.round(value * 100) / 100;
}

function isNonNegativeFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function toMonthlyRate(
  ratePct: number,
  period: RatePeriod,
  system: InterestSystem,
) {
  if (!isNonNegativeFinite(ratePct) || ratePct > 1000) {
    throw new FinancingError("invalid_rate");
  }

  const rate = ratePct / 100;

  if (period === "monthly") return rate;
  if (system === "simple") return rate / 12;
  return (1 + rate) ** (1 / 12) - 1;
}

// Solves Σ cashflows[k] / (1+r)^(k+1) = presentValue. The sum is decreasing
// and convex in r, so Newton from r≈0 (left of the root) climbs to it
// monotonically.
function solveDiscountRate(presentValue: number, cashflows: number[]) {
  let rate = 1e-6;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let value = -presentValue;
    let derivative = 0;

    cashflows.forEach((cashflow, index) => {
      const period = index + 1;
      value += cashflow / (1 + rate) ** period;
      derivative -= (period * cashflow) / (1 + rate) ** (period + 1);
    });

    const step = value / derivative;
    rate -= step;

    if (Math.abs(step) < TOLERANCE) return rate;
  }

  throw new FinancingError("rate_not_converged");
}

export function solveImpliedMonthlyRate(
  financed: number,
  installment: number,
  count: number,
) {
  const total = installment * count;

  if (total < financed - CENT_TOLERANCE) {
    throw new FinancingError("installment_too_low");
  }

  if (total <= financed + CENT_TOLERANCE) return 0;

  return solveDiscountRate(financed, new Array<number>(count).fill(installment));
}

type ScheduleInput = {
  principal: number;
  downPayment: number;
  fees: number;
  monthlyRate: number;
  system: InterestSystem;
  installmentCount: number;
};

function assertScheduleInput(input: ScheduleInput) {
  if (!(Number.isFinite(input.principal) && input.principal > 0)) {
    throw new FinancingError("invalid_principal");
  }
  if (
    !isNonNegativeFinite(input.downPayment) ||
    input.downPayment >= input.principal
  ) {
    throw new FinancingError("invalid_down_payment");
  }
  if (!isNonNegativeFinite(input.fees)) {
    throw new FinancingError("invalid_fees");
  }
  if (!isNonNegativeFinite(input.monthlyRate)) {
    throw new FinancingError("invalid_rate");
  }
  if (
    !Number.isInteger(input.installmentCount) ||
    input.installmentCount < 1 ||
    input.installmentCount > 120
  ) {
    throw new FinancingError("invalid_count");
  }
}

function pricePayment(financed: number, rate: number, count: number) {
  if (rate === 0) return financed / count;
  return (financed * rate) / (1 - (1 + rate) ** -count);
}

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return toCents(items.reduce((sum, item) => sum + pick(item), 0));
}

export function buildFinancingSchedule(input: ScheduleInput): FinancingSchedule {
  assertScheduleInput(input);

  const financed = toCents(input.principal - input.downPayment + input.fees);
  const count = input.installmentCount;
  const rate = input.monthlyRate;
  const linearPrincipal = toCents(financed / count);
  const simpleInterest = toCents(financed * rate);
  const pricePmt = toCents(pricePayment(financed, rate, count));
  const rows: FinancingScheduleRow[] = [];
  let balance = financed;

  for (let number = 1; number <= count; number += 1) {
    const interest =
      input.system === "simple" ? simpleInterest : toCents(balance * rate);
    const regularPrincipal =
      input.system === "price" ? toCents(pricePmt - interest) : linearPrincipal;
    // The last row absorbs the rounding residue, so the balance closes at 0.00.
    const principal = number === count ? balance : regularPrincipal;
    balance = toCents(balance - principal);
    rows.push({
      number,
      payment: toCents(principal + interest),
      principal,
      interest,
      balanceAfter: balance,
    });
  }

  return {
    financed,
    rows,
    totals: {
      principal: input.principal,
      downPayment: input.downPayment,
      fees: input.fees,
      interest: sumBy(rows, (row) => row.interest),
      payable: toCents(sumBy(rows, (row) => row.payment) + input.downPayment),
    },
  };
}

export function computeCet(received: number, payments: number[]) {
  const total = payments.reduce((sum, payment) => sum + payment, 0);

  // ponytail: no negative CET; paying back ≤ what was received reports 0.
  if (total <= received + CENT_TOLERANCE) return { monthly: 0, annual: 0 };

  const monthly = solveDiscountRate(received, payments);
  return { monthly, annual: (1 + monthly) ** 12 - 1 };
}

export function allocateSavingsFunding(
  amounts: number[],
  savingsAmount: number,
) {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);

  if (
    !isNonNegativeFinite(savingsAmount) ||
    savingsAmount > total + CENT_TOLERANCE
  ) {
    throw new FinancingError("savings_exceeds_total");
  }

  let remaining = toCents(savingsAmount);

  return amounts.map((amount) => {
    const slice = Math.min(amount, remaining);
    remaining = toCents(remaining - slice);
    return slice;
  });
}

export function resolveFinancingSchedule({
  principal,
  installmentCount,
  financing,
}: {
  principal: number;
  installmentCount: number;
  financing: TransactionFinancingInput;
}) {
  const downPayment =
    financing.operationType === "loan" ? 0 : financing.downPayment;
  const isInstallmentMode = financing.rateInputMode === "installment";
  const system: InterestSystem = isInstallmentMode
    ? "price"
    : financing.interestSystem;

  if (isInstallmentMode && !(Number(financing.installmentAmount) > 0)) {
    throw new FinancingError("invalid_installment");
  }

  const monthlyRate = isInstallmentMode
    ? solveImpliedMonthlyRate(
        principal - downPayment + financing.fees,
        Number(financing.installmentAmount),
        installmentCount,
      )
    : toMonthlyRate(Number(financing.rate), financing.ratePeriod, system);
  const schedule = buildFinancingSchedule({
    principal,
    downPayment,
    fees: financing.fees,
    monthlyRate,
    system,
    installmentCount,
  });
  const cet = computeCet(
    principal - downPayment,
    schedule.rows.map((row) => row.payment),
  );

  return { monthlyRate, system, schedule, cet };
}
```

- [ ] **Step 4: Run the test to verify that it passes**

Run: `pnpm exec vitest run tests/lib/finance/financing.test.ts --coverage --coverage.include=lib/finance/financing.ts`
Expected: PASS, with 100% on all four metrics for `financing.ts`. If the `rate_not_converged` case converges instead, pick inputs that do not converge (for example `solveImpliedMonthlyRate(0.01, 1e15, 120)`) and keep the test. Coverage of the throw is required.

- [ ] **Step 5: Checkpoint (no commit)**

Run: `git status --short`. Expected: the two new files are listed as untracked, and nothing else changed.

---

### Task 2: Migration 011 and the savings mirror

**Files:**
- Create: `supabase/migrations/011_add_financing_plans.sql`
- Modify: `lib/finance/savings.ts` (the `TransactionLike` type, `calculateTotalSaved`, and `sumExpenses`)
- Test: `tests/lib/finance/savings.test.ts` (append)

**Interfaces:**
- Produces DB objects:
  - the table `public.financing_plans`;
  - the columns `transactions.financing_plan_id`, `principal_portion`, `interest_portion` and `savings_funded_amount`;
  - the RPC `calculate_total_saved(date)`, which now subtracts savings-funded amounts.
- Produces `savings.ts` `TransactionLike.savingsFundedAmount?: number`.

- [ ] **Step 1: Write the failing savings test.** Append to `tests/lib/finance/savings.test.ts`, inside or after the existing `describe("calculateTotalSaved")`. Check the existing imports at the top first; `calculateTotalSaved` is already imported:

```ts
describe("calculateTotalSaved with savings-funded expenses", () => {
  it("removes the funded part from the saved total and from the month's expenses", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-03",
      transactions: [
        { amount: 1000, date: "2026-01-05", type: "saving" },
        { amount: 2000, date: "2026-02-01", type: "income" },
        { amount: 500, date: "2026-02-10", type: "expense", group: "wants", savingsFundedAmount: 500 },
      ],
    });

    // Jan: invested 1000, no leftover. Feb: income 2000, and the expense is
    // fully savings-funded, so the balance-side expense is 0 and the leftover
    // is 2000. Invested drops by 500.
    expect(result.totalInvested).toBe(500);
    expect(result.closedMonths.find((month) => month.month === "2026-02")?.expenses).toBe(0);
    expect(result.totalSaved).toBe(2500);
  });
});
```

- [ ] **Step 2: Run it to verify that it fails**

Run: `pnpm exec vitest run tests/lib/finance/savings.test.ts`
Expected: FAIL, because `totalInvested` is 1000 (TS may also flag the unknown `savingsFundedAmount` key).

- [ ] **Step 3: Implement it in `lib/finance/savings.ts`**

Add the field to the type:

```ts
type TransactionLike = {
  amount: number;
  date: string;
  group?: TransactionGroup;
  savingsFundedAmount?: number;
  type: TransactionType;
};
```

In `calculateTotalSaved`, replace the `totalInvested` computation with:

```ts
  const savingsFundedTotal = validTransactions
    .filter((transaction) => getTransactionMonth(transaction) <= selectedMonth)
    .reduce(
      (sum, transaction) => sum + (transaction.savingsFundedAmount ?? 0),
      0,
    );
  const totalInvested = toMoneyValue(
    investedTransactions.reduce(
      (sum, transaction) => sum + Math.abs(transaction.amount),
      0,
    ) - savingsFundedTotal,
  );
```

Replace `sumExpenses` with:

```ts
function sumExpenses(transactions: TransactionLike[]) {
  return toMoneyValue(
    transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" && !isSavingsTransaction(transaction),
      )
      .reduce(
        (sum, transaction) =>
          sum +
          Math.abs(transaction.amount) -
          (transaction.savingsFundedAmount ?? 0),
        0,
      ),
  );
}
```

- [ ] **Step 4: Run it to verify that it passes**

Run: `pnpm exec vitest run tests/lib/finance/savings.test.ts --coverage --coverage.include=lib/finance/savings.ts`
Expected: PASS, with 100% coverage. The old tests have no `savingsFundedAmount`, so they exercise the `?? 0` fallback.

- [ ] **Step 5: Write the migration** at `supabase/migrations/011_add_financing_plans.sql`:

```sql
-- Interest-bearing purchases, loans and savings-funded expenses (issue #63).
-- Additive only: every new column has a neutral default, so existing rows
-- and flows are unchanged.

create table if not exists public.financing_plans (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  operation_type text not null
    check (operation_type in ('purchase', 'loan')),
  interest_system text not null
    check (interest_system in ('simple', 'price', 'sac')),
  rate_input_mode text not null
    check (rate_input_mode in ('rate', 'installment')),
  rate numeric not null check (rate >= 0 and rate <= 1000),
  rate_period text not null check (rate_period in ('monthly', 'annual')),
  principal numeric not null check (principal > 0),
  down_payment numeric not null default 0
    check (down_payment >= 0 and down_payment < principal),
  fees numeric not null default 0 check (fees >= 0),
  installment_count integer not null
    check (installment_count between 1 and 120),
  savings_funded_amount numeric not null default 0
    check (savings_funded_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists financing_plans_user_id_idx
  on public.financing_plans (user_id);

alter table public.financing_plans enable row level security;

revoke all on public.financing_plans from anon;
grant select, insert, delete on public.financing_plans to authenticated;

-- Plans are immutable: no update policy.
create policy "Users can select own financing plans"
on public.financing_plans for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can insert own financing plans"
on public.financing_plans for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can delete own financing plans"
on public.financing_plans for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

-- financing_plan_id links every row of a financed operation (down payment,
-- installments, loan income). installment_group_id cannot be reused for
-- that: transactions_installment_fields_consistent requires an
-- installment_number whenever the group id is set.
alter table public.transactions
  add column if not exists financing_plan_id uuid
    references public.financing_plans (id) on delete cascade,
  add column if not exists principal_portion numeric,
  add column if not exists interest_portion numeric,
  add column if not exists savings_funded_amount numeric not null default 0;

alter table public.transactions
  add constraint transactions_savings_funded_amount_range
  check (savings_funded_amount >= 0 and savings_funded_amount <= amount);

create index if not exists transactions_user_financing_plan_idx
  on public.transactions (user_id, financing_plan_id)
  where financing_plan_id is not null;

create or replace function private.validate_transaction_owner_refs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1
    from public.categories
    where id = new.category_id
      and user_id = new.user_id
  ) then
    raise exception 'invalid category for transaction owner';
  end if;

  if new.payment_method_id is not null and not exists (
    select 1
    from public.payment_methods
    where id = new.payment_method_id
      and user_id = new.user_id
  ) then
    raise exception 'invalid payment method for transaction owner';
  end if;

  if new.financing_plan_id is not null and not exists (
    select 1
    from public.financing_plans
    where id = new.financing_plan_id
      and user_id = new.user_id
  ) then
    raise exception 'invalid financing plan for transaction owner';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_validate_owner_refs on public.transactions;
create trigger transactions_validate_owner_refs
before insert or update of user_id, category_id, payment_method_id, financing_plan_id
on public.transactions
for each row execute function private.validate_transaction_owner_refs();

-- Same as 004, except that the savings-funded part of an expense is taken
-- from the saved total ("invested") instead of the month's balance.
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
    select (
      coalesce(
        sum(t.amount) filter (
          where t.kind = 'saving'
            or c.group_type = 'savings'
        ),
        0
      ) - coalesce(sum(t.savings_funded_amount), 0)
    )::numeric as amount
    from public.transactions t
    left join public.categories c
      on c.id = t.category_id
      and c.user_id = t.user_id
    cross join month_bounds b
    where t.user_id = (select auth.uid())
      and t.date < b.next_month_start
  ),
  monthly_balances as (
    select
      date_trunc('month', t.date)::date as month,
      coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric as income,
      coalesce(
        sum(t.amount - t.savings_funded_amount) filter (
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
```

- [ ] **Step 6: Apply to the local container and check the SQL**

Run:
```bash
supabase status >/dev/null 2>&1 || supabase start
supabase migration up --local
docker exec -i supabase_db_Dragg psql -U postgres -v ON_ERROR_STOP=1 < scratchpad/financing-check.sql
```
`scratchpad/financing-check.sql` (a temporary file outside the repo, in the session scratchpad) holds, inside `begin; … rollback;`:
- create 2 users in `auth.users` (A and B);
- `set local role authenticated; set local request.jwt.claims = '{"sub":"<A>"}';`
- insert a plan for A, plus a `transactions` expense row with `savings_funded_amount = 40` and a `saving` row of 100 → `select calculate_total_saved(current_date)` must drop by 40 compared with the same data without the funded amount;
- `savings_funded_amount > amount` → violates `transactions_savings_funded_amount_range`;
- a row with `financing_plan_id` of B's plan → `invalid financing plan for transaction owner`;
- a row with `installment_group_id` and a null `installment_number` → still violates `transactions_installment_fields_consistent` (sanity check of the ruling);
- `delete from financing_plans` → the rows are cascaded;
- as B: `select` on A's plan returns 0 rows (RLS).

Expected: `Applying migration 011_add_financing_plans.sql...` with no error, and every assertion passes (use `do $$ begin assert …; end $$;` so that a failure aborts). If something fails: fix the SQL, then run `supabase db reset --local` (local only) and repeat.

- [ ] **Step 7: Checkpoint (no commit)**: `git status --short`

---

### Task 3: Transaction mapping, available balance and funding context

**Files:**
- Modify: `lib/data.ts` (the `Transaction` interface)
- Modify: `lib/finance/transactions.ts`: `TransactionRow` (~line 99), `transactionSelect` (~464), `toTransaction` (~998), `buildDashboardSummaryData` (~3492), and a new `getFundingContext`
- Test: `tests/lib/finance/transactions-queries.test.ts` (append)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `Transaction.savingsFundedAmount?: number` and `Transaction.financingGroupId?: string | null`
  - `export type FundingContext = { totalSaved: number; availableBalance: number }`
  - `export async function getFundingContext(): Promise<FundingContext>`
  - internal `computeAvailableBalance(transactions: Transaction[]): number`

- [ ] **Step 1: Write the failing tests.** Open `tests/lib/finance/transactions-queries.test.ts` and reuse its existing `qb`/`setup` helpers and its transaction-row fixture factory; read the first ~120 lines to find their names. Append:

```ts
describe("savings-funded rows", () => {
  it("maps savings_funded_amount and financing_plan_id onto Transaction", async () => {
    // Build one expense row with the file's existing row fixture, adding:
    //   savings_funded_amount: "40", financing_plan_id: PLAN_ID
    // and resolve it from listTransactions({ month: "2030-01" }).
    // Expect: transaction.savingsFundedAmount === 40 and
    //         transaction.financingGroupId === PLAN_ID.
  });

  it("defaults savingsFundedAmount to 0 and financingGroupId to null for legacy rows", async () => {
    // Use the unchanged fixture (no new columns).
    // Expect: savingsFundedAmount === 0 and financingGroupId === null.
  });
});

describe("getFundingContext", () => {
  it("returns the saved total and the current month's available balance net of savings-funded expenses", async () => {
    // Queue: transactions query resolving rows for the current month:
    //   income 1000; expense 300 with savings_funded_amount 100; saving 200
    // and supabase.rpc resolving { data: 5000, error: null }.
    // Expect: await getFundingContext() toEqual
    //   { totalSaved: 5000, availableBalance: 1000 - (300 - 100) - 200 } → 600.
  });
});
```

Write these three tests with real code, using the file's own fixture builders; the comments above state the exact inputs and assertions. Also use the dashboard test in this file that asserts `summaryData.currentBalance`: add a sibling case where one expense row has `savings_funded_amount: "50"` and assert that `currentBalance` rises by exactly 50 compared with the same data without it. Define `const PLAN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";` at the top of the file if it is not there.

- [ ] **Step 2: Run them to verify that they fail**

Run: `pnpm exec vitest run tests/lib/finance/transactions-queries.test.ts`
Expected: FAIL. `savingsFundedAmount` is undefined, and `getFundingContext` is not exported.

- [ ] **Step 3: Implement it**

In `lib/data.ts`, add to `Transaction` after `advancedAt`:

```ts
  // Part of this expense paid from the saved total instead of the month's balance.
  savingsFundedAmount?: number;
  // financing_plans.id when this row belongs to an interest-bearing operation.
  financingGroupId?: string | null;
```

In `lib/finance/transactions.ts`:

Add to `TransactionRow`:

```ts
  financing_plan_id?: string | null;
  savings_funded_amount?: number | string | null;
```

Add these lines to `transactionSelect` (**only** that constant; `transactionSelectWithoutAdvancedMetadata` stays as the pre-migration fallback), after `installment_total,`:

```
  financing_plan_id,
  savings_funded_amount,
```

In `toTransaction`, add after `installmentTotal: …`:

```ts
    financingGroupId: row.financing_plan_id ?? null,
    savingsFundedAmount: Number(row.savings_funded_amount ?? 0),
```

Add below `sumTransactionsByType`:

```ts
function sumSavingsFunded(transactions: Transaction[]) {
  return transactions.reduce(
    (sum, transaction) => sum + (transaction.savingsFundedAmount ?? 0),
    0,
  );
}

// Month balance after spending, where the savings-funded part of an expense
// is paid by the saved total instead of this month's income.
function computeAvailableBalance(transactions: Transaction[]) {
  return (
    sumTransactionsByType(transactions, "income") -
    (sumTransactionsByType(transactions, "expense") -
      sumSavingsFunded(transactions)) -
    sumTransactionsByType(transactions, "saving")
  );
}

export type FundingContext = {
  availableBalance: number;
  totalSaved: number;
};

export async function getFundingContext(): Promise<FundingContext> {
  const ctx = await getUserContext();
  const month = getCurrentMonthValue();
  const [transactions, totalSaved] = await Promise.all([
    listTransactions({ month, userContext: ctx }),
    getTotalSavedForMonth(month, ctx),
  ]);

  return {
    availableBalance: computeAvailableBalance(transactions),
    totalSaved,
  };
}
```

In `buildDashboardSummaryData`, change the returned `currentBalance` to:

```ts
    currentBalance: computeAvailableBalance(transactions),
```

Keep `totalIncome`, `totalExpenses` and `totalMonthSavings` as they are, since they are still used for trends.

If `totalMonthSavings` becomes unused after this change, delete that one line. ESLint will flag it.

- [ ] **Step 4: Run it to verify that it passes**

Run: `pnpm exec vitest run tests/lib/finance/`
Expected: every file passes, including the existing dashboard tests. Their rows have no `savings_funded_amount`, so the balance is unchanged.

- [ ] **Step 5: Checkpoint (no commit)**: `git diff --stat`

---

### Task 4: `createTransaction`, covering savings funding and the financed path

**Files:**
- Modify: `lib/finance/transactions.ts`, including `NewTransactionInput` (~191) and `createTransaction` (~1865), plus new helpers placed just above `createTransaction`
- Test: `tests/lib/finance/transactions-mutations.test.ts` (append inside a new `describe`)

**Interfaces:**
- Consumes (Task 1): `resolveFinancingSchedule`, `allocateSavingsFunding`, `toCents`, `type TransactionFinancingInput`, `type FinancingSchedule`
- Consumes (Task 3): `getTotalSavedForMonth(month, ctx)` (existing), `getCurrentMonthValue()` (existing)
- Produces: `NewTransactionInput.savingsFundedAmount?: number` and `NewTransactionInput.financing?: TransactionFinancingInput`

- [ ] **Step 1: Write the failing tests.** Append to `tests/lib/finance/transactions-mutations.test.ts`. The `setup()` helper returns the fake client; `supabase.rpc` is a `vi.fn()` you can program per test.

```ts
describe("createTransaction — savings funding and financing", () => {
  const expense = {
    type: "expense" as const,
    date: "2030-01-15",
    amount: 1000,
    category: "none",
    paymentMethod: "none",
    installmentCount: 12,
    description: "Notebook",
  };
  const financing = {
    operationType: "purchase" as const,
    interestSystem: "price" as const,
    rateInputMode: "rate" as const,
    rate: 2,
    ratePeriod: "monthly" as const,
    downPayment: 0,
    fees: 0,
  };
  type Row = Record<string, unknown>;

  it("keeps the linear installment payload byte-identical without savings or financing", async () => {
    let captured: Row[] = [];
    setup([qb({ error: null }, { onInsert: (rows) => (captured = rows as Row[]) })]);
    await createTransaction({ ...expense, amount: 300, installmentCount: 3 });
    expect(captured.map((row) => Object.keys(row).sort())).toEqual(
      Array(3).fill(
        ["amount", "category_id", "date", "description", "installment_group_id", "installment_number", "installment_total", "kind", "notes", "payment_method_id", "user_id"],
      ),
    );
  });

  it("funds a lump-sum expense entirely from savings", async () => {
    let captured: Row[] = [];
    const supabase = setup([qb({ error: null }, { onInsert: (rows) => (captured = rows as Row[]) })]);
    supabase.rpc.mockResolvedValue({ data: 800, error: null });
    await createTransaction({ ...expense, amount: 500, installmentCount: 1, savingsFundedAmount: 500 });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({ amount: 500, savings_funded_amount: 500 });
    expect(captured[0]).not.toHaveProperty("financing_plan_id");
  });

  it("spreads savings over linear installments earliest first", async () => {
    let captured: Row[] = [];
    const supabase = setup([qb({ error: null }, { onInsert: (rows) => (captured = rows as Row[]) })]);
    supabase.rpc.mockResolvedValue({ data: 800, error: null });
    await createTransaction({ ...expense, amount: 300, installmentCount: 3, savingsFundedAmount: 150 });
    expect(captured.map((row) => row.savings_funded_amount)).toEqual([100, 50, 0]);
  });

  it("allocates savings after dropping rows before the user creation month", async () => {
    setup([], { createdAt: "2030-03-01T00:00:00.000Z" });
    await expect(
      createTransaction({ ...expense, amount: 300, installmentCount: 3, savingsFundedAmount: 250 }),
    ).rejects.toThrow("savings_exceeds_total");
  });

  it("rejects savings above the saved total", async () => {
    const supabase = setup([]);
    supabase.rpc.mockResolvedValue({ data: 100, error: null });
    await expect(
      createTransaction({ ...expense, installmentCount: 1, savingsFundedAmount: 200 }),
    ).rejects.toThrow("Savings funded amount exceeds the saved total.");
  });

  it.each([-1, Number.NaN])("rejects an invalid savings amount %s", async (savingsFundedAmount) => {
    setup([]);
    await expect(createTransaction({ ...expense, savingsFundedAmount })).rejects.toThrow(
      "Savings funded amount is invalid.",
    );
  });

  it("rejects savings funding or financing on non-expenses", async () => {
    setup([]);
    await expect(createTransaction({ ...expense, type: "income", financing })).rejects.toThrow(
      "Savings funding and financing are only available for expenses.",
    );
  });

  it("rejects a savings-group category", async () => {
    setup([
      qb({ data: { id: CATEGORY_ID }, error: null }), // assertUserCategory
      qb({ data: { group_type: "savings" }, error: null }), // assertNonSavingsCategory
    ]);
    await expect(createTransaction({ ...expense, category: CATEGORY_ID, financing })).rejects.toThrow(
      "Savings categories cannot be financed or funded from savings.",
    );
  });

  it("propagates a category group lookup error", async () => {
    setup([qb({ data: { id: CATEGORY_ID }, error: null }), qb({ data: null, error: { message: "boom" } })]);
    await expect(createTransaction({ ...expense, category: CATEGORY_ID, financing })).rejects.toThrow(
      "Unable to validate category: boom",
    );
  });

  it("accepts a non-savings category", async () => {
    setup([
      qb({ data: { id: CATEGORY_ID }, error: null }),
      qb({ data: { group_type: "needs" }, error: null }),
      qb({ error: null }),
      qb({ error: null }),
    ]);
    await expect(createTransaction({ ...expense, category: CATEGORY_ID, financing })).resolves.toBeUndefined();
  });

  it("rejects a financed date before the user creation month", async () => {
    setup([], { createdAt: "2030-03-01T00:00:00.000Z" });
    await expect(createTransaction({ ...expense, financing })).rejects.toThrow(
      "Transaction date cannot be earlier than the user creation month.",
    );
  });

  it("writes the plan, then Price rows with portions, first installment on the purchase date", async () => {
    let plan: Row = {};
    let rows: Row[] = [];
    setup([
      qb({ error: null }, { onInsert: (value) => (plan = value as Row) }),
      qb({ error: null }, { onInsert: (value) => (rows = value as Row[]) }),
    ]);
    await createTransaction({ ...expense, financing });
    expect(plan).toMatchObject({
      operation_type: "purchase", interest_system: "price", rate_input_mode: "rate",
      rate: 2, rate_period: "monthly", principal: 1000, down_payment: 0, fees: 0,
      installment_count: 12, savings_funded_amount: 0, user_id: USER_ID,
    });
    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({
      amount: 94.56, principal_portion: 74.56, interest_portion: 20, date: "2030-01-15",
      installment_group_id: plan.id, financing_plan_id: plan.id, installment_number: 1,
      installment_total: 12, description: "Notebook (1/12)", kind: "expense", savings_funded_amount: 0,
    });
    expect(rows[11]).toMatchObject({ amount: 94.54, date: "2030-12-15" });
  });

  it("adds a down-payment row on the date and shifts installments one month", async () => {
    let rows: Row[] = [];
    let plan: Row = {};
    setup([
      qb({ error: null }, { onInsert: (value) => (plan = value as Row) }),
      qb({ error: null }, { onInsert: (value) => (rows = value as Row[]) }),
    ]);
    await createTransaction({ ...expense, financing: { ...financing, downPayment: 200, fees: 50 } });
    expect(rows).toHaveLength(13);
    expect(rows[0]).toMatchObject({
      amount: 200, date: "2030-01-15", description: "Notebook", installment_group_id: null,
      installment_number: null, financing_plan_id: plan.id, principal_portion: 200, interest_portion: 0,
    });
    expect(rows[1]).toMatchObject({ amount: 80.38, date: "2030-02-15" });
  });

  it("creates a loan income row and starts installments next month", async () => {
    let rows: Row[] = [];
    setup([qb({ error: null }), qb({ error: null }, { onInsert: (value) => (rows = value as Row[]) })]);
    await createTransaction({ ...expense, financing: { ...financing, operationType: "loan" } });
    const income = rows.find((row) => row.kind === "income");
    expect(income).toMatchObject({ amount: 1000, category_id: null, date: "2030-01-15", savings_funded_amount: 0 });
    expect(rows.filter((row) => row.kind === "expense")[0]).toMatchObject({ date: "2030-02-15" });
  });

  it("stores the solved monthly rate in installment mode", async () => {
    let plan: Row = {};
    setup([qb({ error: null }, { onInsert: (value) => (plan = value as Row) }), qb({ error: null })]);
    await createTransaction({
      ...expense,
      financing: { ...financing, rateInputMode: "installment", rate: undefined, installmentAmount: 94.56 },
    });
    expect(plan.rate_period).toBe("monthly");
    expect(plan.interest_system).toBe("price");
    expect(Number(plan.rate)).toBeCloseTo(2, 3);
  });

  it("spreads savings over financed expense rows only", async () => {
    let rows: Row[] = [];
    let plan: Row = {};
    const supabase = setup([
      qb({ error: null }, { onInsert: (value) => (plan = value as Row) }),
      qb({ error: null }, { onInsert: (value) => (rows = value as Row[]) }),
    ]);
    supabase.rpc.mockResolvedValue({ data: 5000, error: null });
    await createTransaction({ ...expense, savingsFundedAmount: 100, financing: { ...financing, operationType: "loan" } });
    expect(plan.savings_funded_amount).toBe(100);
    expect(rows.find((row) => row.kind === "income")?.savings_funded_amount).toBe(0);
    expect(rows.filter((row) => row.kind === "expense").map((row) => row.savings_funded_amount).slice(0, 2)).toEqual([94.56, 5.44]);
  });

  it("throws when the plan insert fails", async () => {
    setup([qb({ error: { message: "plan boom" } })]);
    await expect(createTransaction({ ...expense, financing })).rejects.toThrow(
      "Unable to save financing plan: plan boom",
    );
  });

  it("deletes the plan (compensation) when the rows insert fails", async () => {
    const deletePlan = qb({ error: null });
    const deleteSpy = vi.spyOn(deletePlan as { delete: () => unknown }, "delete");
    setup([qb({ error: null }), qb({ error: { message: "rows boom" } }), deletePlan]);
    await expect(createTransaction({ ...expense, financing })).rejects.toThrow(
      "Unable to save transaction: rows boom",
    );
    expect(deleteSpy).toHaveBeenCalled();
  });

  it("propagates the saved-total RPC error", async () => {
    const supabase = setup([]);
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "rpc boom" } });
    await expect(createTransaction({ ...expense, savingsFundedAmount: 10 })).rejects.toThrow(
      "Unable to calculate total saved: rpc boom",
    );
  });
});
```

- [ ] **Step 2: Run them to verify that they fail**

Run: `pnpm exec vitest run tests/lib/finance/transactions-mutations.test.ts`
Expected: FAIL on the new cases (unknown keys, and no plan insert). The first case, byte-identical linear rows, should already PASS. That is intended, because it pins the regression.

- [ ] **Step 3: Implement it in `lib/finance/transactions.ts`**

Add the import next to the other finance imports:

```ts
import {
  allocateSavingsFunding,
  resolveFinancingSchedule,
  toCents,
  type FinancingSchedule,
  type TransactionFinancingInput,
} from "@/lib/finance/financing";
```

Extend `NewTransactionInput`:

```ts
export type NewTransactionInput = {
  type: "income" | "expense" | "saving";
  date: string;
  amount: number;
  category: string;
  paymentMethod: string;
  installmentCount: number;
  description: string;
  notes?: string;
  savingsFundedAmount?: number;
  financing?: TransactionFinancingInput;
};
```

Add these helpers directly above `createTransaction`:

```ts
function resolveSavingsFundedAmount(value: number | undefined) {
  if (value == null) return 0;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Savings funded amount is invalid.");
  }
  return toCents(value);
}

async function assertNonSavingsCategory(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string | null,
) {
  if (!categoryId) return;

  const { data, error } = await supabase
    .from("categories")
    .select("group_type")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate category: ${error.message}`);
  }

  if (data?.group_type === "savings") {
    throw new Error(
      "Savings categories cannot be financed or funded from savings.",
    );
  }
}

async function assertSavingsFundingOrFinancingAllowed(
  ctx: AuthenticatedUserContext,
  resolved: ResolvedNewTransactionInput,
  savingsFundedAmount: number,
) {
  if (resolved.kind !== "expense") {
    throw new Error(
      "Savings funding and financing are only available for expenses.",
    );
  }

  await assertNonSavingsCategory(ctx.supabase, ctx.userId, resolved.categoryId);

  if (savingsFundedAmount === 0) return;

  const totalSaved = await getTotalSavedForMonth(getCurrentMonthValue(), ctx);

  if (savingsFundedAmount > totalSaved) {
    throw new Error("Savings funded amount exceeds the saved total.");
  }
}

function applySavingsFunding<T extends { amount: number }>(
  rows: T[],
  savingsFundedAmount: number,
): (T | (T & { savings_funded_amount: number }))[] {
  // ponytail: no savings → untouched rows, so legacy payloads stay identical.
  if (savingsFundedAmount === 0 || rows.length === 0) return rows;

  const slices = allocateSavingsFunding(
    rows.map((row) => row.amount),
    savingsFundedAmount,
  );
  return rows.map((row, index) => ({
    ...row,
    savings_funded_amount: slices[index],
  }));
}

type FinancedRowsContext = {
  resolved: ResolvedNewTransactionInput;
  notes: string | null;
  userId: string;
  planId: string;
  financing: TransactionFinancingInput;
  schedule: FinancingSchedule;
};

function buildFinancedTransactionRows({
  resolved,
  notes,
  userId,
  planId,
  financing,
  schedule,
}: FinancedRowsContext) {
  const [year, month, day] = resolved.date.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  const downPayment = schedule.totals.downPayment;
  // A loan or a purchase with a down payment starts paying next month;
  // otherwise the first installment falls on the purchase date, as today.
  const firstOffset =
    financing.operationType === "loan" || downPayment > 0 ? 1 : 0;
  const count = schedule.rows.length;
  const shared = {
    category_id: resolved.categoryId,
    financing_plan_id: planId,
    payment_method_id: resolved.paymentMethodId,
    user_id: userId,
  };
  const plainRow = (amount: number, kind: DbTransactionKind) => ({
    ...shared,
    amount,
    date: resolved.date,
    description: encryptDescription(resolved.description),
    installment_group_id: null,
    installment_number: null,
    installment_total: null,
    kind,
    notes: encryptField(notes),
  });

  const downPaymentRows =
    downPayment > 0
      ? [{ ...plainRow(downPayment, "expense"), principal_portion: downPayment, interest_portion: 0 }]
      : [];
  const installmentRows = schedule.rows.map((row, index) => {
    const metadata = createInstallmentMetadata({
      groupId: planId,
      installmentNumber: row.number,
      installmentTotal: count,
    });
    return {
      ...shared,
      amount: row.payment,
      date: formatOccurrenceDate(baseDate, index + firstOffset),
      description: encryptDescription(
        `${resolved.description} (${row.number}/${count})`,
      ),
      installment_group_id: planId,
      installment_number: row.number,
      installment_total: count,
      interest_portion: row.interest,
      kind: "expense" as DbTransactionKind,
      notes: encryptField(resolveOccurrenceNotes(metadata, notes)),
      principal_portion: row.principal,
    };
  });
  const incomeRows =
    financing.operationType === "loan"
      ? [
          {
            ...plainRow(resolved.amount, "income"),
            category_id: null,
            principal_portion: null,
            interest_portion: null,
            savings_funded_amount: 0,
          },
        ]
      : [];

  return { expenseRows: [...downPaymentRows, ...installmentRows], incomeRows };
}

async function createFinancedTransaction({
  ctx,
  resolved,
  notes,
  financing,
  savingsFundedAmount,
}: {
  ctx: AuthenticatedUserContext;
  resolved: ResolvedNewTransactionInput;
  notes: string | null;
  financing: TransactionFinancingInput;
  savingsFundedAmount: number;
}) {
  const { supabase, userId } = ctx;
  const { monthlyRate, system, schedule } = resolveFinancingSchedule({
    principal: resolved.amount,
    installmentCount: resolved.installmentCount,
    financing,
  });
  const planId = crypto.randomUUID();
  const { expenseRows, incomeRows } = buildFinancedTransactionRows({
    resolved,
    notes,
    userId,
    planId,
    financing,
    schedule,
  });
  const slices = allocateSavingsFunding(
    expenseRows.map((row) => row.amount),
    savingsFundedAmount,
  );
  const rows = [
    ...expenseRows.map((row, index) => ({
      ...row,
      savings_funded_amount: slices[index],
    })),
    ...incomeRows,
  ];
  const isInstallmentMode = financing.rateInputMode === "installment";

  const { error: planError } = await supabase.from("financing_plans").insert({
    id: planId,
    user_id: userId,
    operation_type: financing.operationType,
    interest_system: system,
    rate_input_mode: financing.rateInputMode,
    rate: isInstallmentMode
      ? Number((monthlyRate * 100).toFixed(6))
      : Number(financing.rate),
    rate_period: isInstallmentMode ? "monthly" : financing.ratePeriod,
    principal: resolved.amount,
    down_payment: schedule.totals.downPayment,
    fees: financing.fees,
    installment_count: resolved.installmentCount,
    savings_funded_amount: savingsFundedAmount,
  });

  if (planError) {
    throw new Error(`Unable to save financing plan: ${planError.message}`);
  }

  const { error } = await supabase.from("transactions").insert(rows);

  if (error) {
    // Compensation: supabase-js has no multi-statement transaction here.
    await supabase
      .from("financing_plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", userId);
    throw new Error(`Unable to save transaction: ${error.message}`);
  }
}
```

Replace `createTransaction` with:

```ts
export async function createTransaction(input: NewTransactionInput) {
  const ctx = await getUserContext();
  const { createdAt, supabase, userId } = ctx;
  const resolved = resolveNewTransactionInput(input);
  await Promise.all([
    assertUserCategory(supabase, userId, resolved.categoryId),
    assertUserPaymentMethod(supabase, userId, resolved.paymentMethodId),
  ]);
  assertValidInstallmentCount(resolved.installmentCount);
  const savingsFundedAmount = resolveSavingsFundedAmount(
    input.savingsFundedAmount,
  );

  if (input.financing || savingsFundedAmount > 0) {
    await assertSavingsFundingOrFinancingAllowed(
      ctx,
      resolved,
      savingsFundedAmount,
    );
  }

  const notes = normalizeOptionalString(input.notes);

  if (input.financing) {
    assertDateNotBeforeUserCreated(resolved.date, createdAt);
    await createFinancedTransaction({
      ctx,
      resolved,
      notes,
      financing: input.financing,
      savingsFundedAmount,
    });
    return;
  }

  const plan = computeInstallmentPlan(
    resolved.kind,
    resolved.amount,
    resolved.installmentCount,
  );
  const rows = buildInstallmentTransactionRows({
    resolved,
    plan,
    notes,
    userId,
  });
  const filteredRows = filterRowsByUserCreatedMonth(
    rows,
    getUserCreatedMonth(createdAt),
  );

  await insertTransactionRows(
    supabase,
    applySavingsFunding(filteredRows, savingsFundedAmount),
  );
}
```

Notes for the implementer:
- `insertTransactionRows`'s parameter type is `ReturnType<typeof buildInstallmentTransactionRows>`. Widen it to `Record<string, unknown>[]` if TS complains about the extra key.
- Savings validation runs when the category is `none` (null) as well; `assertNonSavingsCategory` returns early for null.
- The "rows before creation month" test expects `savings_exceeds_total` from `applySavingsFunding`, because the saved-total RPC is not programmed in that test and the check order is: the RPC runs first. **Program `supabase.rpc.mockResolvedValue({ data: 5000, error: null })` in that test** so that the RPC passes and the allocation throws. Adjust the test accordingly and keep its assertion on `"savings_exceeds_total"`.

- [ ] **Step 4: Run them to verify that they pass**

Run: `pnpm exec vitest run tests/lib/finance/ --coverage --coverage.include=lib/finance/transactions.ts --coverage.include=lib/finance/financing.ts`
Expected: PASS, with 100% coverage for both files. Cover every uncovered branch with a test; do not add ignore comments.

- [ ] **Step 5: Checkpoint (no commit)**: `git diff --stat`

---

### Task 5: The financing breakdown query, and plan deletion on a full-group delete

**Files:**
- Modify: `lib/finance/financing.ts` (add `buildFinancingBreakdown` and its types)
- Modify: `lib/finance/transactions.ts` (add `getFinancingBreakdown`, and change `deleteInstallments` ~2799)
- Test: `tests/lib/finance/financing.test.ts` (append) and `tests/lib/finance/transactions-mutations.test.ts` (append)

**Interfaces:**
- Consumes (Task 1): `toMonthlyRate`, `computeCet`, `toCents` and the types
- Consumes (Task 3): `Transaction.financingGroupId`
- Produces:
  - `FinancingPlanRecord = { operationType; interestSystem; rateInputMode; rate; ratePeriod; principal; downPayment; fees; installmentCount; savingsFundedAmount }`
  - `FinancingRowRecord = { id; date; amount; kind: "expense"|"income"|"saving"; installmentNumber: number|null; principalPortion: number|null; interestPortion: number|null; savingsFundedAmount: number }`
  - `FinancingBreakdownRow = { id; number: number|null; date; payment; principal; interest; savingsFunded; balanceAfter; isPaid }`
  - `FinancingBreakdown = { plan; monthlyRate; cet: {monthly; annual}; totals: {principal; downPayment; fees; interest; payable; savingsFunded}; rows: FinancingBreakdownRow[]; outstanding: {principal; interest; total} }`
  - `buildFinancingBreakdown(plan, rows, today: string): FinancingBreakdown`
  - `getFinancingBreakdown(planId: string): Promise<FinancingBreakdown | null>`

- [ ] **Step 1: Write the failing pure tests.** Append to `tests/lib/finance/financing.test.ts`, and add `buildFinancingBreakdown, type FinancingPlanRecord, type FinancingRowRecord` to its import:

```ts
describe("buildFinancingBreakdown", () => {
  const plan: FinancingPlanRecord = {
    operationType: "purchase", interestSystem: "price", rateInputMode: "rate",
    rate: 2, ratePeriod: "monthly", principal: 1000, downPayment: 200, fees: 0,
    installmentCount: 2, savingsFundedAmount: 50,
  };
  const rows: FinancingRowRecord[] = [
    { id: "i2", date: "2030-03-15", amount: 412.12, kind: "expense", installmentNumber: 2, principalPortion: 404.04, interestPortion: 8.08, savingsFundedAmount: 0 },
    { id: "d", date: "2030-01-15", amount: 200, kind: "expense", installmentNumber: null, principalPortion: 200, interestPortion: 0, savingsFundedAmount: 50 },
    { id: "i1", date: "2030-02-15", amount: 412.12, kind: "expense", installmentNumber: 1, principalPortion: 395.96, interestPortion: 16, savingsFundedAmount: 0 },
    { id: "inc", date: "2030-01-15", amount: 1000, kind: "income", installmentNumber: null, principalPortion: null, interestPortion: null, savingsFundedAmount: 0 },
  ];

  it("orders expense rows, tracks the running balance and the paid flag", () => {
    const result = buildFinancingBreakdown(plan, rows, "2030-02-20");
    expect(result.rows.map((row) => [row.id, row.balanceAfter, row.isPaid])).toEqual([
      ["d", 800, true],
      ["i1", 404.04, true],
      ["i2", 0, false],
    ]);
    expect(result.monthlyRate).toBe(0.02);
    expect(result.totals).toEqual({ principal: 1000, downPayment: 200, fees: 0, interest: 24.08, payable: 1024.24, savingsFunded: 50 });
    expect(result.outstanding).toEqual({ principal: 404.04, interest: 8.08, total: 412.12 });
    expect(result.cet.monthly).toBeGreaterThan(0);
  });

  it("treats missing portions as principal", () => {
    const result = buildFinancingBreakdown(plan, [{ ...rows[2], principalPortion: null, interestPortion: null }], "2030-01-01");
    expect(result.rows[0]).toMatchObject({ principal: 412.12, interest: 0 });
  });

  it("handles a partially deleted group", () => {
    const result = buildFinancingBreakdown(plan, [rows[0]], "2030-01-01");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].balanceAfter).toBe(395.96);
  });
});
```

- [ ] **Step 2: Write the failing query and deletion tests.** Append to `tests/lib/finance/transactions-mutations.test.ts`, and add `getFinancingBreakdown` to the import from `@/lib/finance/transactions`:

```ts
const PLAN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("getFinancingBreakdown", () => {
  const planRow = {
    operation_type: "purchase", interest_system: "price", rate_input_mode: "rate",
    rate: "2", rate_period: "monthly", principal: "1000", down_payment: "0", fees: "0",
    installment_count: 1, savings_funded_amount: "0",
  };

  it("rejects a non-UUID id", async () => {
    setup([]);
    await expect(getFinancingBreakdown("nope")).rejects.toThrow("Financing plan is invalid.");
  });

  it("returns null for a plan the user does not own", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(getFinancingBreakdown(PLAN_ID)).resolves.toBeNull();
  });

  it("maps the plan and rows", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({
        data: [{ id: "r1", date: "2030-01-15", amount: "1020", kind: "expense", installment_number: 1, principal_portion: "1000", interest_portion: "20", savings_funded_amount: "0" }],
        error: null,
      }),
    ]);
    const result = await getFinancingBreakdown(PLAN_ID);
    expect(result?.plan.rate).toBe(2);
    expect(result?.rows[0]).toMatchObject({ payment: 1020, principal: 1000, interest: 20 });
  });

  it("maps null portions and null row data", async () => {
    setup([qb({ data: planRow, error: null }), qb({ data: null, error: null })]);
    const result = await getFinancingBreakdown(PLAN_ID);
    expect(result?.rows).toEqual([]);
  });

  it("propagates plan and rows errors", async () => {
    setup([qb({ data: null, error: { message: "p" } })]);
    await expect(getFinancingBreakdown(PLAN_ID)).rejects.toThrow("Unable to load financing plan: p");
    setup([qb({ data: planRow, error: null }), qb({ data: null, error: { message: "r" } })]);
    await expect(getFinancingBreakdown(PLAN_ID)).rejects.toThrow("Unable to load financing rows: r");
  });
});

describe("deleteInstallments — financed groups", () => {
  it("deletes the plan (cascading its rows) when scope is all", async () => {
    const planDelete = qb({ error: null });
    const deleteSpy = vi.spyOn(planDelete as { delete: () => unknown }, "delete");
    const supabase = setup([
      qb({ data: { /* existing selected-transaction row fixture */ id: TRANSACTION_ID, financing_plan_id: PLAN_ID, installment_group_id: PLAN_ID, installment_number: 1, installment_total: 12 }, error: null }),
      planDelete,
    ]);
    await deleteInstallments({ transactionId: TRANSACTION_ID, scope: "all" });
    expect(supabase.from).toHaveBeenLastCalledWith("financing_plans");
    expect(deleteSpy).toHaveBeenCalled();
  });

  it("propagates a plan delete error", async () => {
    setup([
      qb({ data: { id: TRANSACTION_ID, financing_plan_id: PLAN_ID }, error: null }),
      qb({ error: { message: "del boom" } }),
    ]);
    await expect(deleteInstallments({ transactionId: TRANSACTION_ID, scope: "all" })).rejects.toThrow(
      "Unable to delete financing plan: del boom",
    );
  });
});
```

The selected-transaction row must satisfy `toTransaction`. Copy the minimal row fixture the existing `deleteInstallments` tests in this file already use; search for `describe("deleteInstallments"`. Then add `financing_plan_id: PLAN_ID` to it.

- [ ] **Step 3: Run them to verify that they fail**

Run: `pnpm exec vitest run tests/lib/finance/financing.test.ts tests/lib/finance/transactions-mutations.test.ts`
Expected: FAIL, because `buildFinancingBreakdown` and `getFinancingBreakdown` are not exported.

- [ ] **Step 4: Implement `buildFinancingBreakdown`.** Append to `lib/finance/financing.ts`:

```ts
export type FinancingPlanRecord = {
  operationType: OperationType;
  interestSystem: InterestSystem;
  rateInputMode: RateInputMode;
  rate: number;
  ratePeriod: RatePeriod;
  principal: number;
  downPayment: number;
  fees: number;
  installmentCount: number;
  savingsFundedAmount: number;
};

export type FinancingRowRecord = {
  id: string;
  date: string;
  amount: number;
  kind: "expense" | "income" | "saving";
  installmentNumber: number | null;
  principalPortion: number | null;
  interestPortion: number | null;
  savingsFundedAmount: number;
};

export type FinancingBreakdownRow = {
  id: string;
  number: number | null;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  savingsFunded: number;
  balanceAfter: number;
  isPaid: boolean;
};

export type FinancingBreakdown = {
  plan: FinancingPlanRecord;
  monthlyRate: number;
  cet: { monthly: number; annual: number };
  totals: {
    principal: number;
    downPayment: number;
    fees: number;
    interest: number;
    payable: number;
    savingsFunded: number;
  };
  rows: FinancingBreakdownRow[];
  outstanding: { principal: number; interest: number; total: number };
};

export function buildFinancingBreakdown(
  plan: FinancingPlanRecord,
  rows: FinancingRowRecord[],
  today: string,
): FinancingBreakdown {
  const expenseRows = rows
    .filter((row) => row.kind === "expense")
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        (left.installmentNumber ?? 0) - (right.installmentNumber ?? 0),
    );
  let balance = toCents(plan.principal - plan.downPayment + plan.fees);
  const breakdownRows = expenseRows.map((row) => {
    const principal = row.principalPortion ?? row.amount;
    // The down-payment row (no installment number) is paid before financing.
    if (row.installmentNumber != null) balance = toCents(balance - principal);
    return {
      id: row.id,
      number: row.installmentNumber,
      date: row.date,
      payment: row.amount,
      principal,
      interest: row.interestPortion ?? 0,
      savingsFunded: row.savingsFundedAmount,
      balanceAfter: balance,
      isPaid: row.date <= today,
    };
  });
  const future = breakdownRows.filter((row) => !row.isPaid);

  return {
    plan,
    monthlyRate: toMonthlyRate(plan.rate, plan.ratePeriod, plan.interestSystem),
    cet: computeCet(
      plan.principal - plan.downPayment,
      breakdownRows.filter((row) => row.number != null).map((row) => row.payment),
    ),
    totals: {
      principal: plan.principal,
      downPayment: plan.downPayment,
      fees: plan.fees,
      interest: sumBy(breakdownRows, (row) => row.interest),
      payable: sumBy(breakdownRows, (row) => row.payment),
      savingsFunded: sumBy(breakdownRows, (row) => row.savingsFunded),
    },
    rows: breakdownRows,
    outstanding: {
      principal: sumBy(future, (row) => row.principal),
      interest: sumBy(future, (row) => row.interest),
      total: sumBy(future, (row) => row.payment),
    },
  };
}
```

- [ ] **Step 5: Implement the query and the delete in `lib/finance/transactions.ts`**

Extend the Task 4 import with `buildFinancingBreakdown, type FinancingBreakdown, type FinancingPlanRecord, type FinancingRowRecord`, and re-export the type for the UI: `export type { FinancingBreakdown } from "@/lib/finance/financing";`.

Add near `deleteInstallments`:

```ts
type FinancingPlanDbRow = {
  operation_type: FinancingPlanRecord["operationType"];
  interest_system: FinancingPlanRecord["interestSystem"];
  rate_input_mode: FinancingPlanRecord["rateInputMode"];
  rate: number | string;
  rate_period: FinancingPlanRecord["ratePeriod"];
  principal: number | string;
  down_payment: number | string;
  fees: number | string;
  installment_count: number;
  savings_funded_amount: number | string;
};

type FinancingDbRow = {
  id: string;
  date: string;
  amount: number | string;
  kind: DbTransactionKind;
  installment_number: number | null;
  principal_portion: number | string | null;
  interest_portion: number | string | null;
  savings_funded_amount: number | string;
};

function toNullableNumber(value: number | string | null) {
  return value == null ? null : Number(value);
}

export async function getFinancingBreakdown(
  planId: string,
): Promise<FinancingBreakdown | null> {
  assertUuid(planId, "Financing plan");
  const { supabase, userId } = await getUserContext();

  const { data: plan, error: planError } = await supabase
    .from("financing_plans")
    .select(
      "operation_type, interest_system, rate_input_mode, rate, rate_period, principal, down_payment, fees, installment_count, savings_funded_amount",
    )
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (planError) {
    throw new Error(`Unable to load financing plan: ${planError.message}`);
  }

  if (!plan) return null;

  const { data: rows, error } = await supabase
    .from("transactions")
    .select(
      "id, date, amount, kind, installment_number, principal_portion, interest_portion, savings_funded_amount",
    )
    .eq("user_id", userId)
    .eq("financing_plan_id", planId);

  if (error) {
    throw new Error(`Unable to load financing rows: ${error.message}`);
  }

  const planRow = plan as FinancingPlanDbRow;

  return buildFinancingBreakdown(
    {
      operationType: planRow.operation_type,
      interestSystem: planRow.interest_system,
      rateInputMode: planRow.rate_input_mode,
      rate: Number(planRow.rate),
      ratePeriod: planRow.rate_period,
      principal: Number(planRow.principal),
      downPayment: Number(planRow.down_payment),
      fees: Number(planRow.fees),
      installmentCount: planRow.installment_count,
      savingsFundedAmount: Number(planRow.savings_funded_amount),
    },
    ((rows ?? []) as FinancingDbRow[]).map((row) => ({
      id: row.id,
      date: row.date,
      amount: Number(row.amount),
      kind: row.kind,
      installmentNumber: row.installment_number,
      principalPortion: toNullableNumber(row.principal_portion),
      interestPortion: toNullableNumber(row.interest_portion),
      savingsFundedAmount: Number(row.savings_funded_amount),
    })),
    getTodayValue(),
  );
}

async function deleteFinancingPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
) {
  // transactions.financing_plan_id is ON DELETE CASCADE: this removes the
  // down payment, installments and loan income of the operation too.
  const { error } = await supabase
    .from("financing_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to delete financing plan: ${error.message}`);
  }
}
```

Note that `assertUuid(value, label)` throws `${label} is invalid.`. Confirm this by reading `assertUuid` at ~line 567, and adjust the test message if it differs.

In `deleteInstallments`, insert this right after `selectedTransaction` is loaded and **before** the `isInstallmentTransaction` check:

```ts
  if (input.scope === "all" && selectedTransaction.financingGroupId) {
    await deleteFinancingPlan(
      supabase,
      userId,
      selectedTransaction.financingGroupId,
    );
    return;
  }
```

- [ ] **Step 6: Run them to verify that they pass**

Run: `pnpm exec vitest run tests/lib/finance/ --coverage --coverage.include='lib/finance/**'`
Expected: PASS, with 100% coverage.

- [ ] **Step 7: Checkpoint (no commit)**: `git diff --stat`

---

### Task 6: Server actions (Zod schema, breakdown and funding context)

**Files:**
- Modify: `app/transactions/actions.ts`
- Test: `tests/transactions-actions.test.ts`

**Interfaces:**
- Consumes (Tasks 3–5): `getFundingContext()` and `getFinancingBreakdown(planId)` from `@/lib/finance/transactions`
- Produces: `getFinancingBreakdownAction(planId: string): Promise<FinancingBreakdown | null>`, `getFundingContextAction(): Promise<FundingContext>`, and an extended `createTransactionActionSchema`

- [ ] **Step 1: Write the failing tests.** In `tests/transactions-actions.test.ts`:
  - Add `getFinancingBreakdown: vi.fn().mockResolvedValue(null)` and `getFundingContext: vi.fn().mockResolvedValue({ totalSaved: 10, availableBalance: 5 })` to the hoisted mocks and to the `vi.mock("@/lib/finance/transactions")` factory.
  - Import `getFinancingBreakdownAction` and `getFundingContextAction`.
  - Append:

```ts
describe("createTransactionAction — financing and savings", () => {
  const base = {
    amount: 1000, category: "", date: "2030-01-15", description: "Notebook",
    installmentCount: 12, paymentMethod: "", type: "expense" as const,
  };
  const financing = {
    operationType: "purchase" as const, interestSystem: "price" as const,
    rateInputMode: "rate" as const, rate: 2, ratePeriod: "monthly" as const,
    downPayment: 0, fees: 0,
  };

  it("passes financing and savings through", async () => {
    await createTransactionAction({ ...base, savingsFundedAmount: 100, financing });
    expect(createTransaction).toHaveBeenLastCalledWith(
      expect.objectContaining({ savingsFundedAmount: 100, financing }),
    );
  });

  it("defaults downPayment and fees to 0", async () => {
    const { downPayment: _d, fees: _f, ...partial } = financing;
    await createTransactionAction({ ...base, financing: partial as never });
    expect(createTransaction).toHaveBeenLastCalledWith(
      expect.objectContaining({ financing: expect.objectContaining({ downPayment: 0, fees: 0 }) }),
    );
  });

  it.each([
    ["financing on income", { type: "income" as const, financing }],
    ["down payment ≥ amount", { financing: { ...financing, downPayment: 1000 } }],
    ["installment mode with SAC", { financing: { ...financing, interestSystem: "sac" as const, rateInputMode: "installment" as const, installmentAmount: 100 } }],
    ["installment mode without amount", { financing: { ...financing, rateInputMode: "installment" as const } }],
    ["rate mode without rate", { financing: { ...financing, rate: undefined } }],
    ["loan with down payment", { financing: { ...financing, operationType: "loan" as const, downPayment: 10 } }],
    ["savings above amount", { savingsFundedAmount: 1001 }],
    ["unknown financing key", { financing: { ...financing, extra: 1 } }],
  ])("rejects %s", async (_label, override) => {
    await expect(createTransactionAction({ ...base, ...override } as never)).rejects.toThrow();
  });
});

describe("financing read actions", () => {
  it("validates the plan id and returns the breakdown", async () => {
    await expect(getFinancingBreakdownAction("bad")).rejects.toThrow();
    await expect(
      getFinancingBreakdownAction("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    ).resolves.toBeNull();
    expect(getFinancingBreakdown).toHaveBeenCalledWith("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });

  it("returns the funding context", async () => {
    await expect(getFundingContextAction()).resolves.toEqual({ totalSaved: 10, availableBalance: 5 });
  });
});
```

- [ ] **Step 2: Run them to verify that they fail**

Run: `pnpm exec vitest run tests/transactions-actions.test.ts`
Expected: FAIL, because the new keys are rejected by `.strict()` and the actions are not exported.

- [ ] **Step 3: Implement it in `app/transactions/actions.ts`**

Add `getFinancingBreakdown` and `getFundingContext` to the import list.

Replace `createTransactionActionSchema` with:

```ts
const financingSchema = z
  .object({
    downPayment: z.number().finite().min(0).max(1_000_000_000).default(0),
    fees: z.number().finite().min(0).max(1_000_000_000).default(0),
    installmentAmount: z.number().finite().positive().max(1_000_000_000).optional(),
    interestSystem: z.enum(["simple", "price", "sac"]),
    operationType: z.enum(["purchase", "loan"]),
    rate: z.number().finite().min(0).max(1000).optional(),
    rateInputMode: z.enum(["rate", "installment"]),
    ratePeriod: z.enum(["monthly", "annual"]),
  })
  .strict();

const createTransactionActionSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
    category: z.string().trim().min(0).max(64),
    date: dateSchema,
    description: safeShortTextSchema,
    financing: financingSchema.optional(),
    installmentCount: z.number().int().min(1).max(120),
    notes: safeOptionalNotesSchema,
    paymentMethod: z.string().trim().min(0).max(64),
    savingsFundedAmount: z.number().finite().min(0).max(1_000_000_000).optional(),
    type: z.enum(["income", "expense", "saving"]),
  })
  .strict()
  .superRefine((data, context) => {
    const issue = (message: string) =>
      context.addIssue({ code: "custom", message });

    if (data.savingsFundedAmount != null && data.savingsFundedAmount > data.amount) {
      issue("Savings funded amount exceeds the amount");
    }

    const financing = data.financing;
    if (!financing) return;

    if (data.type !== "expense") issue("Financing requires an expense");
    if (financing.downPayment >= data.amount) issue("Down payment too high");
    if (financing.operationType === "loan" && financing.downPayment > 0) {
      issue("Loans have no down payment");
    }
    if (financing.rateInputMode === "installment") {
      if (financing.interestSystem !== "price") issue("Installment mode requires Price");
      if (financing.installmentAmount == null) issue("Installment amount required");
    } else if (financing.rate == null) {
      issue("Rate required");
    }
  });
```

Add at the end of the file:

```ts
export async function getFinancingBreakdownAction(planId: string) {
  return getFinancingBreakdown(uuidSchema.parse(planId));
}

export async function getFundingContextAction() {
  return getFundingContext();
}
```

Check the Zod version's issue code: run `grep '"version"' node_modules/zod/package.json`. Zod 4 accepts `code: "custom"`, and so does Zod 3. Leave the code as it is.

- [ ] **Step 4: Run them to verify that they pass**

Run: `pnpm exec vitest run tests/transactions-actions.test.ts --coverage --coverage.include=app/transactions/actions.ts`
Expected: PASS, with 100% coverage.

- [ ] **Step 5: Checkpoint (no commit)**: `git diff --stat`

---

### Task 7: The form's "Opções avançadas" (funding source, interest, preview and alert)

**Files:**
- Create: `components/dashboard/transaction-advanced-options.tsx`
- Modify: `components/dashboard/transaction-form.tsx`
- Modify: `components/dashboard/transactions-screen.tsx`, specifically `buildNewTransactionInput` (~3355)
- Modify: `lib/i18n.tsx`, adding keys in `en` and in `pt-BR`
- Test: `tests/dashboard/transaction-advanced-options.test.tsx` (new) and `tests/dashboard/transaction-form.test.tsx` (append)

**Interfaces:**
- Consumes: `resolveFinancingSchedule`, `FinancingError`, `TransactionFinancingInput` (Task 1); `getFundingContextAction` (Task 6)
- Produces:
  - `TransactionFormData.savingsFundedAmount?: number`
  - `TransactionFormData.financing?: TransactionFinancingInput`
  - `AdvancedOptionsState`
  - `DEFAULT_ADVANCED_OPTIONS`
  - `buildTransactionSubmitData(formData, advanced): TransactionFormData`
  - `getFirstChargeFromBalance(amount, installmentCount, advanced): number`
  - the `<TransactionAdvancedOptions>` component

- [ ] **Step 1: Add the i18n keys.** Add them to the `en` dictionary, next to the other `transaction.*` keys:

```ts
    "transaction.advanced.toggle": "Advanced options",
    "transaction.advanced.payWith": "Pay with",
    "transaction.advanced.fundingBalance": "Available balance",
    "transaction.advanced.fundingSavings": "Saved total",
    "transaction.advanced.fundingSplit": "Split",
    "transaction.advanced.savingsPart": "From saved total",
    "transaction.advanced.balancePart": "From balance",
    "transaction.advanced.savedTotalHint": "Saved total available",
    "transaction.advanced.interestToggle": "With interest / financing",
    "transaction.advanced.operation": "Operation",
    "transaction.advanced.operationPurchase": "Purchase / financing",
    "transaction.advanced.operationLoan": "Loan",
    "transaction.advanced.inputMode": "I know",
    "transaction.advanced.inputModeRate": "The interest rate",
    "transaction.advanced.inputModeInstallment": "The installment amount",
    "transaction.advanced.system": "Amortization system",
    "transaction.advanced.systemSimple": "Simple (interest on the original amount)",
    "transaction.advanced.systemPrice": "Price (fixed installments)",
    "transaction.advanced.systemSac": "SAC (decreasing installments)",
    "transaction.advanced.rate": "Interest rate (%)",
    "transaction.advanced.ratePeriodMonthly": "Monthly",
    "transaction.advanced.ratePeriodAnnual": "Annual",
    "transaction.advanced.installmentAmount": "Installment amount",
    "transaction.advanced.downPayment": "Down payment",
    "transaction.advanced.fees": "Upfront fees",
    "transaction.advanced.firstPayment": "First installment",
    "transaction.advanced.lastPayment": "Last installment",
    "transaction.advanced.totalInterest": "Total interest",
    "transaction.advanced.totalPayable": "Total payable",
    "transaction.advanced.cet": "CET",
    "transaction.advanced.impliedRate": "Implied rate",
    "transaction.advanced.previewError": "Check the financing values.",
    "transaction.advanced.balanceAlert": "This month's available balance is lower than the part paid from balance. The difference will be covered by your saved total when the month closes.",
    "transaction.advanced.perMonth": "p.m.",
    "transaction.advanced.perYear": "p.y.",
```

Add them to `pt-BR` with the same keys:

```ts
    "transaction.advanced.toggle": "Opções avançadas",
    "transaction.advanced.payWith": "Pagar com",
    "transaction.advanced.fundingBalance": "Saldo disponível",
    "transaction.advanced.fundingSavings": "Total guardado",
    "transaction.advanced.fundingSplit": "Dividir",
    "transaction.advanced.savingsPart": "Do total guardado",
    "transaction.advanced.balancePart": "Do saldo",
    "transaction.advanced.savedTotalHint": "Total guardado disponível",
    "transaction.advanced.interestToggle": "Com juros / financiamento",
    "transaction.advanced.operation": "Operação",
    "transaction.advanced.operationPurchase": "Compra / financiamento",
    "transaction.advanced.operationLoan": "Empréstimo",
    "transaction.advanced.inputMode": "Eu sei",
    "transaction.advanced.inputModeRate": "A taxa de juros",
    "transaction.advanced.inputModeInstallment": "O valor da parcela",
    "transaction.advanced.system": "Sistema de amortização",
    "transaction.advanced.systemSimple": "Simples (juros sobre o valor original)",
    "transaction.advanced.systemPrice": "Price (parcelas fixas)",
    "transaction.advanced.systemSac": "SAC (parcelas decrescentes)",
    "transaction.advanced.rate": "Taxa de juros (%)",
    "transaction.advanced.ratePeriodMonthly": "Ao mês",
    "transaction.advanced.ratePeriodAnnual": "Ao ano",
    "transaction.advanced.installmentAmount": "Valor da parcela",
    "transaction.advanced.downPayment": "Entrada",
    "transaction.advanced.fees": "Tarifas / IOF",
    "transaction.advanced.firstPayment": "Primeira parcela",
    "transaction.advanced.lastPayment": "Última parcela",
    "transaction.advanced.totalInterest": "Total de juros",
    "transaction.advanced.totalPayable": "Total a pagar",
    "transaction.advanced.cet": "CET",
    "transaction.advanced.impliedRate": "Taxa implícita",
    "transaction.advanced.previewError": "Revise os valores do financiamento.",
    "transaction.advanced.balanceAlert": "O saldo disponível do mês é menor que a parte paga pelo saldo. A diferença será coberta pelo total guardado no fechamento do mês.",
    "transaction.advanced.perMonth": "a.m.",
    "transaction.advanced.perYear": "a.a.",
```

If `lib/i18n.tsx` types the dictionaries so that both must have the same keys, `pnpm exec tsc --noEmit` will confirm that they match.

- [ ] **Step 2: Write the failing unit tests** at `tests/dashboard/transaction-advanced-options.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildTransactionSubmitData,
  DEFAULT_ADVANCED_OPTIONS,
  getFirstChargeFromBalance,
  TransactionAdvancedOptions,
  type AdvancedOptionsState,
} from "@/components/dashboard/transaction-advanced-options";
import type { TransactionFormData } from "@/components/dashboard/transaction-form";

const { getFundingContextAction } = vi.hoisted(() => ({
  getFundingContextAction: vi.fn().mockResolvedValue({ totalSaved: 800, availableBalance: 50 }),
}));
vi.mock("@/app/transactions/actions", () => ({ getFundingContextAction }));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatNumber: (value: number) => value.toFixed(2),
    t: (key: string) => key,
  }),
}));

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const formData: TransactionFormData = {
  type: "expense", date: "15/01/2030", amount: 1000, category: "c", paymentMethod: "p",
  installmentCount: 12, description: "Notebook", notes: "",
};
const withInterest: AdvancedOptionsState = {
  ...DEFAULT_ADVANCED_OPTIONS,
  enabled: true,
  interestEnabled: true,
  financing: { ...DEFAULT_ADVANCED_OPTIONS.financing, rate: 2 },
};

describe("buildTransactionSubmitData", () => {
  it("returns the form data untouched when advanced is off or the type is not expense", () => {
    expect(buildTransactionSubmitData(formData, DEFAULT_ADVANCED_OPTIONS)).toBe(formData);
    expect(buildTransactionSubmitData({ ...formData, type: "income" }, withInterest)).toEqual({ ...formData, type: "income" });
  });

  it("maps the funding mode to savingsFundedAmount using the current amount", () => {
    const savings = { ...DEFAULT_ADVANCED_OPTIONS, enabled: true, fundingMode: "savings" as const };
    expect(buildTransactionSubmitData({ ...formData, amount: 700 }, savings).savingsFundedAmount).toBe(700);
    const split = { ...savings, fundingMode: "split" as const, savingsAmount: 5000 };
    expect(buildTransactionSubmitData(formData, split).savingsFundedAmount).toBe(1000);
    expect(buildTransactionSubmitData(formData, { ...savings, fundingMode: "balance" as const })).not.toHaveProperty("savingsFundedAmount");
  });

  it("adds financing only when interest is on, normalizing by mode", () => {
    expect(buildTransactionSubmitData(formData, { ...withInterest, interestEnabled: false })).not.toHaveProperty("financing");
    expect(buildTransactionSubmitData(formData, withInterest).financing).toEqual({
      operationType: "purchase", interestSystem: "price", rateInputMode: "rate", rate: 2,
      ratePeriod: "monthly", downPayment: 0, fees: 0,
    });
    const installment = buildTransactionSubmitData(formData, {
      ...withInterest,
      financing: { ...withInterest.financing, interestSystem: "sac", rateInputMode: "installment", installmentAmount: 95 },
    }).financing;
    expect(installment).toMatchObject({ interestSystem: "price", installmentAmount: 95 });
    expect(installment).not.toHaveProperty("rate");
    const loan = buildTransactionSubmitData(formData, {
      ...withInterest,
      financing: { ...withInterest.financing, operationType: "loan", downPayment: 100 },
    }).financing;
    expect(loan?.downPayment).toBe(0);
  });
});

describe("getFirstChargeFromBalance", () => {
  it("uses the lump sum, the first linear installment or the first financed payment, minus savings", () => {
    expect(getFirstChargeFromBalance(1000, 1, DEFAULT_ADVANCED_OPTIONS)).toBe(1000);
    expect(getFirstChargeFromBalance(1000, 4, DEFAULT_ADVANCED_OPTIONS)).toBe(250);
    expect(getFirstChargeFromBalance(1000, 12, withInterest)).toBe(94.56);
    expect(getFirstChargeFromBalance(1000, 12, { ...withInterest, fundingMode: "split", savingsAmount: 50 })).toBeCloseTo(44.56, 2);
    expect(getFirstChargeFromBalance(1000, 12, { ...withInterest, financing: { ...withInterest.financing, rate: undefined } })).toBe(0);
  });
});

describe("TransactionAdvancedOptions", () => {
  function renderOptions(state: AdvancedOptionsState, onChange = vi.fn()) {
    render(<TransactionAdvancedOptions amount={1000} installmentCount={12} value={state} onChange={onChange} />);
    return onChange;
  }

  it("is collapsed by default and turns on via the switch", async () => {
    const onChange = renderOptions(DEFAULT_ADVANCED_OPTIONS);
    expect(screen.queryByText("transaction.advanced.payWith")).toBeNull();
    await userEvent.click(screen.getByRole("switch", { name: "transaction.advanced.toggle" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it("shows the preview, the saved total and the balance alert when open", async () => {
    renderOptions(withInterest);
    expect(await screen.findByText("$800.00")).toBeTruthy();
    expect(screen.getByText("$94.56")).toBeTruthy();
    expect(screen.getByText("transaction.advanced.balanceAlert")).toBeTruthy();
  });

  it("shows a preview error for invalid financing values", () => {
    renderOptions({ ...withInterest, financing: { ...withInterest.financing, rate: undefined } });
    expect(screen.getByText("transaction.advanced.previewError")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run it to verify that it fails**

Run: `pnpm exec vitest run tests/dashboard/transaction-advanced-options.test.tsx`
Expected: FAIL, because the module is not found.

- [ ] **Step 4: Implement `components/dashboard/transaction-advanced-options.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

import { getFundingContextAction } from "@/app/transactions/actions";
import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  resolveFinancingSchedule,
  type TransactionFinancingInput,
} from "@/lib/finance/financing";
import { useI18n } from "@/lib/i18n";

import type { TransactionFormData } from "./transaction-form";

export type FundingMode = "balance" | "savings" | "split";

export type AdvancedOptionsState = {
  enabled: boolean;
  fundingMode: FundingMode;
  savingsAmount: number;
  interestEnabled: boolean;
  financing: TransactionFinancingInput;
};

export const DEFAULT_ADVANCED_OPTIONS: AdvancedOptionsState = {
  enabled: false,
  fundingMode: "balance",
  savingsAmount: 0,
  interestEnabled: false,
  financing: {
    operationType: "purchase",
    interestSystem: "price",
    rateInputMode: "rate",
    rate: undefined,
    ratePeriod: "monthly",
    installmentAmount: undefined,
    downPayment: 0,
    fees: 0,
  },
};

function resolveSavingsAmount(amount: number, advanced: AdvancedOptionsState) {
  if (advanced.fundingMode === "savings") return amount;
  if (advanced.fundingMode === "split") {
    return Math.min(Math.max(advanced.savingsAmount, 0), amount);
  }
  return 0;
}

function normalizeFinancing(
  financing: TransactionFinancingInput,
): TransactionFinancingInput {
  const isInstallmentMode = financing.rateInputMode === "installment";
  const { rate, installmentAmount, ...rest } = financing;

  return {
    ...rest,
    interestSystem: isInstallmentMode ? "price" : financing.interestSystem,
    downPayment: financing.operationType === "loan" ? 0 : financing.downPayment,
    ...(isInstallmentMode ? { installmentAmount } : { rate }),
  };
}

// The action schema is .strict(): keys are only added when the user opted in,
// so a plain submission stays exactly as before.
export function buildTransactionSubmitData(
  formData: TransactionFormData,
  advanced: AdvancedOptionsState,
): TransactionFormData {
  if (!advanced.enabled || formData.type !== "expense") return formData;

  const savingsFundedAmount = resolveSavingsAmount(formData.amount, advanced);

  return {
    ...formData,
    ...(savingsFundedAmount > 0 ? { savingsFundedAmount } : {}),
    ...(advanced.interestEnabled
      ? { financing: normalizeFinancing(advanced.financing) }
      : {}),
  };
}

function tryResolvePreview(
  amount: number,
  installmentCount: number,
  advanced: AdvancedOptionsState,
) {
  try {
    return resolveFinancingSchedule({
      principal: amount,
      installmentCount,
      financing: normalizeFinancing(advanced.financing),
    });
  } catch {
    return null;
  }
}

export function getFirstChargeFromBalance(
  amount: number,
  installmentCount: number,
  advanced: AdvancedOptionsState,
) {
  const preview = advanced.interestEnabled
    ? tryResolvePreview(amount, installmentCount, advanced)
    : null;
  const firstCharge = advanced.interestEnabled
    ? (preview?.schedule.rows[0]?.payment ?? 0)
    : amount / installmentCount;
  const savings = resolveSavingsAmount(amount, advanced);

  return Math.max(firstCharge - Math.min(savings, firstCharge), 0);
}

type Props = {
  readonly amount: number;
  readonly installmentCount: number;
  readonly value: AdvancedOptionsState;
  readonly onChange: (value: AdvancedOptionsState) => void;
};

function useFundingContext(enabled: boolean) {
  const [context, setContext] = useState<{
    availableBalance: number;
    totalSaved: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled || context) return;
    getFundingContextAction()
      .then(setContext)
      .catch(() => setContext(null));
  }, [enabled, context]);

  return context;
}

const SECTION_LABEL_CLASS =
  "mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground";

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch
        id={id}
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: { value: T; label: string }[];
  readonly onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className={SECTION_LABEL_CLASS}>{label}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        className="w-full"
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as T);
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function FinancingFields({ value, onChange }: Pick<Props, "value" | "onChange">) {
  const { t } = useI18n();
  const financing = value.financing;
  const setFinancing = (patch: Partial<TransactionFinancingInput>) =>
    onChange({ ...value, financing: { ...financing, ...patch } });
  const isInstallmentMode = financing.rateInputMode === "installment";

  return (
    <div className="flex flex-col gap-4">
      <ChoiceGroup
        label={t("transaction.advanced.operation")}
        value={financing.operationType}
        onChange={(operationType) => setFinancing({ operationType })}
        options={[
          { value: "purchase", label: t("transaction.advanced.operationPurchase") },
          { value: "loan", label: t("transaction.advanced.operationLoan") },
        ]}
      />
      <ChoiceGroup
        label={t("transaction.advanced.inputMode")}
        value={financing.rateInputMode}
        onChange={(rateInputMode) => setFinancing({ rateInputMode })}
        options={[
          { value: "rate", label: t("transaction.advanced.inputModeRate") },
          { value: "installment", label: t("transaction.advanced.inputModeInstallment") },
        ]}
      />
      {isInstallmentMode ? (
        <CurrencyInput
          id="financing-installment"
          label={t("transaction.advanced.installmentAmount")}
          value={financing.installmentAmount ?? 0}
          onValueChange={(installmentAmount) => setFinancing({ installmentAmount })}
        />
      ) : (
        <>
          <ChoiceGroup
            label={t("transaction.advanced.system")}
            value={financing.interestSystem}
            onChange={(interestSystem) => setFinancing({ interestSystem })}
            options={[
              { value: "simple", label: t("transaction.advanced.systemSimple") },
              { value: "price", label: t("transaction.advanced.systemPrice") },
              { value: "sac", label: t("transaction.advanced.systemSac") },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="financing-rate" className={SECTION_LABEL_CLASS}>
                {t("transaction.advanced.rate")}
              </Label>
              <Input
                id="financing-rate"
                type="number"
                inputMode="decimal"
                min={0}
                max={1000}
                step="0.01"
                value={financing.rate ?? ""}
                onChange={(event) =>
                  setFinancing({
                    rate: event.target.value === "" ? undefined : Number(event.target.value),
                  })
                }
              />
            </div>
            <ChoiceGroup
              label=" "
              value={financing.ratePeriod}
              onChange={(ratePeriod) => setFinancing({ ratePeriod })}
              options={[
                { value: "monthly", label: t("transaction.advanced.ratePeriodMonthly") },
                { value: "annual", label: t("transaction.advanced.ratePeriodAnnual") },
              ]}
            />
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        {financing.operationType === "purchase" ? (
          <CurrencyInput
            id="financing-down-payment"
            label={t("transaction.advanced.downPayment")}
            value={financing.downPayment}
            onValueChange={(downPayment) => setFinancing({ downPayment })}
          />
        ) : null}
        <CurrencyInput
          id="financing-fees"
          label={t("transaction.advanced.fees")}
          value={financing.fees}
          onValueChange={(fees) => setFinancing({ fees })}
        />
      </div>
    </div>
  );
}

function FinancingPreview({ amount, installmentCount, value }: Omit<Props, "onChange">) {
  const { t, formatCurrency, formatNumber } = useI18n();
  const preview = tryResolvePreview(amount, installmentCount, value);

  if (!preview) {
    return <p className="text-xs text-destructive">{t("transaction.advanced.previewError")}</p>;
  }

  const rows = preview.schedule.rows;
  const percent = (rate: number) => `${formatNumber(rate * 100)}%`;
  const items: [string, string][] = [
    [t("transaction.advanced.firstPayment"), formatCurrency(rows[0].payment)],
    [t("transaction.advanced.lastPayment"), formatCurrency(rows[rows.length - 1].payment)],
    [t("transaction.advanced.totalInterest"), formatCurrency(preview.schedule.totals.interest)],
    [t("transaction.advanced.totalPayable"), formatCurrency(preview.schedule.totals.payable)],
    [
      t("transaction.advanced.cet"),
      `${percent(preview.cet.monthly)} ${t("transaction.advanced.perMonth")} · ${percent(preview.cet.annual)} ${t("transaction.advanced.perYear")}`,
    ],
  ];

  if (value.financing.rateInputMode === "installment") {
    items.push([
      t("transaction.advanced.impliedRate"),
      `${percent(preview.monthlyRate)} ${t("transaction.advanced.perMonth")}`,
    ]);
  }

  return (
    <dl className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 p-3 text-xs">
      {items.map(([label, text]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-semibold tabular-nums">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TransactionAdvancedOptions({
  amount,
  installmentCount,
  value,
  onChange,
}: Props) {
  const { t, formatCurrency } = useI18n();
  const context = useFundingContext(value.enabled);
  const firstCharge = getFirstChargeFromBalance(amount, installmentCount, value);

  return (
    <Collapsible open={value.enabled} className="flex flex-col gap-4 rounded-xl border border-border/40 p-4">
      <ToggleRow
        id="advanced-options"
        label={t("transaction.advanced.toggle")}
        checked={value.enabled}
        onCheckedChange={(enabled) => onChange({ ...value, enabled })}
      />
      <CollapsibleContent className="flex flex-col gap-4">
        <ChoiceGroup
          label={t("transaction.advanced.payWith")}
          value={value.fundingMode}
          onChange={(fundingMode) => onChange({ ...value, fundingMode })}
          options={[
            { value: "balance", label: t("transaction.advanced.fundingBalance") },
            { value: "savings", label: t("transaction.advanced.fundingSavings") },
            { value: "split", label: t("transaction.advanced.fundingSplit") },
          ]}
        />
        {context ? (
          <p className="text-xs text-muted-foreground">
            {t("transaction.advanced.savedTotalHint")}: <span>{formatCurrency(context.totalSaved)}</span>
          </p>
        ) : null}
        {value.fundingMode === "split" ? (
          <div className="grid grid-cols-2 gap-3 items-end">
            <CurrencyInput
              id="funding-savings-part"
              label={t("transaction.advanced.savingsPart")}
              value={value.savingsAmount}
              onValueChange={(savingsAmount) => onChange({ ...value, savingsAmount })}
            />
            <p className="text-xs text-muted-foreground">
              {t("transaction.advanced.balancePart")}:{" "}
              {formatCurrency(Math.max(amount - value.savingsAmount, 0))}
            </p>
          </div>
        ) : null}
        <ToggleRow
          id="advanced-interest"
          label={t("transaction.advanced.interestToggle")}
          checked={value.interestEnabled}
          onCheckedChange={(interestEnabled) => onChange({ ...value, interestEnabled })}
        />
        {value.interestEnabled ? (
          <>
            <FinancingFields value={value} onChange={onChange} />
            <FinancingPreview amount={amount} installmentCount={installmentCount} value={value} />
          </>
        ) : null}
        {context && firstCharge > context.availableBalance ? (
          <Alert>
            <AlertDescription>{t("transaction.advanced.balanceAlert")}</AlertDescription>
          </Alert>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

Two cases in `getFirstChargeFromBalance` need care. With a lump sum, `installmentCount` is 1, so `amount / 1` is the amount. With linear installments, the first charge is `amount / count`. The test expects `250` for `1000 / 4`.

The saved-total hint is split across two nodes (`: ` and a `<span>`), so that `findByText("$800.00")` matches the span.

- [ ] **Step 5: Wire the component into `transaction-form.tsx`**
  1. Extend `TransactionFormData` with `savingsFundedAmount?: number;` and `financing?: TransactionFinancingInput;`. Import the type from `@/lib/finance/financing`.
  2. In `useTransactionFormBaseState`, add `const [advanced, setAdvanced] = useState<AdvancedOptionsState>(DEFAULT_ADVANCED_OPTIONS);` and return `advanced` and `setAdvanced`.
  3. In `useTransactionFormSubmitHandlers`, add the `advanced` and `setAdvanced` params. Call `await onSubmit(buildTransactionSubmitData(formData, advanced));`, and inside `resetForm` also call `setAdvanced(DEFAULT_ADVANCED_OPTIONS);`. Pass both through from `useTransactionFormHandlers` (`base.advanced` and `base.setAdvanced`).
  4. In `usePaymentMethodInstallmentEligibility`, accept `advanced` and compute:

     ```ts
     const interestOn = advanced.enabled && advanced.interestEnabled;
     const canInstallment =
       formData.type === "expense" &&
       (interestOn || canUseInstallments(selectedPaymentMethod, selectedPaymentMethodLabel));
     ```

     In `handlePaymentMethodChange`, keep the count when `interestOn` is true: `installmentCount: nextCanInstallment || interestOn ? formData.installmentCount : 1`.
  5. In `TransactionFormView`, render the section after `<TransactionDateAndInstallments …/>`, for expenses only:

     ```tsx
     {formData.type === "expense" ? (
       <TransactionAdvancedOptions
         amount={formData.amount}
         installmentCount={formData.installmentCount}
         value={props.advanced}
         onChange={props.setAdvanced}
       />
     ) : null}
     ```

- [ ] **Step 6: Map the new fields in `transactions-screen.tsx`.** `buildNewTransactionInput` becomes:

```ts
function buildNewTransactionInput(
  data: TransactionFormData,
): NewTransactionInput {
  return {
    amount: data.amount,
    category: data.category === "none" ? "" : data.category,
    date: data.date,
    description: data.description.trim(),
    installmentCount: data.installmentCount,
    notes: data.notes?.trim() || undefined,
    paymentMethod: data.paymentMethod === "none" ? "" : data.paymentMethod,
    type: data.type,
    ...(data.savingsFundedAmount ? { savingsFundedAmount: data.savingsFundedAmount } : {}),
    ...(data.financing ? { financing: data.financing } : {}),
  };
}
```

- [ ] **Step 7: Add the form integration tests.** Append to `tests/dashboard/transaction-form.test.tsx`, and add at the top `vi.mock("@/app/transactions/actions", () => ({ getFundingContextAction: vi.fn().mockResolvedValue({ totalSaved: 5000, availableBalance: 5000 }) }));`:

```tsx
describe("advanced options", () => {
  it("is hidden by default and does not change the plain payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TransactionForm {...baseProps({ onSubmit })} />);
    expect(screen.queryByText("transaction.advanced.payWith")).toBeNull();
    fillRequiredFields();
    submit();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("financing");
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("savingsFundedAmount");
  });

  it("submits a savings-funded expense", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TransactionForm {...baseProps({ onSubmit })} />);
    fillRequiredFields();
    await userEvent.click(screen.getByRole("switch", { name: "transaction.advanced.toggle" }));
    await userEvent.click(screen.getByRole("radio", { name: "transaction.advanced.fundingSavings" }));
    submit();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ amount: 100, savingsFundedAmount: 100 });
  });

  it("enables the installment count on a debit method when interest is on, and submits financing", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TransactionForm {...baseProps({ onSubmit })} />);
    fillRequiredFields();
    expect(screen.queryByText("Installments")).toBeNull();
    await userEvent.click(screen.getByRole("switch", { name: "transaction.advanced.toggle" }));
    await userEvent.click(screen.getByRole("switch", { name: "transaction.advanced.interestToggle" }));
    expect(screen.getByText("Installments")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("transaction.advanced.rate"), { target: { value: "2" } });
    submit();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].financing).toMatchObject({ rate: 2, rateInputMode: "rate" });
  });
});
```

Radix `ToggleGroup type="single"` items render with `role="radio"`. If the installed version renders `role="button"` with `aria-pressed`, query by `getByRole("button", { name })` instead.

- [ ] **Step 8: Run the tests**

Run: `pnpm exec vitest run tests/dashboard/`
Expected: every dashboard test passes, including the untouched "submits the expected payload" test, which pins the plain payload.

- [ ] **Step 9: Checkpoint (no commit)**: `git diff --stat`

---

### Task 8: The financing breakdown in the details dialog

**Files:**
- Create: `components/dashboard/financing-breakdown.tsx`
- Modify: `components/dashboard/transactions-screen.tsx`, specifically `TransactionDetailsDialogMainContent` (~1891)
- Modify: `lib/i18n.tsx` (keys in `en` and in `pt-BR`)
- Test: `tests/dashboard/financing-breakdown.test.tsx`

**Interfaces:**
- Consumes: `getFinancingBreakdownAction(planId)` (Task 6), `type FinancingBreakdown` (Task 5), and `Transaction.financingGroupId` (Task 3)
- Produces: `<FinancingBreakdown planId={string} />`

- [ ] **Step 1: Add the i18n keys.** Add them to `en`:

```ts
    "financing.title": "Financing",
    "financing.loading": "Loading financing…",
    "financing.error": "Could not load the financing details.",
    "financing.principal": "Principal",
    "financing.outstanding": "Outstanding balance",
    "financing.fromSavings": "Paid from savings",
    "financing.rate": "Rate",
    "financing.equivalentMonthly": "Equivalent monthly rate",
    "financing.paid": "Paid",
    "financing.table.number": "#",
    "financing.table.date": "Date",
    "financing.table.payment": "Installment",
    "financing.table.principal": "Amortization",
    "financing.table.interest": "Interest",
    "financing.table.savings": "From savings",
    "financing.table.balance": "Balance",
    "financing.table.downPayment": "Down payment",
```

Add them to `pt-BR`:

```ts
    "financing.title": "Financiamento",
    "financing.loading": "Carregando financiamento…",
    "financing.error": "Não foi possível carregar o financiamento.",
    "financing.principal": "Valor principal",
    "financing.outstanding": "Saldo devedor",
    "financing.fromSavings": "Pago do guardado",
    "financing.rate": "Taxa",
    "financing.equivalentMonthly": "Taxa mensal equivalente",
    "financing.paid": "Pago",
    "financing.table.number": "Nº",
    "financing.table.date": "Data",
    "financing.table.payment": "Parcela",
    "financing.table.principal": "Amortização",
    "financing.table.interest": "Juros",
    "financing.table.savings": "Do guardado",
    "financing.table.balance": "Saldo",
    "financing.table.downPayment": "Entrada",
```

- [ ] **Step 2: Write the failing test** at `tests/dashboard/financing-breakdown.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FinancingBreakdown } from "@/components/dashboard/financing-breakdown";
import { buildFinancingBreakdown } from "@/lib/finance/financing";

const { getFinancingBreakdownAction } = vi.hoisted(() => ({ getFinancingBreakdownAction: vi.fn() }));
vi.mock("@/app/transactions/actions", () => ({ getFinancingBreakdownAction }));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatDate: (value: string) => value,
    formatNumber: (value: number) => value.toFixed(2),
    t: (key: string) => key,
  }),
}));

const PLAN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const breakdown = buildFinancingBreakdown(
  {
    operationType: "purchase", interestSystem: "price", rateInputMode: "rate", rate: 12,
    ratePeriod: "annual", principal: 1000, downPayment: 0, fees: 0, installmentCount: 1,
    savingsFundedAmount: 0,
  },
  [{ id: "r1", date: "2030-01-15", amount: 1009.49, kind: "expense", installmentNumber: 1, principalPortion: 1000, interestPortion: 9.49, savingsFundedAmount: 0 }],
  "2029-12-31",
);

describe("FinancingBreakdown", () => {
  it("renders totals, rates and the schedule", async () => {
    getFinancingBreakdownAction.mockResolvedValue(breakdown);
    render(<FinancingBreakdown planId={PLAN_ID} />);
    expect(await screen.findByText("financing.title")).toBeTruthy();
    expect(getFinancingBreakdownAction).toHaveBeenCalledWith(PLAN_ID);
    expect(screen.getAllByText("$1009.49").length).toBeGreaterThan(0);
    expect(screen.getByText("financing.equivalentMonthly")).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("renders nothing for a foreign or missing plan", async () => {
    getFinancingBreakdownAction.mockResolvedValue(null);
    const { container } = render(<FinancingBreakdown planId={PLAN_ID} />);
    await vi.waitFor(() => expect(container.textContent).toBe(""));
  });

  it("shows an error message when loading fails", async () => {
    getFinancingBreakdownAction.mockRejectedValue(new Error("boom"));
    render(<FinancingBreakdown planId={PLAN_ID} />);
    expect(await screen.findByText("financing.error")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run it to verify that it fails**

Run: `pnpm exec vitest run tests/dashboard/financing-breakdown.test.tsx`
Expected: FAIL, because the module is not found.

- [ ] **Step 4: Implement `components/dashboard/financing-breakdown.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

import { getFinancingBreakdownAction } from "@/app/transactions/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FinancingBreakdown as Breakdown } from "@/lib/finance/financing";
import { useI18n } from "@/lib/i18n";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; breakdown: Breakdown | null };

export function FinancingBreakdown({ planId }: { readonly planId: string }) {
  const { t, formatCurrency, formatDate, formatNumber } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getFinancingBreakdownAction(planId)
      .then((breakdown) => active && setState({ status: "ready", breakdown }))
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, [planId]);

  if (state.status === "loading") {
    return <p className="text-xs text-muted-foreground">{t("financing.loading")}</p>;
  }
  if (state.status === "error") {
    return <p className="text-xs text-destructive">{t("financing.error")}</p>;
  }
  if (!state.breakdown) return null;

  const { plan, monthlyRate, cet, totals, rows, outstanding } = state.breakdown;
  const percent = (rate: number) => `${formatNumber(rate * 100)}%`;
  const perMonth = t("transaction.advanced.perMonth");
  const perYear = t("transaction.advanced.perYear");
  const enteredRate = `${formatNumber(plan.rate)}% ${plan.ratePeriod === "annual" ? perYear : perMonth}`;
  const cards: [string, string][] = [
    [t("financing.principal"), formatCurrency(totals.principal)],
    [t("transaction.advanced.downPayment"), formatCurrency(totals.downPayment)],
    [t("transaction.advanced.fees"), formatCurrency(totals.fees)],
    [t("transaction.advanced.totalInterest"), formatCurrency(totals.interest)],
    [t("transaction.advanced.totalPayable"), formatCurrency(totals.payable)],
    [t("financing.outstanding"), formatCurrency(outstanding.total)],
    [t("financing.fromSavings"), formatCurrency(totals.savingsFunded)],
    [t("financing.rate"), enteredRate],
    [
      t("transaction.advanced.cet"),
      `${percent(cet.monthly)} ${perMonth} · ${percent(cet.annual)} ${perYear}`,
    ],
  ];

  if (plan.ratePeriod === "annual") {
    cards.push([t("financing.equivalentMonthly"), `${percent(monthlyRate)} ${perMonth}`]);
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{t("financing.title")}</h3>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/40 p-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="max-h-72 overflow-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>{t("financing.table.number")}</TableHead>
              <TableHead>{t("financing.table.date")}</TableHead>
              <TableHead>{t("financing.table.payment")}</TableHead>
              <TableHead>{t("financing.table.principal")}</TableHead>
              <TableHead>{t("financing.table.interest")}</TableHead>
              <TableHead>{t("financing.table.savings")}</TableHead>
              <TableHead>{t("financing.table.balance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={row.isPaid ? "text-muted-foreground" : undefined}>
                <TableCell>
                  {row.number ?? t("financing.table.downPayment")}
                  {row.isPaid ? ` · ${t("financing.paid")}` : ""}
                </TableCell>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(row.payment)}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(row.principal)}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(row.interest)}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(row.savingsFunded)}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(row.balanceAfter)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
```

Check what `useI18n().formatDate` accepts in `lib/i18n.tsx` (~line 1337). If it needs a `Date`, pass `new Date(`${row.date}T00:00:00`)`.

- [ ] **Step 5: Wire it into the dialog.** In `components/dashboard/transactions-screen.tsx`, import `FinancingBreakdown` from `./financing-breakdown`. Inside `TransactionDetailsDialogMainContent`, add this before the edit form:

```tsx
      {selectedTransaction?.financingGroupId ? (
        <FinancingBreakdown planId={selectedTransaction.financingGroupId} />
      ) : null}
```

The existing `tests/dashboard/transactions-screen-details.test.tsx` uses transactions without `financingGroupId`, so it is unaffected.

- [ ] **Step 6: Run the tests**

Run: `pnpm exec vitest run tests/dashboard/`
Expected: all of them pass.

- [ ] **Step 7: Checkpoint (no commit)**: `git diff --stat`

---

### Task 9: Documentation

**Files:**
- Rewrite: `docs/decisions/interest-bearing-debt-architecture.md`
- Modify: `docs/architecture.md` ("Finance model", ~line 31)
- Modify: `docs/database.md` (tables list, migrations list, transaction fields, functions)

- [ ] **Step 1: Rewrite `docs/decisions/interest-bearing-debt-architecture.md`.** Read the current file first, keeping its title style. Replace the body with these sections, written out in full prose:
  - **Status**: implemented, first delivery of #63.
  - **Supported models**: Simple (`F·i` per month, principal `F/n`), Price (`PMT = F·i/(1−(1+i)^−n)`), SAC (principal `F/n`, interest on the balance), the implied rate from the installment amount (Newton-Raphson, Price only), and i = 0 as linear division.
  - **Rate conversion**: monthly = r; annual simple = r/12; annual compound = (1+r)^(1/12) − 1.
  - **Down payment and fees**: financed = principal − down + fees. A loan has no down payment, and it produces an income row for the principal.
  - **CET**: the IRR of +(principal − down) at t0 against the installments. Reported monthly and annualized as (1+m)^12 − 1.
  - **Rounding**: per cent, per row. The last row absorbs the residue and closes at 0.00.
  - **First installment date rule**: the purchase date, unless it is a loan or has a down payment, in which case it is the date plus one month.
  - **Savings funding**: `savings_funded_amount` per row, consumed earliest first. It reduces the saved total instead of the month's balance, and it is independent of interest. Migration 004's automatic deficit coverage still applies to the balance-funded part.
  - **Data model**: `financing_plans` (immutable; RLS select/insert/delete) and `transactions.financing_plan_id` (on delete cascade), `principal_portion`, `interest_portion`, `savings_funded_amount`. Explain why `installment_group_id` alone was not enough (the 005 consistency check).
  - **Limitations and next steps**: payment status and overdue debt, late interest, penalties and rollover; prepayment discounts (advancing keeps full amounts); American, SAM and post-fixed rates; intermediate or balloon payments.

  Remove every mention of `debt_schedules`.

- [ ] **Step 2: Update `docs/architecture.md`.** Append to the "Finance model" list:

```md
- Expenses can carry interest (Simple, Price, SAC, or a rate implied by the installment amount), a down payment, fees, or be a loan. Each financed operation stores one immutable `financing_plans` row plus its transaction rows with principal/interest portions; calculations live in `lib/finance/financing.ts`. See [interest-bearing debt architecture](decisions/interest-bearing-debt-architecture.md).
- Any expense can be funded fully or partly from the saved total (`savings_funded_amount`), which lowers the saved total instead of the month's available balance.
```

- [ ] **Step 3: Update `docs/database.md`**
  - Add `financing_plans` to "Current tables".
  - Under "Current migrations", add: ``- `011_add_financing_plans.sql`: adds immutable, RLS-scoped `financing_plans`, the transaction columns `financing_plan_id` (on delete cascade), `principal_portion`, `interest_portion`, `savings_funded_amount`, extends the owner-refs trigger to financing plans, and makes `calculate_total_saved` take savings-funded expenses from the saved total.``
  - Add these to "Transaction fields used by the app": `financing_plan_id`, `principal_portion`, `interest_portion`, and `savings_funded_amount`. Follow the list with one paragraph: financed rows share `financing_plan_id`, installment rows also use it as `installment_group_id`, the down-payment and loan-income rows have no installment number, and `savings_funded_amount` is the part paid from the saved total, which is always ≤ `amount`.
  - Under "Database functions and triggers", add financing plans to the `validate_transaction_owner_refs` line.

- [ ] **Step 4: Checkpoint (no commit)**: `git diff --stat docs/`

---

### Task 10: Full verification

- [ ] **Step 1: Lint**

Run: `pnpm run lint`
Expected: 0 errors. Fix the real issues (such as unused vars, complexity or sonarjs findings) by changing the code, never by suppressing them. Per project memory, NOSONAR does not silence eslint-plugin-sonarjs.

- [ ] **Step 2: Tests with coverage gates**

Run: `pnpm run test:coverage > /tmp/claude-1000/-home-felipe-dev-Documents-programms-Dragg/04c2a05f-a42a-4264-b7b5-04ff4f8f624a/scratchpad/coverage.log 2>&1; tail -40 /tmp/claude-1000/-home-felipe-dev-Documents-programms-Dragg/04c2a05f-a42a-4264-b7b5-04ff4f8f624a/scratchpad/coverage.log`
Expected: all tests pass and every included file shows 100/100/100/100. Close any gap with a test.

- [ ] **Step 3: Type check and build**

Run: `pnpm run build`
Expected: the build succeeds.

- [ ] **Step 4: Re-run the migration from scratch locally**

Run: `supabase db reset --local && docker exec -i supabase_db_Dragg psql -U postgres -v ON_ERROR_STOP=1 < scratchpad/financing-check.sql`
Expected: 001→011 applied from zero, with no error, and every assertion passes. Optionally, `pnpm run e2e` (the user's script, which uses the local stack) exercises the app on top of the new migration.

- [ ] **Step 5: Final state (no commit)**

Run: `git status --short && git diff --stat`
Expected: only the files listed in this plan are changed or new. `package.json` and `scripts/e2e-local-supabase.sh` are still the user's own untouched changes. Nothing is staged or committed.

---

### Task 11: Apply to production (only with the user's explicit OK)

- [ ] **Step 1: Stop and ask.** Show the user the SQL of 011 and the result of Task 10 Step 4, and wait for "pode aplicar". Without it, the task ends here and the migration stays local-only.
- [ ] **Step 2: Check production's current state.** Run `list_migrations` on `xmchbjntitcwwjetxwug`. Expected: 001–010 are applied and 011 is not. If anything diverges, stop and report it.
- [ ] **Step 3: Apply.** Use `apply_migration` (`project_id: xmchbjntitcwwjetxwug`, `name: add_financing_plans`, `query` set to the file contents). The migration is additive (new columns have defaults, and the table is new), so it does not break the code currently in production. It must go in **before** the deploy of this code, because the new inserts send columns that only exist after 011.
- [ ] **Step 4: Check.** Run `get_advisors` (security) with no new warnings, and `execute_sql`: `select count(*) from financing_plans;` → 0, with no error.

