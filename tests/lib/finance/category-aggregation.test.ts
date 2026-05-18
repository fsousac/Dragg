import { describe, expect, it } from "vitest";

import { type Transaction } from "@/lib/data";
import { buildExpensesByCategoryData } from "@/lib/finance/category-aggregation";

function transaction(
  overrides: Pick<
    Transaction,
    "amount" | "categoryId" | "categoryKey" | "group" | "id"
  >,
): Transaction {
  return {
    date: "2026-05-10",
    descriptionKey: overrides.categoryKey,
    icon: "🏷️",
    notes: null,
    paymentMethodId: null,
    paymentMethodKey: null,
    type: "expense",
    ...overrides,
  };
}

describe("category expense aggregation", () => {
  it("aggregates expenses by actual category identity within each group", () => {
    const expensesByCategory = buildExpensesByCategoryData([
      transaction({
        amount: -120,
        categoryId: "11111111-1111-4111-8111-111111111111",
        categoryKey: "data.category.health",
        group: "needs",
        id: "tx-health",
      }),
      transaction({
        amount: -50,
        categoryId: "22222222-2222-4222-8222-222222222222",
        categoryKey: "Academy/Gym",
        group: "needs",
        id: "tx-gym-1",
      }),
      transaction({
        amount: -75,
        categoryId: "22222222-2222-4222-8222-222222222222",
        categoryKey: "Academy/Gym",
        group: "needs",
        id: "tx-gym-2",
      }),
      transaction({
        amount: -35,
        categoryId: "33333333-3333-4333-8333-333333333333",
        categoryKey: "data.category.health",
        group: "needs",
        id: "tx-custom-health",
      }),
      transaction({
        amount: 3000,
        categoryId: null,
        categoryKey: "data.category.receipts",
        group: "income",
        id: "tx-income",
      }),
    ]);

    expect(expensesByCategory).toEqual([
      {
        categoryId: "22222222-2222-4222-8222-222222222222",
        color: "#F97316",
        group: "needs",
        groupKey: "data.group.needs",
        nameKey: "Academy/Gym",
        value: 125,
      },
      {
        categoryId: "11111111-1111-4111-8111-111111111111",
        color: "#F97316",
        group: "needs",
        groupKey: "data.group.needs",
        nameKey: "data.category.health",
        value: 120,
      },
      {
        categoryId: "33333333-3333-4333-8333-333333333333",
        color: "#F97316",
        group: "needs",
        groupKey: "data.group.needs",
        nameKey: "data.category.health",
        value: 35,
      },
    ]);
  });

  it("aggregates uncategorized fallback identities by group and category key", () => {
    const expensesByCategory = buildExpensesByCategoryData([
      transaction({
        amount: -40,
        categoryId: null,
        categoryKey: "data.category.other",
        group: "wants",
        id: "tx-other-1",
      }),
      transaction({
        amount: -60,
        categoryId: null,
        categoryKey: "data.category.other",
        group: "wants",
        id: "tx-other-2",
      }),
      transaction({
        amount: -25,
        categoryId: null,
        categoryKey: "data.category.other",
        group: "needs",
        id: "tx-other-needs",
      }),
    ]);

    expect(expensesByCategory).toEqual([
      {
        categoryId: null,
        color: "#F97316",
        group: "needs",
        groupKey: "data.group.needs",
        nameKey: "data.category.other",
        value: 25,
      },
      {
        categoryId: null,
        color: "#EC4899",
        group: "wants",
        groupKey: "data.group.wants",
        nameKey: "data.category.other",
        value: 100,
      },
    ]);
  });

  it("filters non-expenses and unsupported groups", () => {
    const income = transaction({
      amount: 100,
      categoryId: null,
      categoryKey: "data.category.salary",
      group: "income",
      id: "tx-income",
    });
    const unsupportedGroup = transaction({
      amount: -30,
      categoryId: null,
      categoryKey: "data.category.other",
      group: "income",
      id: "tx-unsupported-group",
    });

    income.type = "income";

    expect(buildExpensesByCategoryData([income, unsupportedGroup])).toEqual([]);
  });

  it("sorts by budget group before amount within each group", () => {
    const expensesByCategory = buildExpensesByCategoryData([
      transaction({
        amount: -300,
        categoryId: "22222222-2222-4222-8222-222222222222",
        categoryKey: "data.category.leisure",
        group: "wants",
        id: "tx-wants",
      }),
      transaction({
        amount: -50,
        categoryId: "11111111-1111-4111-8111-111111111111",
        categoryKey: "data.category.groceries",
        group: "needs",
        id: "tx-needs-small",
      }),
      transaction({
        amount: -75,
        categoryId: "33333333-3333-4333-8333-333333333333",
        categoryKey: "data.category.transportation",
        group: "needs",
        id: "tx-needs-large",
      }),
      transaction({
        amount: -500,
        categoryId: "44444444-4444-4444-8444-444444444444",
        categoryKey: "data.category.savings",
        group: "savings",
        id: "tx-savings",
      }),
    ]);

    expect(
      expensesByCategory.map((item) => [item.group, item.nameKey, item.value]),
    ).toEqual([
      ["needs", "data.category.transportation", 75],
      ["needs", "data.category.groceries", 50],
      ["wants", "data.category.leisure", 300],
      ["savings", "data.category.savings", 500],
    ]);
  });
});
