import { describe, expect, it } from "vitest";

import {
  allocateSavingsFunding,
  buildAmortization,
  getAccrual,
  buildFinancingBreakdown,
  buildFinancingSchedule,
  computeCet,
  FinancingError,
  resolveFinancingSchedule,
  solveImpliedMonthlyRate,
  toMonthlyRate,
  type FinancingPlanRecord,
  type FinancingRowRecord,
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
    expect(toMonthlyRate(2, "monthly", "sac")).toBeCloseTo(0.02, 10);
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
    expect(schedule.rows[0].payment).toBeCloseTo(80.38, 10);
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
  it("takes the same share of every row, the last one absorbing the residue", () => {
    expect(allocateSavingsFunding([100, 94.56, 94.56], 150)).toEqual([51.88, 49.06, 49.06]);
    expect(allocateSavingsFunding([100, 100, 100], 100)).toEqual([33.33, 33.33, 33.34]);
    expect(allocateSavingsFunding([120, 80], 200)).toEqual([120, 80]);
  });

  it("returns zeros for no savings", () => {
    expect(allocateSavingsFunding([10, 20], 0)).toEqual([0, 0]);
    expect(allocateSavingsFunding([0], 0)).toEqual([0]);
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
    expect(result.monthlyRate).toBeCloseTo(0.02, 10);
    expect(result.system).toBe("price");
    expect(result.schedule.rows[0].payment).toBeCloseTo(94.56, 10);
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
    expect(result.schedule.rows[0].payment).toBeCloseTo(94.56, 10);
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
    expect(result.monthlyRate).toBeCloseTo(0.02, 10);
    expect(result.totals).toEqual({ principal: 1000, downPayment: 200, fees: 0, interest: 24.08, payable: 1024.24, savingsFunded: 50 });
    expect(result.outstanding).toEqual({ principal: 404.04, interest: 8.08, total: 412.12 });
    expect(result.cet.monthly).toBeGreaterThan(0);
  });

  it("treats missing portions as principal", () => {
    const result = buildFinancingBreakdown(plan, [{ ...rows[2], principalPortion: null, interestPortion: null }], "2030-01-01");
    expect(result.rows[0]).toMatchObject({ principal: 412.12, interest: 0 });
  });

  it("orders same-date rows by installment number, down payment first", () => {
    const sameDay = [
      { ...rows[2], date: "2030-01-15" },
      { ...rows[1], installmentNumber: null },
    ];
    const result = buildFinancingBreakdown(plan, sameDay, "2030-01-01");
    expect(result.rows.map((row) => row.id)).toEqual(["d", "i1"]);
    const reversed = buildFinancingBreakdown(plan, [...sameDay].reverse(), "2030-01-01");
    expect(reversed.rows.map((row) => row.id)).toEqual(["d", "i1"]);
  });

  it("handles a partially deleted group", () => {
    const result = buildFinancingBreakdown(plan, [rows[0]], "2030-01-01");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].balanceAfter).toBeCloseTo(395.96, 10);
  });
});

describe("buildAmortization", () => {
  const plan: FinancingPlanRecord = {
    operationType: "purchase", interestSystem: "price", rateInputMode: "rate",
    rate: 2, ratePeriod: "monthly", principal: 1000, downPayment: 0, fees: 0,
    installmentCount: 4, savingsFundedAmount: 0,
  };
  const installments = { count: 3, next: { payment: 280, principal: 264 } };
  const run = (overrides: Partial<Parameters<typeof buildAmortization>[0]> = {}) =>
    buildAmortization({ plan, outstandingPrincipal: 800, accruedInterest: 0, elapsedDays: 0, amount: 300, mode: "installment", installments, ...overrides });

  it("reshapes the remaining installments over the reduced principal", () => {
    const { rows, principal, interest } = run();
    expect([principal, interest]).toEqual([300, 0]);
    expect(rows).toHaveLength(3);
    expect(rows.reduce((sum, row) => sum + row.principal, 0)).toBeCloseTo(500, 2);
    expect(rows[0].interest).toBeCloseTo(10, 2);
    expect(rows.at(-1)?.balanceAfter).toBeCloseTo(0, 2);
  });

  it("pays the accrued interest before the principal", () => {
    const { rows, principal, interest } = run({ accruedInterest: 20 });
    expect([principal, interest]).toEqual([280, 20]);
    expect(rows.reduce((sum, row) => sum + row.principal, 0)).toBeCloseTo(520, 2);
  });

  it("does not charge the elapsed days twice: payments discount to the balance", () => {
    const rate = 0.02;
    const { rows } = run({ accruedInterest: 20, elapsedDays: 15, outstandingPrincipal: 10_020, amount: 3020 });
    // The first installment falls half a period from today.
    const present = rows.reduce((sum, row, index) => sum + row.payment / (1 + rate) ** (0.5 + index), 0);
    expect(present).toBeCloseTo(7020, 0);
    expect(rows[0].interest).toBeCloseTo(7020 * rate * 0.5, 1);
  });

  it("charges flat interest on the stub period for the simple system", () => {
    const simple = { ...plan, interestSystem: "simple" as const };
    const { rows } = run({ plan: simple, elapsedDays: 15 });
    expect(rows[0].interest).toBeCloseTo(5, 2);
    expect(rows[1].interest).toBeCloseTo(10, 2);
  });

  it("shortens the term, keeping about the same price payment", () => {
    const { rows } = run({ mode: "term", installments: { count: 12, next: { payment: 100, principal: 84 } }, outstandingPrincipal: 1000, amount: 500 });
    expect(rows).toHaveLength(6);
    expect(rows[0].payment).toBeLessThanOrEqual(100);
  });

  it("shortens linear systems by the old principal portion", () => {
    const sac = { ...plan, interestSystem: "sac" as const };
    const { rows } = run({ plan: sac, mode: "term", installments: { count: 8, next: { payment: 120, principal: 100 } }, outstandingPrincipal: 800, amount: 300 });
    expect(rows).toHaveLength(5);
  });

  it("handles a zero rate and never exceeds the current term", () => {
    const free = { ...plan, rate: 0 };
    expect(run({ plan: free, mode: "term", installments: { count: 8, next: { payment: 100, principal: 100 } }, amount: 300 }).rows).toHaveLength(5);
    expect(run({ mode: "term", installments: { count: 2, next: { payment: 280, principal: 264 } } }).rows).toHaveLength(2);
  });

  it("keeps the current term when the payment cannot pay the interest", () => {
    expect(run({ mode: "term", installments: { count: 3, next: { payment: 1, principal: 1 } } }).rows).toHaveLength(3);
  });

  it("returns no installments when the whole principal is paid", () => {
    expect(run({ amount: 800 }).rows).toEqual([]);
  });

  it.each([0, -5, Number.NaN, 800.5])("rejects amount %s", (amount) => {
    expectCode(() => run({ amount }), "invalid_amortization");
  });

  it("rejects an amount that only covers the accrued interest", () => {
    expectCode(() => run({ amount: 20, accruedInterest: 20 }), "invalid_amortization");
  });
});

describe("getAccrual", () => {
  const plan: FinancingPlanRecord = {
    operationType: "purchase", interestSystem: "price", rateInputMode: "rate",
    rate: 2, ratePeriod: "monthly", principal: 1000, downPayment: 0, fees: 0,
    installmentCount: 2, savingsFundedAmount: 0,
  };
  const row = (id: string, date: string, number: number | null, extra: Partial<FinancingRowRecord> = {}): FinancingRowRecord => ({
    id, date, amount: 500, kind: "expense", installmentNumber: number, principalPortion: 500, interestPortion: 0, savingsFundedAmount: 0, ...extra,
  });

  it("compounds over the days since the last paid installment", () => {
    const breakdown = buildFinancingBreakdown(plan, [row("a", "2030-01-15", 1), row("b", "2030-02-15", 2)], "2030-01-30");
    expect(getAccrual(breakdown, "2030-01-30")).toEqual({ days: 15, interest: 4.98 });
  });

  it("is linear for simple interest and capped at one period", () => {
    const simple = buildFinancingBreakdown({ ...plan, interestSystem: "simple" }, [row("a", "2030-01-15", 1), row("b", "2030-06-15", 2)], "2030-03-01");
    expect(getAccrual(simple, "2030-03-01")).toEqual({ days: 30, interest: 10 });
    const sameDay = buildFinancingBreakdown({ ...plan, interestSystem: "simple" }, [row("a", "2030-01-15", 1), row("b", "2030-06-15", 2)], "2030-01-15");
    expect(getAccrual(sameDay, "2030-01-15").interest).toBe(0);
  });

  it("starts from the operation date when nothing was paid and restarts after an amortization", () => {
    const early = buildFinancingBreakdown(plan, [row("inc", "2030-01-01", null, { kind: "income" }), row("a", "2030-02-01", 1)], "2030-01-16");
    expect(getAccrual(early, "2030-01-16").interest).toBeCloseTo(4.98, 2);
    const after = buildFinancingBreakdown(plan, [row("a", "2030-01-15", 1), row("am", "2030-01-30", null, { isAmortization: true }), row("b", "2030-03-15", 2)], "2030-01-30");
    expect(getAccrual(after, "2030-01-30").interest).toBe(0);
  });
});

describe("buildFinancingBreakdown — amortization", () => {
  const plan: FinancingPlanRecord = {
    operationType: "purchase", interestSystem: "price", rateInputMode: "rate",
    rate: 2, ratePeriod: "monthly", principal: 1000, downPayment: 0, fees: 0,
    installmentCount: 2, savingsFundedAmount: 0,
  };
  const rows: FinancingRowRecord[] = [
    { id: "i1", date: "2030-02-15", amount: 515.05, kind: "expense", installmentNumber: 1, principalPortion: 495.05, interestPortion: 20, savingsFundedAmount: 0 },
    { id: "am", date: "2030-02-20", amount: 300, kind: "expense", installmentNumber: null, principalPortion: 300, interestPortion: 0, savingsFundedAmount: 300, isAmortization: true },
    { id: "i2", date: "2030-03-15", amount: 206.1, kind: "expense", installmentNumber: 2, principalPortion: 204.95, interestPortion: 4.1, savingsFundedAmount: 0 },
  ];

  it("deducts the extra payment from the balance and keeps the contract CET", () => {
    const result = buildFinancingBreakdown(plan, rows, "2030-02-25");
    expect(result.rows.map((row) => [row.id, row.balanceAfter, row.isAmortization])).toEqual([
      ["i1", 504.95, false],
      ["am", 204.95, true],
      ["i2", 0, false],
    ]);
    expect(result.outstanding.principal).toBeCloseTo(204.95, 2);
    const original = buildFinancingSchedule({ principal: 1000, downPayment: 0, fees: 0, monthlyRate: 0.02, system: "price", installmentCount: 2 });
    expect(result.cet).toEqual(computeCet(1000, original.rows.map((row) => row.payment)));
  });
});
