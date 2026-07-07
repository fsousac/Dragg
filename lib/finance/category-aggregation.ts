import { type Transaction, type TransactionGroup } from "@/lib/data";
import { GROUP_COLORS } from "@/lib/finance/group-colors";

type ExpenseCategoryGroup = Exclude<TransactionGroup, "income">;

export type ExpensesByCategoryItem = {
  categoryId?: string | null;
  group: ExpenseCategoryGroup;
  groupKey: string;
  nameKey: string;
  value: number;
  color: string;
};

const categoryGroups = ["needs", "wants", "savings"] as const;

function isCategoryGroup(value: string): value is ExpenseCategoryGroup {
  return categoryGroups.includes(value as ExpenseCategoryGroup);
}

export function buildExpensesByCategoryData(
  transactions: Transaction[],
): ExpensesByCategoryItem[] {
  return transactions
    .filter(
      (transaction) =>
        transaction.type !== "income" && isCategoryGroup(transaction.group),
    )
    .reduce((acc, transaction) => {
      const group = transaction.group as ExpenseCategoryGroup;
      const groupKey = `data.group.${group}`;
      const categoryIdentity = transaction.categoryId
        ? `category:${transaction.categoryId}`
        : `fallback:${group}:${transaction.categoryKey}`;
      const existing = acc.find((item) => {
        const itemIdentity = item.categoryId
          ? `category:${item.categoryId}`
          : `fallback:${item.group}:${item.nameKey}`;

        return itemIdentity === categoryIdentity;
      });

      if (existing) {
        existing.value += Math.abs(transaction.amount);
      } else {
        acc.push({
          categoryId: transaction.categoryId ?? null,
          color: GROUP_COLORS[group],
          group,
          groupKey,
          nameKey: transaction.categoryKey,
          value: Math.abs(transaction.amount),
        });
      }

      return acc;
    }, [] as ExpensesByCategoryItem[])
    .sort((left, right) => {
      const order = {
        needs: 0,
        wants: 1,
        savings: 2,
      };
      const groupOrder = order[left.group] - order[right.group];

      return groupOrder || right.value - left.value;
    });
}
