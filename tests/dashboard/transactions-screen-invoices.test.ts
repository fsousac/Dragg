import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  PlannedBadge,
  TransactionsScreen,
  TransactionTypeIndicator,
} from "@/components/dashboard/transactions-screen";
import { type Transaction } from "@/lib/data";
import {
  type InstallmentPrepaymentPreview,
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
} from "@/lib/finance/transactions";

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("month=2026-07"),
}));

const translations: Record<string, string> = {
  "common.all": "All",
  "common.amount": "Amount",
  "common.cancel": "Cancel",
  "common.date": "Date",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.today": "Today",
  "common.view": "View",
  "common.yesterday": "Yesterday",
  "data.group.income": "Income",
  "data.group.needs": "Needs",
  "data.group.savings": "Savings",
  "data.group.wants": "Wants",
  "data.category.shopping": "Shopping",
  "screen.transactions.clearFilters": "Clear filters",
  "screen.transactions.hideNextInvoice": "Hide next invoice",
  "screen.transactions.hidePrevious": "Hide previous",
  "screen.transactions.nextInvoice": "Next invoice",
  "screen.transactions.nextInvoiceDescription":
    "Purchases already on next month's invoice",
  "screen.transactions.planned": "Planned",
  "screen.transactions.plannedInvoice": "Planned invoice",
  "screen.transactions.showNextInvoice": "Show next invoice",
  "screen.transactions.showPrevious": "Show previous",
  "transaction.creditCardInvoice": "Credit card invoice",
  "transaction.creditCardInvoiceFor": "Invoice for",
  "transaction.detailsDescription": "Transaction details",
  "transaction.detailsTitle": "Transaction",
  "transaction.deleteConfirm": "Delete transaction?",
  "transaction.deleteDescription": "This cannot be undone.",
  "transaction.deleteError": "Could not delete the transaction.",
  "transaction.deleteSuccess": "Transaction deleted.",
  "transaction.invoiceCycle": "Invoice cycle",
  "transaction.invoiceDetailsDescription": "Purchases in this invoice",
  "transaction.invoiceDueDate": "Due date",
  "transaction.invoicePurchases": "Purchases",
  "transaction.paymentMethod": "Payment method",
  "transactions.installments.advanceConfirmDescription":
    "Advance {count} installments totaling {amount} to {month}.",
  "transactions.installments.advanceCountHelp": "Up to {max} installments.",
  "transactions.installments.advanceCountLabel": "Installments to advance",
  "transactions.installments.advanceError": "Could not advance installments.",
  "transactions.installments.advanceNone": "No installments left to advance.",
  "transactions.installments.advanceRemaining": "Advance",
  "transactions.installments.advanceSuccess": "Installments advanced.",
  "transactions.installments.advanceTitle": "Advance installments",
};

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatDate: (value: string | Date) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : value,
    formatNumber: (value: number) => String(value),
    locale: "en",
    t: (key: string) => translations[key] ?? key,
  }),
}));

const categories: TransactionFormCategory[] = [
  {
    group: "wants",
    id: "cat-shopping",
    icon: "🛍️",
    label: "data.category.shopping",
    monthlyLimit: 500,
  },
  {
    group: "income",
    id: "cat-income",
    icon: "💼",
    label: "data.category.receipts",
    monthlyLimit: 0,
  },
];

const paymentMethods: TransactionFormPaymentMethod[] = [
  { id: "pm-card", label: "data.paymentMethod.card", type: "credit_card" },
];

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

function baseProps(
  overrides: Partial<Parameters<typeof TransactionsScreen>[0]> = {},
) {
  return {
    advanceInstallmentsAction: vi.fn().mockResolvedValue(undefined),
    categories,
    createCategoryAction: vi.fn().mockResolvedValue(undefined),
    createTransactionAction: vi.fn().mockResolvedValue(undefined),
    deleteInstallmentsAction: vi.fn().mockResolvedValue(undefined),
    deleteSubscriptionOccurrencesAction: vi.fn().mockResolvedValue(undefined),
    deleteTransactionAction: vi.fn().mockResolvedValue(undefined),
    monthlySummary: { totalIncome: 0, totalExpenses: 0, totalSavings: 0 },
    nextInvoiceTransactions: [] as Transaction[],
    paymentMethods,
    previewInstallmentPrepaymentAction: vi.fn(),
    showNextInvoice: true,
    showPrevious: false,
    transactions: [] as Transaction[],
    updateTransactionAction: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("NextInvoiceSection", () => {
  it("renders nothing when there are no next-invoice transactions", () => {
    const { container } = render(
      React.createElement(
        TransactionsScreen,
        baseProps({ nextInvoiceTransactions: [] }),
      ),
    );

    expect(screen.queryByText("Next invoice")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-muted\\/20")).not.toBeInTheDocument();
  });

  it("stays collapsed when showNextInvoice is false, and can be toggled open", () => {
    const nextInvoiceTransactions = [
      makeTransaction({
        id: "inv-1",
        date: "2026-08-05",
        descriptionKey: "Groceries",
        isCreditCardInvoicePurchase: true,
      }),
    ];

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({ showNextInvoice: false, nextInvoiceTransactions }),
      ),
    );

    expect(screen.queryByText("Next invoice")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Show next invoice"));

    expect(screen.getAllByText("Next invoice").length).toBeGreaterThan(0);
    expect(screen.getByText("Groceries")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hide next invoice"));
    expect(screen.queryByText("Next invoice")).not.toBeInTheDocument();
  });

  it("renders a full-purchase invoice line and opens the detail dialog on click", () => {
    const nextInvoiceTransactions = [
      makeTransaction({
        id: "invoice-line",
        date: "2026-08-05",
        descriptionKey: "Streaming service",
        categoryKey: "data.category.shopping",
        amount: -42,
        paymentMethodKey: "data.paymentMethod.card",
        isCreditCardInvoicePurchase: true,
      }),
    ];

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({ nextInvoiceTransactions }),
      ),
    );

    const openButton = screen.getByText("Streaming service").closest("button")!;
    fireEvent.click(openButton);

    expect(screen.getByText("Transaction")).toBeInTheDocument();
  });

  it("uses the invoice payment method title when the transaction is a credit card invoice itself", () => {
    const nextInvoiceTransactions = [
      makeTransaction({
        id: "invoice-self",
        date: "2026-08-05",
        isCreditCardInvoice: true,
        paymentMethodKey: "data.paymentMethod.card",
        invoice: {
          closingDate: "2026-08-10",
          dueDate: "2026-08-17",
          paidAmount: 0,
          paymentMethodKey: "data.paymentMethod.card",
          purchases: [],
          totalAmount: -100,
          startsAt: "2026-07-11",
        },
      }),
    ];

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({ nextInvoiceTransactions }),
      ),
    );

    expect(
      screen.getByText("Invoice for data.paymentMethod.card"),
    ).toBeInTheDocument();
  });

  it("falls back to the generic invoice title when no payment method key is present", () => {
    const nextInvoiceTransactions = [
      makeTransaction({
        id: "invoice-generic",
        date: "2026-08-05",
        isCreditCardInvoice: true,
        paymentMethodKey: null,
      }),
    ];

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({ nextInvoiceTransactions }),
      ),
    );

    expect(screen.getByText("Credit card invoice")).toBeInTheDocument();
  });
});

async function clickAdvanceMenuItem(user: ReturnType<typeof userEvent.setup>) {
  const dialog = screen.getByRole("dialog");
  const moreButton = dialog.querySelector(
    '[data-slot="dropdown-menu-trigger"]',
  ) as HTMLElement;
  await user.click(moreButton);
  const menu = await screen.findByRole("menu");
  const advanceItem = menu
    .querySelector("svg.lucide-calendar-arrow-down")
    ?.closest('[role="menuitem"]') as HTMLElement;
  await user.click(advanceItem);
}

describe("advance-payment preview and confirm flow", () => {
  function invoiceTransaction(): Transaction {
    return makeTransaction({
      id: "invoice-1",
      date: "2026-07-05",
      isCreditCardInvoice: true,
      amount: -300,
      paymentMethodKey: "data.paymentMethod.card",
      invoice: {
        closingDate: "2026-07-10",
        dueDate: "2026-07-17",
        paidAmount: 0,
        paymentMethodKey: "data.paymentMethod.card",
        purchases: [
          {
            amount: -100,
            categoryKey: "data.category.shopping",
            date: "2026-06-20",
            descriptionKey: "Purchase",
            id: "installment-1",
            installmentLabel: "1/3",
          },
        ],
        totalAmount: -100,
        startsAt: "2026-06-11",
      },
    });
  }

  function installmentTransaction(): Transaction {
    return makeTransaction({
      id: "installment-1",
      date: "2026-06-20",
      installmentGroupId: "group-1",
      installmentNumber: 1,
      installmentTotal: 3,
    });
  }

  it("previews and confirms advancing the remaining installments", async () => {
    const user = userEvent.setup();
    const preview: InstallmentPrepaymentPreview = {
      count: 2,
      installments: [
        { amount: 100, date: "2026-08-20", id: "installment-2" },
        { amount: 100, date: "2026-09-20", id: "installment-3" },
      ],
      targetMonth: "2026-07",
      totalAmount: 200,
    };
    const previewInstallmentPrepaymentAction = vi
      .fn()
      .mockResolvedValue(preview);
    const advanceInstallmentsAction = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({
          transactions: [installmentTransaction()],
          nextInvoiceTransactions: [invoiceTransaction()],
          previewInstallmentPrepaymentAction,
          advanceInstallmentsAction,
        }),
      ),
    );

    fireEvent.click(screen.getByText("Invoice for data.paymentMethod.card"));
    await clickAdvanceMenuItem(user);

    await screen.findByText("Advance installments");
    expect(previewInstallmentPrepaymentAction).toHaveBeenCalledWith({
      scope: "remaining",
      targetMonth: "2026-07",
      transactionId: "installment-1",
    });

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText(/Advance 2 installments/),
    ).toBeInTheDocument();

    const countInput = within(dialog).getByLabelText(
      "Installments to advance",
    ) as HTMLInputElement;
    expect(countInput.value).toBe("2");
    fireEvent.change(countInput, { target: { value: "1" } });
    expect(countInput.value).toBe("1");

    fireEvent.click(within(dialog).getByText("Advance"));

    await vi.waitFor(() => {
      expect(advanceInstallmentsAction).toHaveBeenCalledWith({
        count: 1,
        scope: "remaining",
        targetMonth: "2026-07",
        transactionId: "installment-1",
      });
    });

    await vi.waitFor(() => {
      expect(
        screen.queryByText("Advance installments"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows an error toast and does not open the confirm dialog when there are no installments left", async () => {
    const user = userEvent.setup();
    const previewInstallmentPrepaymentAction = vi.fn().mockResolvedValue({
      count: 0,
      installments: [],
      targetMonth: "2026-07",
      totalAmount: 0,
    } satisfies InstallmentPrepaymentPreview);

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({
          transactions: [installmentTransaction()],
          nextInvoiceTransactions: [invoiceTransaction()],
          previewInstallmentPrepaymentAction,
        }),
      ),
    );

    fireEvent.click(screen.getByText("Invoice for data.paymentMethod.card"));
    await clickAdvanceMenuItem(user);

    await vi.waitFor(() => {
      expect(previewInstallmentPrepaymentAction).toHaveBeenCalled();
    });
    expect(screen.queryByText("Advance installments")).not.toBeInTheDocument();
  });

  it("shows an error toast when the preview action rejects", async () => {
    const user = userEvent.setup();
    const previewInstallmentPrepaymentAction = vi
      .fn()
      .mockRejectedValue(new Error("boom"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({
          transactions: [installmentTransaction()],
          nextInvoiceTransactions: [invoiceTransaction()],
          previewInstallmentPrepaymentAction,
        }),
      ),
    );

    fireEvent.click(screen.getByText("Invoice for data.paymentMethod.card"));
    await clickAdvanceMenuItem(user);

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error advancing installments:",
        expect.any(Error),
      );
    });
    expect(screen.queryByText("Advance installments")).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("shows an error toast when confirming the advance rejects", async () => {
    const user = userEvent.setup();
    const preview: InstallmentPrepaymentPreview = {
      count: 1,
      installments: [{ amount: 100, date: "2026-08-20", id: "installment-2" }],
      targetMonth: "2026-07",
      totalAmount: 100,
    };
    const previewInstallmentPrepaymentAction = vi
      .fn()
      .mockResolvedValue(preview);
    const advanceInstallmentsAction = vi
      .fn()
      .mockRejectedValue(new Error("advance failed"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({
          transactions: [installmentTransaction()],
          nextInvoiceTransactions: [invoiceTransaction()],
          previewInstallmentPrepaymentAction,
          advanceInstallmentsAction,
        }),
      ),
    );

    fireEvent.click(screen.getByText("Invoice for data.paymentMethod.card"));
    await clickAdvanceMenuItem(user);

    const dialog = await screen.findByRole("alertdialog");
    await vi.waitFor(() => {
      expect(within(dialog).getByText("Advance")).not.toBeDisabled();
    });
    fireEvent.click(within(dialog).getByText("Advance"));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error advancing installments:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("ignores non-finite advance-count input and clamps out-of-range values", async () => {
    const user = userEvent.setup();
    const preview: InstallmentPrepaymentPreview = {
      count: 3,
      installments: [
        { amount: 100, date: "2026-08-20", id: "installment-2" },
        { amount: 100, date: "2026-09-20", id: "installment-3" },
        { amount: 100, date: "2026-10-20", id: "installment-4" },
      ],
      targetMonth: "2026-07",
      totalAmount: 300,
    };
    const previewInstallmentPrepaymentAction = vi
      .fn()
      .mockResolvedValue(preview);

    render(
      React.createElement(
        TransactionsScreen,
        baseProps({
          transactions: [installmentTransaction()],
          nextInvoiceTransactions: [invoiceTransaction()],
          previewInstallmentPrepaymentAction,
        }),
      ),
    );

    fireEvent.click(screen.getByText("Invoice for data.paymentMethod.card"));
    await clickAdvanceMenuItem(user);

    const dialog = await screen.findByRole("alertdialog");
    const countInput = within(dialog).getByLabelText(
      "Installments to advance",
    ) as HTMLInputElement;
    await vi.waitFor(() => {
      expect(countInput.value).toBe("3");
    });

    fireEvent.change(countInput, { target: { value: "abc" } });
    expect(countInput.value).toBe("3");

    fireEvent.change(countInput, { target: { value: "99" } });
    expect(countInput.value).toBe("3");

    fireEvent.change(countInput, { target: { value: "0" } });
    expect(countInput.value).toBe("1");
  });
});

describe("PlannedBadge", () => {
  it("renders the invoice-specific label when isCreditCardInvoice is true", () => {
    render(
      React.createElement(PlannedBadge, {
        isCreditCardInvoice: true,
        t: (key: string) => translations[key] ?? key,
        className: "test-class",
      }),
    );

    expect(screen.getByText("Planned invoice")).toBeInTheDocument();
  });

  it("renders the plain planned label when isCreditCardInvoice is false", () => {
    render(
      React.createElement(PlannedBadge, {
        isCreditCardInvoice: false,
        t: (key: string) => translations[key] ?? key,
        className: "test-class",
      }),
    );

    expect(screen.getByText("Planned")).toBeInTheDocument();
  });
});

describe("TransactionTypeIndicator", () => {
  it("renders an up-right arrow for income", () => {
    const { container } = render(
      React.createElement(TransactionTypeIndicator, { type: "income" }),
    );
    expect(container.querySelector("svg")).toHaveClass("text-income");
  });

  it("renders a down-right arrow for expense", () => {
    const { container } = render(
      React.createElement(TransactionTypeIndicator, { type: "expense" }),
    );
    expect(container.querySelector("svg")).toHaveClass("text-expense");
  });

  it("renders a wallet icon for saving", () => {
    const { container } = render(
      React.createElement(TransactionTypeIndicator, { type: "saving" }),
    );
    expect(container.querySelector("svg")).toHaveClass("text-savings");
  });

  it("renders nothing for an unrecognized type", () => {
    const { container } = render(
      React.createElement(TransactionTypeIndicator, {
        type: "unknown" as never,
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
