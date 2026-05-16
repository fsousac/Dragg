import { type Transaction, type TransactionGroup } from "@/lib/data";

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

const groupColors = {
  needs: "#F97316",
  wants: "#EC4899",
  savings: "#8B5CF6",
} as const;

function isCategoryGroup(value: string): value is ExpenseCategoryGroup {
  return categoryGroups.includes(value as ExpenseCategoryGroup);
}

export function buildExpensesByCategoryData(
  transactions: Transaction[],
): ExpensesByCategoryItem[] {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && isCategoryGroup(transaction.group),
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
          color: groupColors[group] ?? "#64748B",
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
      const groupOrder =
        (order[left.group as keyof typeof order] ?? 99) -
        (order[right.group as keyof typeof order] ?? 99);

      return groupOrder || right.value - left.value;
    });
}
