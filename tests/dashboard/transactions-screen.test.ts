import { describe, expect, it } from "vitest";

import { isVisibleInSelectedMonth } from "@/components/dashboard/transactions-screen";
import { type Transaction } from "@/lib/data";

function makeTransaction(
  overrides: Partial<Transaction> & Pick<Transaction, "id" | "date">,
): Transaction {
  return {
    amount: -50,
    categoryKey: "data.category.shopping",
    date: overrides.date,
    descriptionKey: "Purchase",
    group: "wants",
    icon: "🛍️",
    id: overrides.id,
    type: "expense",
    ...overrides,
  };
}

describe("isVisibleInSelectedMonth", () => {
  it("keeps regular transactions regardless of their date", () => {
    const transaction = makeTransaction({ id: "tx-1", date: "2026-06-28" });

    expect(isVisibleInSelectedMonth(transaction, "2026-07")).toBe(true);
  });

  it("keeps credit card invoice purchases dated in the selected month", () => {
    const transaction = makeTransaction({
      id: "tx-2",
      date: "2026-07-05",
      isCreditCardInvoicePurchase: true,
    });

    expect(isVisibleInSelectedMonth(transaction, "2026-07")).toBe(true);
  });

  it("hides credit card invoice purchases dated in a previous month", () => {
    const transaction = makeTransaction({
      id: "tx-3",
      date: "2026-06-28",
      isCreditCardInvoicePurchase: true,
    });

    expect(isVisibleInSelectedMonth(transaction, "2026-07")).toBe(false);
  });
});
