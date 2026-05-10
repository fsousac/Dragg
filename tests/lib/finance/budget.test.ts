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
      spent: 1200,
    });
    expect(budgetData.wants).toEqual({
      budget: 1200,
      percentage: 38,
      spent: 450,
    });
    expect(budgetData.savings).toEqual({
      budget: 800,
      percentage: 38,
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
});
