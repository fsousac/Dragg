import { describe, expect, it } from "vitest";

import {
  createCreditCardInvoiceTransactions,
  getCreditCardInvoiceCycle,
  getInvoiceAdvancePaymentNote,
  withCreditCardInvoiceTransactions,
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
      invoice: {
        paidAmount: 0,
        totalAmount: 150,
      },
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

  it("uses the last day of the month when no due day is configured", () => {
    expect(
      getCreditCardInvoiceCycle({
        month: "2026-02",
      }),
    ).toEqual({
      closingDate: "2026-02-27",
      dueDate: "2026-02-28",
      startsAt: "2026-01-28",
    });
  });

  it("clamps due and closing days to the target month length", () => {
    expect(
      getCreditCardInvoiceCycle({
        closingDay: 31,
        dueDay: 31,
        month: "2026-02",
      }),
    ).toEqual({
      closingDate: "2026-02-27",
      dueDate: "2026-02-28",
      startsAt: "2026-01-31",
    });
  });

  it("skips cards without due days and cards without purchases", () => {
    const { invoices, purchaseIds } = createCreditCardInvoiceTransactions({
      month: "2026-05",
      paymentMethods: [
        {
          closingDay: 7,
          dueDay: null,
          id: "card-without-due-day",
          labelKey: "No due",
        },
        {
          closingDay: 7,
          dueDay: 14,
          id: "card-without-purchases",
          labelKey: "Empty",
        },
      ],
      transactions: [
        makeTransaction({
          amount: -20,
          date: "2026-04-20",
          id: "other-card-purchase",
          paymentMethodId: "other-card",
        }),
      ],
    });

    expect(invoices).toEqual([]);
    expect([...purchaseIds]).toEqual([]);
  });

  it("extracts installment labels from descriptions when notes are empty", () => {
    const { invoices } = createCreditCardInvoiceTransactions({
      month: "2026-05",
      paymentMethods: [
        {
          dueDay: 14,
          id: "card-1",
          labelKey: "Card",
        },
      ],
      transactions: [
        makeTransaction({
          amount: -30,
          date: "2026-04-20",
          descriptionKey: "Headphones 1/2",
          id: "installment-from-description",
          notes: null,
        }),
      ],
    });

    expect(invoices[0].invoice.purchases[0].installmentLabel).toBe("1/2");
  });

  it("can preserve purchases when adding invoice rows for transaction history", () => {
    const purchase = makeTransaction({
      amount: -100,
      date: "2026-05-03",
      id: "forgotten-purchase",
    });

    const transactions = withCreditCardInvoiceTransactions({
      month: "2026-05",
      preservePurchases: true,
      sourceTransactions: [purchase],
      visibleTransactions: [purchase],
    });

    expect(transactions.map((transaction) => transaction.id)).toEqual([
      "forgotten-purchase",
      "credit-card-invoice:card-1:2026-05",
    ]);
  });

  it("returns visible transactions unchanged when there are no invoice rows", () => {
    const debitPurchase = makeTransaction({
      amount: -20,
      date: "2026-05-03",
      id: "debit-purchase",
      paymentMethodId: "debit-1",
      paymentMethodKey: "Debit",
      paymentMethodType: "debit",
    });
    const visibleTransactions = [debitPurchase];

    expect(
      withCreditCardInvoiceTransactions({
        month: "2026-05",
        sourceTransactions: [debitPurchase],
        visibleTransactions,
      }),
    ).toBe(visibleTransactions);
  });

  it("handles credit purchases without configured invoice days", () => {
    const creditPurchase = makeTransaction({
      amount: -20,
      date: "2026-05-03",
      id: "unconfigured-credit-purchase",
      paymentMethodClosingDay: undefined,
      paymentMethodDueDay: undefined,
    });
    const visibleTransactions = [creditPurchase];

    expect(
      withCreditCardInvoiceTransactions({
        month: "2026-05",
        sourceTransactions: [creditPurchase],
        visibleTransactions,
      }),
    ).toBe(visibleTransactions);
  });

  it("removes purchases by default when replacing them with invoice rows", () => {
    const purchase = makeTransaction({
      amount: -100,
      date: "2026-05-03",
      id: "invoice-purchase",
    });

    const transactions = withCreditCardInvoiceTransactions({
      month: "2026-05",
      sourceTransactions: [purchase],
      visibleTransactions: [purchase],
    });

    expect(transactions.map((transaction) => transaction.id)).toEqual([
      "credit-card-invoice:card-1:2026-05",
    ]);
  });

  it("subtracts invoice advance payments from the remaining invoice amount", () => {
    const purchase = makeTransaction({
      amount: -100,
      date: "2026-05-03",
      id: "invoice-purchase",
    });
    const advancePayment = makeTransaction({
      amount: -30,
      date: "2026-05-04",
      id: "advance-payment",
      notes: getInvoiceAdvancePaymentNote("credit-card-invoice:card-1:2026-05"),
      paymentMethodId: "bank-1",
      paymentMethodType: "bank",
    });

    const transactions = withCreditCardInvoiceTransactions({
      month: "2026-05",
      sourceTransactions: [purchase, advancePayment],
      visibleTransactions: [purchase, advancePayment],
    });

    expect(transactions).toHaveLength(2);
    expect(transactions[0].id).toBe("advance-payment");
    expect(transactions[1]).toMatchObject({
      amount: -70,
      id: "credit-card-invoice:card-1:2026-05",
      invoice: {
        paidAmount: 30,
        totalAmount: 100,
      },
    });
  });

  it("removes invoice purchases when advance payments fully pay the invoice", () => {
    const purchase = makeTransaction({
      amount: -100,
      date: "2026-05-03",
      id: "invoice-purchase",
    });
    const advancePayment = makeTransaction({
      amount: -100,
      date: "2026-05-04",
      id: "advance-payment",
      notes: getInvoiceAdvancePaymentNote("credit-card-invoice:card-1:2026-05"),
      paymentMethodId: "bank-1",
      paymentMethodType: "bank",
    });

    const transactions = withCreditCardInvoiceTransactions({
      month: "2026-05",
      sourceTransactions: [purchase, advancePayment],
      visibleTransactions: [purchase, advancePayment],
    });

    expect(transactions.map((transaction) => transaction.id)).toEqual([
      "advance-payment",
    ]);
  });
});
