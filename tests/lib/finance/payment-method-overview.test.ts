import { describe, expect, it } from "vitest";

import { type Transaction } from "@/lib/data";
import {
  calculatePaymentMethodSpent,
  getPaymentMethodDetail,
} from "@/lib/finance/payment-method-overview";

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
  it("returns detail totals that match the payment method card total", () => {
    const paymentMethod = {
      closingDay: 7,
      dueDay: 14,
      id: "card-1",
      label: "Rewards Card",
      type: "credit",
    };
    const transactions = [
      makeTransaction({ amount: -100, date: "2026-04-20", id: "purchase-1" }),
      makeTransaction({ amount: -50, date: "2026-05-08", id: "purchase-2" }),
      makeTransaction({
        amount: 500,
        date: "2026-05-08",
        id: "income",
        type: "income",
      }),
    ];

    const cardTotal = calculatePaymentMethodSpent({
      paymentMethod,
      today: "2026-05-01",
      transactions,
    });
    const detail = getPaymentMethodDetail({
      paymentMethod,
      selectedMonth: "2026-05",
      today: "2026-05-01",
      transactions,
    });

    expect(detail.totalAmount).toBe(cardTotal);
    expect(detail.transactions.map((transaction) => transaction.id)).toEqual([
      "purchase-1",
      "purchase-2",
    ]);
  });

  it("includes credit card purchases before or on the invoice closing date in the selected invoice context", () => {
    const detail = getPaymentMethodDetail({
      paymentMethod: {
        closingDay: 7,
        dueDay: 14,
        id: "card-1",
        type: "credit",
      },
      selectedMonth: "2026-05",
      today: "2026-05-01",
      transactions: [
        makeTransaction({
          amount: -100,
          date: "2026-05-06",
          id: "closing-date-purchase",
          notes: "2/4",
        }),
      ],
    });

    expect(detail.totalAmount).toBe(100);
    expect(detail.transactions[0]).toMatchObject({
      id: "closing-date-purchase",
      installmentLabel: "2/4",
      invoiceDueDate: "2026-05-14",
    });
  });

  it("moves credit card purchases after the closing day into the next invoice context", () => {
    const detail = getPaymentMethodDetail({
      paymentMethod: {
        closingDay: 7,
        dueDay: 14,
        id: "card-1",
        type: "credit",
      },
      selectedMonth: "2026-05",
      today: "2026-05-01",
      transactions: [
        makeTransaction({
          amount: -80,
          date: "2026-05-07",
          id: "next-invoice-purchase",
        }),
      ],
    });

    expect(detail.totalAmount).toBe(80);
    expect(detail.transactions[0].invoiceDueDate).toBe("2026-06-14");
  });

  it("filters non-credit payment method details by the selected month context", () => {
    const detail = getPaymentMethodDetail({
      paymentMethod: {
        id: "bank-1",
        type: "bank",
      },
      selectedMonth: "2026-05",
      today: "2026-05-12",
      transactions: [
        makeTransaction({
          amount: -40,
          date: "2026-05-10",
          id: "may-bill",
          paymentMethodId: "bank-1",
          paymentMethodType: "bank",
        }),
        makeTransaction({
          amount: -60,
          date: "2026-06-10",
          id: "june-bill",
          paymentMethodId: "bank-1",
          paymentMethodType: "bank",
        }),
      ],
    });

    expect(detail.totalAmount).toBe(40);
    expect(detail.transactions.map((transaction) => transaction.id)).toEqual([
      "may-bill",
    ]);
  });

  it("returns an empty payment method detail state when no transactions match", () => {
    const detail = getPaymentMethodDetail({
      paymentMethod: {
        id: "bank-1",
        name: "Bank",
        type: "bank",
      },
      selectedMonth: "2026-05",
      today: "2026-05-12",
      transactions: [
        makeTransaction({
          amount: -60,
          date: "2026-06-10",
          id: "june-bill",
          paymentMethodId: "bank-1",
          paymentMethodType: "bank",
        }),
      ],
    });

    expect(detail).toMatchObject({
      paymentMethodId: "bank-1",
      paymentMethodName: "Bank",
      paymentMethodType: "bank",
      selectedMonth: "2026-05",
      totalAmount: 0,
      transactions: [],
    });
  });

  it("keeps planned detail status and falls back when method type is missing", () => {
    const detail = getPaymentMethodDetail({
      paymentMethod: {
        id: "method-1",
      },
      selectedMonth: "",
      today: "2026-05-12",
      transactions: [
        makeTransaction({
          amount: -25,
          id: "planned-transaction",
          isPlanned: true,
          paymentMethodId: "method-1",
          paymentMethodType: null,
        }),
      ],
    });

    expect(detail.paymentMethodType).toBe("other");
    expect(detail.transactions[0]).toMatchObject({
      id: "planned-transaction",
      invoiceDueDate: null,
      status: "planned",
    });
  });

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

  it("excludes past-cycle purchases when no due day is configured, falling back to an end-of-month cycle", () => {
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
            id: "already-paid-previous-cycle",
          }),
        ],
      }),
    ).toBe(0);
  });

  it("still counts the open cycle's purchases when no due day is configured", () => {
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
            date: "2026-05-05",
            id: "open-cycle-purchase",
          }),
        ],
      }),
    ).toBe(100);
  });

  it("does not deduct advance-paid invoice amounts from the card's remaining limit usage", () => {
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
            amount: -150,
            date: "2026-05-05",
            id: "current-open-invoice-purchase",
          }),
          makeTransaction({
            amount: -150,
            date: "2026-05-06",
            id: "invoice-advance-payment",
            notes: "invoice_advance:credit-card-invoice:card-1:2026-05",
            paymentMethodId: "checking-1",
            paymentMethodType: "bank",
          }),
        ],
      }),
    ).toBe(0);
  });

  it("clamps the advance-paid adjustment so it never makes the total negative", () => {
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
            amount: -50,
            date: "2026-05-05",
            id: "current-open-invoice-purchase",
          }),
          makeTransaction({
            amount: -150,
            date: "2026-05-06",
            id: "invoice-advance-payment",
            notes: "invoice_advance:credit-card-invoice:card-1:2026-05",
            paymentMethodId: "checking-1",
            paymentMethodType: "bank",
          }),
        ],
      }),
    ).toBe(0);
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
