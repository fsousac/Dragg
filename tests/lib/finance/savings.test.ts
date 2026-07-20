import { describe, expect, it } from "vitest";

import { calculateTotalSaved } from "@/lib/finance/savings";
import { type TransactionGroup, type TransactionType } from "@/lib/data";

type TestTransaction = {
  amount: number;
  date: string;
  group?: TransactionGroup;
  type: TransactionType;
};

function tx(
  type: TransactionType,
  amount: number,
  date: string,
  group?: TransactionGroup,
): TestTransaction {
  return { amount, date, group, type };
}

describe("calculateTotalSaved", () => {
  it("sums accumulated saving transactions", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [
        tx("saving", 200, "2026-03-10"),
        tx("saving", -300, "2026-04-12"),
      ],
    });

    expect(result.totalInvested).toBe(500);
    expect(result.totalSaved).toBe(500);
  });

  it("counts savings group expense transactions as invested amount", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [tx("expense", 591.01, "2026-05-10", "savings")],
    });

    expect(result.totalInvested).toBeCloseTo(591.01, 2);
    expect(result.totalSaved).toBeCloseTo(591.01, 2);
  });

  it("sums closed month balances, including deficits", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [
        tx("income", 3000, "2026-03-01"),
        tx("expense", 2200, "2026-03-04"),
        tx("income", 2500, "2026-04-01"),
        tx("expense", 2600, "2026-04-04"),
      ],
    });

    expect(result.totalClosedMonthLeftover).toBe(700);
    expect(result.closedMonths).toEqual([
      {
        contributedLeftover: 800,
        expenses: 2200,
        finalBalance: 800,
        income: 3000,
        month: "2026-03",
        savings: 0,
      },
      {
        contributedLeftover: -100,
        expenses: 2600,
        finalBalance: -100,
        income: 2500,
        month: "2026-04",
        savings: 0,
      },
    ]);
  });

  it("does not include current open month leftover", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [
        tx("income", 3000, "2026-04-01"),
        tx("expense", 2000, "2026-04-15"),
        tx("income", 5000, "2026-05-01"),
      ],
    });

    expect(result.totalClosedMonthLeftover).toBe(1000);
    expect(result.closedMonths.map((month) => month.month)).toEqual([
      "2026-04",
    ]);
  });

  it("includes the previous month positive leftover in the selected month total", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [
        tx("income", 3000, "2026-04-01"),
        tx("expense", 1800, "2026-04-02"),
        tx("expense", 591.01, "2026-05-03", "savings"),
      ],
    });

    expect(result.totalInvested).toBeCloseTo(591.01, 2);
    expect(result.totalClosedMonthLeftover).toBe(1200);
    expect(result.totalSaved).toBeCloseTo(1791.01, 2);
  });

  it("debits a current month deficit from accumulated savings", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [
        tx("income", 3000, "2026-04-01"),
        tx("expense", 2000, "2026-04-02"),
        tx("saving", 500, "2026-04-03"),
        tx("income", 3000, "2026-05-01"),
        tx("expense", 4000, "2026-05-02"),
      ],
    });

    expect(result.totalInvested).toBe(500);
    expect(result.totalClosedMonthLeftover).toBe(500);
    expect(result.totalSaved).toBe(0);
  });

  it("subtracts saving transactions from leftover to avoid double-counting", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [
        tx("income", 3000, "2026-04-01"),
        tx("expense", 2000, "2026-04-02"),
        tx("expense", 500, "2026-04-03", "savings"),
      ],
    });

    expect(result.totalInvested).toBe(500);
    expect(result.closedMonths[0]).toMatchObject({
      finalBalance: 500,
      savings: 500,
    });
    expect(result.totalSaved).toBe(1000);
  });

  it("debits a closed month deficit from accumulated savings", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [
        tx("income", 1000, "2026-04-01"),
        tx("expense", 1300, "2026-04-02"),
      ],
    });

    expect(result.closedMonths[0]).toMatchObject({
      contributedLeftover: -300,
      finalBalance: -300,
    });
    expect(result.totalClosedMonthLeftover).toBe(-300);
    expect(result.totalSaved).toBe(-300);
  });

  it("handles months with no transactions", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-04",
      transactions: [
        tx("income", 1000, "2026-01-01"),
        tx("expense", 700, "2026-03-01"),
      ],
    });

    expect(result.closedMonths).toEqual([
      {
        contributedLeftover: 1000,
        expenses: 0,
        finalBalance: 1000,
        income: 1000,
        month: "2026-01",
        savings: 0,
      },
      {
        contributedLeftover: 0,
        expenses: 0,
        finalBalance: 0,
        income: 0,
        month: "2026-02",
        savings: 0,
      },
      {
        contributedLeftover: -700,
        expenses: 700,
        finalBalance: -700,
        income: 0,
        month: "2026-03",
        savings: 0,
      },
    ]);
  });

  it("returns zero totals when there are no transactions", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [],
    });

    expect(result).toEqual({
      closedMonths: [],
      totalClosedMonthLeftover: 0,
      totalInvested: 0,
      totalSaved: 0,
    });
  });

  it("excludes future saving transactions from invested total", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-05",
      transactions: [
        tx("saving", 100, "2026-05-01"),
        tx("saving", 200, "2026-06-01"),
      ],
    });

    expect(result.totalInvested).toBe(100);
    expect(result.totalSaved).toBe(100);
  });

  it("iterates closed months across year boundaries", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-02",
      transactions: [
        tx("income", 1000, "2025-12-01"),
        tx("expense", 400, "2026-01-01"),
      ],
    });

    expect(result.closedMonths.map((month) => month.month)).toEqual([
      "2025-12",
      "2026-01",
    ]);
    expect(result.totalClosedMonthLeftover).toBe(600);
  });

  it("accumulates multiple closed months iteratively", () => {
    const result = calculateTotalSaved({
      selectedMonth: "2026-06",
      transactions: [
        tx("income", 3000, "2026-02-01"),
        tx("expense", 2400, "2026-02-02"),
        tx("income", 3200, "2026-03-01"),
        tx("expense", 3000, "2026-03-02"),
        tx("saving", 100, "2026-03-03"),
        tx("income", 2500, "2026-04-01"),
        tx("expense", 2800, "2026-04-02"),
        tx("saving", 50, "2026-05-01"),
      ],
    });

    expect(result.totalInvested).toBe(150);
    expect(result.totalClosedMonthLeftover).toBe(400);
    expect(result.totalSaved).toBe(550);
    expect(result.closedMonths.map((month) => month.month)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
  });
});
