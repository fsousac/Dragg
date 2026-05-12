import { describe, expect, it } from "vitest";

import {
  createCreditCardInvoiceTransactions,
  getCreditCardInvoiceCycle,
} from "@/lib/finance/credit-card-invoices";
import { type Transaction } from "@/lib/data";

function makeTransaction(
  overrides: Partial<Transaction> & Pick<Transaction, "id" | "date" | "amount">,
): Transaction {
  return {
    categoryKey: "data.category.shopping",
    date: overrides.date,
    descriptionKey: "Purchase",
    group: "wants",
    icon: "🛍️",
    id: overrides.id,
    amount: overrides.amount,
    paymentMethodClosingDay: 7,
    paymentMethodDueDay: 14,
    paymentMethodId: "card-1",
    paymentMethodKey: "Card",
    paymentMethodType: "credit",
    type: "expense",
    ...overrides,
  };
}

describe("credit card invoices", () => {
  it("calculates the invoice cycle using due day and closing day", () => {
    expect(
      getCreditCardInvoiceCycle({
        closingDay: 7,
        dueDay: 14,
        month: "2026-05",
      }),
    ).toEqual({
      closingDate: "2026-05-06",
      dueDate: "2026-05-14",
      startsAt: "2026-04-07",
    });
  });

  it("moves the closing date to the previous month when it falls after the due day", () => {
    expect(
      getCreditCardInvoiceCycle({
        closingDay: 28,
        dueDay: 5,
        month: "2026-05",
      }),
    ).toEqual({
      closingDate: "2026-04-27",
      dueDate: "2026-05-05",
      startsAt: "2026-03-28",
    });
  });

  it("groups only purchases inside the invoice cycle", () => {
    const transactions = [
      makeTransaction({ amount: -100, date: "2026-04-07", id: "included-1" }),
      makeTransaction({
        amount: -50,
        date: "2026-05-06",
        id: "included-2",
        notes: "2/3 - shoes",
      }),
      makeTransaction({ amount: -25, date: "2026-05-07", id: "next-cycle" }),
      makeTransaction({
        amount: -10,
        date: "2026-04-20",
        id: "debit",
        paymentMethodId: "debit-1",
        paymentMethodType: "debit",
      }),
    ];

    const { invoices, purchaseIds } = createCreditCardInvoiceTransactions({
      month: "2026-05",
      paymentMethods: [
        {
          closingDay: 7,
          dueDay: 14,
          id: "card-1",
          labelKey: "Card",
        },
      ],
      transactions,
    });

    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      amount: -150,
      date: "2026-05-14",
      isCreditCardInvoice: true,
      isPlanned: true,
    });
    expect(
      invoices[0].invoice.purchases.map((purchase) => purchase.id),
    ).toEqual(["included-1", "included-2"]);
    expect(invoices[0].invoice.purchases[1].installmentLabel).toBe("2/3");
    expect([...purchaseIds]).toEqual(["included-1", "included-2"]);
  });

  it("uses due day as a safe closing-day fallback", () => {
    expect(
      getCreditCardInvoiceCycle({
        dueDay: 14,
        month: "2026-05",
      }),
    ).toEqual({
      closingDate: "2026-05-13",
      dueDate: "2026-05-14",
      startsAt: "2026-04-14",
    });
  });
});
