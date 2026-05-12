import { describe, expect, it } from "vitest";

import { type Transaction } from "@/lib/data";
import { calculatePaymentMethodSpent } from "@/lib/finance/payment-method-overview";

function makeTransaction(
  overrides: Partial<Transaction> & Pick<Transaction, "id" | "amount">,
): Transaction {
  return {
    amount: overrides.amount,
    categoryKey: "data.category.shopping",
    date: "2026-05-10",
    descriptionKey: "Purchase",
    group: "wants",
    icon: "card",
    id: overrides.id,
    paymentMethodId: "card-1",
    paymentMethodType: "credit",
    type: "expense",
    ...overrides,
  };
}

describe("payment method overview spending", () => {
  it("uses unpaid registered card purchases instead of the current invoice only", () => {
    expect(
      calculatePaymentMethodSpent({
        paymentMethod: {
          closingDay: null,
          dueDay: 14,
          id: "card-1",
          type: "credit",
        },
        today: "2026-05-12",
        transactions: [
          makeTransaction({
            amount: -100,
            date: "2026-04-13",
            id: "paid-previous-invoice",
          }),
          makeTransaction({
            amount: -150,
            date: "2026-04-14",
            id: "current-open-invoice",
          }),
          makeTransaction({
            amount: -75,
            date: "2026-05-13",
            id: "current-open-invoice-closing-day",
          }),
          makeTransaction({
            amount: -200,
            date: "2026-05-14",
            id: "future-open-invoice",
          }),
        ],
      }),
    ).toBe(425);
  });

  it("handles cards whose closing day falls after the due day", () => {
    expect(
      calculatePaymentMethodSpent({
        paymentMethod: {
          closingDay: 28,
          dueDay: 5,
          id: "card-1",
          type: "credit",
        },
        today: "2026-05-12",
        transactions: [
          makeTransaction({
            amount: -100,
            date: "2026-04-27",
            id: "paid-may-invoice",
          }),
          makeTransaction({
            amount: -90,
            date: "2026-04-28",
            id: "open-june-invoice",
          }),
        ],
      }),
    ).toBe(90);
  });

  it("keeps registered card purchases when no due day is configured", () => {
    expect(
      calculatePaymentMethodSpent({
        paymentMethod: {
          dueDay: null,
          id: "card-1",
          type: "credit",
        },
        today: "2026-05-12",
        transactions: [
          makeTransaction({
            amount: -100,
            date: "2026-04-13",
            id: "registered-purchase",
          }),
        ],
      }),
    ).toBe(100);
  });

  it("falls back to the following invoice month when a card purchase cannot be matched to a cycle", () => {
    expect(
      calculatePaymentMethodSpent({
        paymentMethod: {
          closingDay: 7,
          dueDay: 14,
          id: "card-1",
          type: "credit",
        },
        today: "2026-05-12",
        transactions: [
          makeTransaction({
            amount: -60,
            date: "2026-99-99",
            id: "malformed-date-still-counts-as-open",
          }),
        ],
      }),
    ).toBe(60);
  });

  it("keeps grouped spending for non-credit methods", () => {
    expect(
      calculatePaymentMethodSpent({
        paymentMethod: {
          id: "pix-1",
          type: "pix",
        },
        today: "2026-05-12",
        transactions: [
          makeTransaction({
            amount: -40,
            id: "expense-1",
            paymentMethodId: "pix-1",
            paymentMethodType: "pix",
          }),
          makeTransaction({
            amount: 200,
            id: "income-1",
            paymentMethodId: "pix-1",
            paymentMethodType: "pix",
            type: "income",
          }),
          makeTransaction({
            amount: -15,
            id: "expense-other-method",
            paymentMethodId: "cash-1",
            paymentMethodType: "cash",
          }),
        ],
      }),
    ).toBe(40);
  });
});
