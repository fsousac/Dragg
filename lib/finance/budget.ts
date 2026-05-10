import { type TransactionGroup } from "@/lib/data";

export type BudgetGroup = Exclude<TransactionGroup, "income">;

export type BudgetGroupUsage = {
  exceededAmount: number;
  isOverBudget: boolean;
  plannedAmount: number;
  progressValue: number;
  remainingAmount: number;
  spentAmount: number;
  usagePercentage: number;
};

export const BUDGET_GROUP_RATIOS = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
} as const satisfies Record<BudgetGroup, number>;

function toMoneyValue(value: number) {
  return Number(value.toFixed(2));
}

export function calculateBudgetUsage(
  spentAmount: number,
  plannedAmount: number,
): BudgetGroupUsage {
  const safeSpentAmount = Number.isFinite(spentAmount)
    ? Math.max(spentAmount, 0)
    : 0;
  const safePlannedAmount = Number.isFinite(plannedAmount)
    ? Math.max(plannedAmount, 0)
    : 0;
  const usagePercentage =
    safePlannedAmount > 0
      ? Math.round((safeSpentAmount / safePlannedAmount) * 100)
      : 0;
  const remainingAmount = toMoneyValue(safePlannedAmount - safeSpentAmount);
  const exceededAmount = toMoneyValue(
    Math.max(safeSpentAmount - safePlannedAmount, 0),
  );

  return {
    exceededAmount,
    isOverBudget: exceededAmount > 0,
    plannedAmount: safePlannedAmount,
    progressValue: Math.min(Math.max(usagePercentage, 0), 100),
    remainingAmount,
    spentAmount: safeSpentAmount,
    usagePercentage,
  };
}

export function calculateBudgetData(
  monthlyIncome: number,
  spentByGroup: Record<BudgetGroup, number>,
) {
  const safeMonthlyIncome = Number.isFinite(monthlyIncome)
    ? Math.max(monthlyIncome, 0)
    : 0;

  return {
    needs: createBudgetGroupData(
      safeMonthlyIncome,
      spentByGroup.needs,
      BUDGET_GROUP_RATIOS.needs,
    ),
    savings: createBudgetGroupData(
      safeMonthlyIncome,
      spentByGroup.savings,
      BUDGET_GROUP_RATIOS.savings,
    ),
    wants: createBudgetGroupData(
      safeMonthlyIncome,
      spentByGroup.wants,
      BUDGET_GROUP_RATIOS.wants,
    ),
  };
}

export function sumBudgetUsageByGroup(
  transactions: Array<{
    amount: number;
    group: TransactionGroup;
    notes?: string | null;
  }>,
) {
  return transactions.reduce(
    (totals, transaction) => {
      if (
        transaction.group === "income" ||
        transaction.notes?.includes("paused")
      ) {
        return totals;
      }

      totals[transaction.group] += Math.abs(transaction.amount);
      return totals;
    },
    {
      needs: 0,
      savings: 0,
      wants: 0,
    } satisfies Record<BudgetGroup, number>,
  );
}

function createBudgetGroupData(
  monthlyIncome: number,
  spentAmount: number,
  budgetRatio: number,
) {
  const budget = toMoneyValue(monthlyIncome * budgetRatio);
  const usage = calculateBudgetUsage(spentAmount, budget);

  return {
    budget,
    percentage: usage.usagePercentage,
    spent: usage.spentAmount,
  };
}
