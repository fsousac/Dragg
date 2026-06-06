import { describe, expect, it } from "vitest";

import {
  calculateBudgetData,
  calculateBudgetUsage,
  sumBudgetUsageByGroup,
} from "@/lib/finance/budget";

describe("budget calculations", () => {
  it("calculates 50/30/20 planned budgets from monthly income", () => {
    const budgetData = calculateBudgetData(4000, {
      needs: 1200,
      savings: 300,
      wants: 450,
    });

    expect(budgetData.needs).toEqual({
      budget: 2000,
      percentage: 60,
      plannedSpent: 1200,
      spent: 1200,
    });
    expect(budgetData.wants).toEqual({
      budget: 1200,
      percentage: 38,
      plannedSpent: 450,
      spent: 450,
    });
    expect(budgetData.savings).toEqual({
      budget: 800,
      percentage: 38,
      plannedSpent: 300,
      spent: 300,
    });
  });

  it("calculates remaining amount from planned budget", () => {
    expect(calculateBudgetUsage(750, 1000)).toEqual({
      exceededAmount: 0,
      isOverBudget: false,
      plannedAmount: 1000,
      progressValue: 75,
      remainingAmount: 250,
      spentAmount: 750,
      usagePercentage: 75,
    });
  });

  it("keeps the real percentage while capping progress when over budget", () => {
    expect(calculateBudgetUsage(1250, 1000)).toEqual({
      exceededAmount: 250,
      isOverBudget: true,
      plannedAmount: 1000,
      progressValue: 100,
      remainingAmount: -250,
      spentAmount: 1250,
      usagePercentage: 125,
    });
  });

  it("handles zero planned budget without NaN or Infinity", () => {
    expect(calculateBudgetUsage(100, 0)).toEqual({
      exceededAmount: 100,
      isOverBudget: true,
      plannedAmount: 0,
      progressValue: 0,
      remainingAmount: -100,
      spentAmount: 100,
      usagePercentage: 0,
    });
  });

  it("normalizes invalid and negative budget inputs", () => {
    expect(calculateBudgetUsage(Number.NaN, -100)).toEqual({
      exceededAmount: 0,
      isOverBudget: false,
      plannedAmount: 0,
      progressValue: 0,
      remainingAmount: 0,
      spentAmount: 0,
      usagePercentage: 0,
    });
    expect(calculateBudgetUsage(50, Number.NaN)).toEqual({
      exceededAmount: 50,
      isOverBudget: true,
      plannedAmount: 0,
      progressValue: 0,
      remainingAmount: -50,
      spentAmount: 50,
      usagePercentage: 0,
    });

    expect(
      calculateBudgetData(Number.POSITIVE_INFINITY, {
        needs: -10,
        savings: 20,
        wants: 30,
      }),
    ).toEqual({
      needs: { budget: 0, percentage: 0, plannedSpent: 0, spent: 0 },
      savings: { budget: 0, percentage: 0, plannedSpent: 20, spent: 20 },
      wants: { budget: 0, percentage: 0, plannedSpent: 30, spent: 30 },
    });
  });

  it("sums planned monthly usage by budget group", () => {
    expect(
      sumBudgetUsageByGroup([
        { amount: -200, group: "needs" },
        { amount: -50, group: "needs" },
        { amount: -100, group: "wants" },
        { amount: -300, group: "savings" },
        { amount: -80, group: "wants", notes: "subscription paused 2/12" },
        { amount: 2000, group: "income" },
      ]),
    ).toEqual({
      needs: 250,
      savings: 300,
      wants: 100,
    });
  });

  it("actual monthly total — uses only realized transactions", () => {
    const today = new Date().toISOString().slice(0, 10);
    const pastDate = "2000-01-01";
    const futureDate = "2099-12-31";

    const allTransactions = [
      { amount: -500, group: "needs" as const, date: pastDate },
      { amount: -200, group: "wants" as const, date: pastDate },
      { amount: -100, group: "savings" as const, date: pastDate },
      { amount: -999, group: "needs" as const, date: futureDate },
    ];

    const actualTransactions = allTransactions.filter(
      (t) => t.date <= today,
    );
    const actualByGroup = sumBudgetUsageByGroup(actualTransactions);
    const budgetData = calculateBudgetData(2000, actualByGroup);

    expect(budgetData.needs.spent).toBe(500);
    expect(budgetData.wants.spent).toBe(200);
    expect(budgetData.savings.spent).toBe(100);
  });

  it("planned monthly total — includes future transactions", () => {
    const today = new Date().toISOString().slice(0, 10);
    const pastDate = "2000-01-01";
    const futureDate = "2099-12-31";

    const allTransactions = [
      { amount: -500, group: "needs" as const, date: pastDate },
      { amount: -200, group: "wants" as const, date: pastDate },
      { amount: -100, group: "savings" as const, date: pastDate },
      { amount: -999, group: "needs" as const, date: futureDate },
    ];

    const actualTransactions = allTransactions.filter(
      (t) => t.date <= today,
    );
    const plannedTransactions = allTransactions;

    const actualByGroup = sumBudgetUsageByGroup(actualTransactions);
    const plannedByGroup = sumBudgetUsageByGroup(plannedTransactions);
    const budgetData = calculateBudgetData(2000, actualByGroup, plannedByGroup);

    expect(budgetData.needs.plannedSpent).toBe(1499);
    expect(budgetData.wants.plannedSpent).toBe(200);
    expect(budgetData.savings.plannedSpent).toBe(100);
    expect(budgetData.needs.plannedSpent).toBeGreaterThanOrEqual(
      budgetData.needs.spent,
    );
  });

  it("Budgets totalSpent matches Dashboard totalExpenses", () => {
    const transactions = [
      { amount: -300, group: "needs" as const, type: "expense" as const },
      { amount: -150, group: "wants" as const, type: "expense" as const },
      { amount: -50, group: "savings" as const, type: "expense" as const },
      { amount: 1000, group: "income" as const, type: "income" as const },
    ];

    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const actualByGroup = sumBudgetUsageByGroup(transactions);
    const budgetData = calculateBudgetData(1000, actualByGroup);

    const budgetTotalSpent =
      budgetData.needs.spent +
      budgetData.wants.spent +
      budgetData.savings.spent;

    expect(budgetTotalSpent).toBe(totalExpenses);
  });
});
