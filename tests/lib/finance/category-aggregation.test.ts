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
});
