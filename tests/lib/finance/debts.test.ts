import { describe, expect, it } from "vitest";

import {
  buildDebtOverview,
  stripInstallmentSuffix,
  type DebtPlanInput,
} from "@/lib/finance/debts";
import type { FinancingPlanRecord, FinancingRowRecord } from "@/lib/finance/financing";

const TODAY = "2026-09-28";

const basePlan: FinancingPlanRecord = {
  operationType: "purchase",
  interestSystem: "price",
  rateInputMode: "rate",
  rate: 2,
  ratePeriod: "monthly",
  principal: 300,
  downPayment: 0,
  fees: 0,
  installmentCount: 3,
  savingsFundedAmount: 0,
};

function installment(number: number, date: string, principal: number, interest: number): FinancingRowRecord {
  return {
    id: `r${number}-${date}`,
    date,
    amount: principal + interest,
    kind: "expense",
    installmentNumber: number,
    principalPortion: principal,
    interestPortion: interest,
    savingsFundedAmount: 0,
  };
}

function debt(id: string, rows: FinancingRowRecord[], plan: Partial<FinancingPlanRecord> = {}): DebtPlanInput {
  return { id, description: id, paymentMethodId: null, plan: { ...basePlan, ...plan }, rows };
}

describe("stripInstallmentSuffix", () => {
  it("drops the (n/m) suffix only at the end", () => {
    expect(stripInstallmentSuffix("Notebook (1/10)")).toBe("Notebook");
    expect(stripInstallmentSuffix("Plan (a/b)")).toBe("Plan (a/b)");
  });
});

describe("buildDebtOverview", () => {
  const active = debt("tv", [
    installment(1, "2026-08-10", 98, 6),
    installment(2, "2026-09-10", 100, 4),
    installment(3, "2026-10-10", 102, 2),
  ]);

  it("summarises an active debt: progress, next installment and outstanding", () => {
    const { active: [item], settled } = buildDebtOverview([active], "2026-09", TODAY);

    expect(settled).toEqual([]);
    expect(item).toMatchObject({
      planId: "tv",
      paidInstallments: 2,
      installmentCount: 3,
      nextInstallment: { date: "2026-10-10", amount: 104 },
      outstanding: { principal: 102, interest: 2, total: 104 },
      isSettled: false,
    });
    expect(item.annualCet).toBeGreaterThan(0);
  });

  it("totals outstanding, interest already paid and what is due in the selected month", () => {
    const { totals } = buildDebtOverview([active], "2026-09", TODAY);

    expect(totals).toEqual({
      outstandingPrincipal: 102,
      outstandingInterest: 2,
      outstanding: 104,
      interestPaid: 10,
      dueThisMonth: 104,
    });
  });

  it("ignores the down payment and loan income when counting installments and the month", () => {
    const loan = debt(
      "loan",
      [
        { ...installment(1, "2026-10-02", 100, 10), id: "i1" },
        { id: "income", date: "2026-09-02", amount: 100, kind: "income", installmentNumber: null, principalPortion: null, interestPortion: null, savingsFundedAmount: 0 },
        { id: "down", date: "2026-09-02", amount: 50, kind: "expense", installmentNumber: null, principalPortion: 50, interestPortion: 0, savingsFundedAmount: 0 },
      ],
      { operationType: "loan", principal: 150, downPayment: 50, installmentCount: 1 },
    );
    const { active: [item], totals } = buildDebtOverview([loan], "2026-09", TODAY);

    expect(item).toMatchObject({ operationType: "loan", paidInstallments: 0, installmentCount: 1 });
    expect(totals.dueThisMonth).toBe(0);
  });

  it("moves fully past debts to settled and sorts active ones by next due date", () => {
    const paidOff = debt("old", [installment(1, "2026-01-10", 300, 6)], { installmentCount: 1 });
    const later = debt("later", [installment(1, "2026-12-01", 300, 6)], { installmentCount: 1 });
    const sooner = debt("sooner", [installment(1, "2026-10-01", 300, 6)], { installmentCount: 1 });
    const overview = buildDebtOverview([later, paidOff, sooner], "2026-09", TODAY);

    expect(overview.active.map((item) => item.planId)).toEqual(["sooner", "later"]);
    expect(overview.settled).toMatchObject([{ planId: "old", isSettled: true, nextInstallment: null }]);
  });

  it("returns zeroed totals with no debts", () => {
    expect(buildDebtOverview([], "2026-09", TODAY)).toEqual({
      active: [],
      settled: [],
      totals: { outstandingPrincipal: 0, outstandingInterest: 0, outstanding: 0, interestPaid: 0, dueThisMonth: 0 },
    });
  });
});
