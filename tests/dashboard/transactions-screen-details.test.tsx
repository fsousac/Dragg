import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { TransactionsScreen } from "@/components/dashboard/transactions-screen";
import { type Transaction } from "@/lib/data";
import {
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

const { mockPush, mockReplace, mockRefresh } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams("month=2026-07"),
}));

const translations: Record<string, string> = {
  "common.all": "All",
  "common.cancel": "Cancel",
  "common.category": "Select category",
  "common.date": "Date",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.saving": "Saving",
  "data.group.income": "Income",
  "data.group.needs": "Needs",
  "data.group.savings": "Savings",
  "data.group.wants": "Wants",
  "data.category.rent": "Rent",
  "data.category.entertainment": "Entertainment",
  "data.category.investments": "Investments",
  "data.category.receipts": "Receipts",
  "screen.transactions.add": "Add Transaction",
  "screen.transactions.planned": "Planned",
  "screen.transactions.plannedInvoice": "Planned invoice",
  "transaction.addDescription": "Fill in the details",
  "transaction.addTitle": "New transaction",
  "transaction.amount": "Transaction amount",
  "transaction.category": "Category",
  "transaction.creditCardInvoice": "Credit card invoice",
  "transaction.creditCardInvoiceFor": "Invoice for",
  "transaction.date": "Transaction date",
  "transaction.deleteConfirm": "Delete transaction?",
  "transaction.deleteDescription": "This cannot be undone.",
  "transaction.deleteError": "Could not delete the transaction.",
  "transaction.deleteSuccess": "Transaction deleted.",
  "transaction.description": "Description",
  "transaction.descriptionPlaceholder": "What was it for?",
  "transaction.detailsDescription": "Transaction details",
  "transaction.detailsTitle": "Transaction",
  "transaction.invoiceCycle": "Invoice cycle",
  "transaction.invoiceDetailsDescription": "Purchases in this invoice",
  "transaction.invoiceDueDate": "Due date",
  "transaction.invoicePurchases": "Purchases",
  "transaction.notes": "Notes",
  "transaction.paymentMethod": "Payment method",
  "transaction.recordError": "Could not save the transaction.",
  "transaction.recordSuccess": "Transaction saved.",
  "transaction.save": "Save",
  "transaction.saveChanges": "Save changes",
  "transaction.saving": "Saving...",
  "transaction.type": "Type",
  "transaction.typeExpense": "Expense",
  "transaction.typeIncome": "Income",
  "transaction.updateError": "Could not update the transaction.",
  "transaction.updateSuccess": "Transaction updated.",
  "transactions.installments.deleteAll": "Delete all",
  "transactions.installments.deleteAllConfirm":
    "All installments will be removed.",
  "transactions.installments.deleteAllTitle": "Delete all installments?",
  "transactions.installments.deleteOnlyThis": "Delete only this",
  "transactions.installments.deleteOnlyThisConfirm":
    "Only this installment will be removed.",
  "transactions.installments.deleteOnlyThisTitle":
    "Delete only this installment?",
  "transactions.installments.deleteThisAndFollowing":
    "Delete this and following",
  "transactions.installments.deleteThisAndFollowingConfirm":
    "This and following installments will be removed.",
  "transactions.installments.deleteThisAndFollowingTitle":
    "Delete this and following installments?",
  "transactions.subscriptions.deleteOnlyThis": "Delete only this occurrence",
  "transactions.subscriptions.deleteOnlyThisConfirm":
    "Only this occurrence will be removed.",
  "transactions.subscriptions.deleteOnlyThisTitle":
    "Delete only this occurrence?",
  "transactions.subscriptions.deleteThisAndFollowingUnpaid":
    "Delete this and following unpaid",
  "transactions.subscriptions.deleteThisAndFollowingUnpaidConfirm":
    "This and following unpaid occurrences will be removed.",
  "transactions.subscriptions.deleteThisAndFollowingUnpaidTitle":
    "Delete this and following unpaid occurrences?",
};

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => translations[key] ?? key,
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatDate: (value: string | Date) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : value,
    formatNumber: (value: number) => String(value),
    locale: "en",
  }),
}));

const categories: TransactionFormCategory[] = [
  {
    group: "needs",
    id: "cat-needs",
    icon: "🏠",
    label: "data.category.rent",
    monthlyLimit: 1000,
  },
  {
    group: "wants",
    id: "cat-wants",
    icon: "🎬",
    label: "data.category.entertainment",
    monthlyLimit: 300,
  },
  {
    group: "savings",
    id: "cat-savings",
    icon: "💰",
    label: "data.category.investments",
    monthlyLimit: 500,
  },
  {
    group: "income",
    id: "cat-income",
    icon: "💵",
    label: "data.category.receipts",
    monthlyLimit: 0,
  },
];

const incomeOnlyCategories: TransactionFormCategory[] = [
  {
    group: "income",
    id: "cat-income",
    icon: "💵",
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
    categoryKey: "data.category.rent",
    descriptionKey: "Transaction",
    group: "needs",
    icon: "🧾",
    type: "expense",
    ...overrides,
  };
}

type ScreenProps = React.ComponentProps<typeof TransactionsScreen>;

function baseProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
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
    showNextInvoice: false,
    showPrevious: false,
    transactions: [] as Transaction[],
    updateTransactionAction: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderScreen(overrides: Partial<ScreenProps> = {}) {
  return render(<TransactionsScreen {...baseProps(overrides)} />);
}

function createDeferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Returns the row's "open details" button for a transaction by its rendered description text. */
function getRowOpenButton(descriptionText: string) {
  return screen.getByText(descriptionText).closest("button")!;
}

/** Returns the row's "more actions" trigger button, or null if the row has none (invoice rows). */
function getRowMoreButton(descriptionText: string) {
  return getRowOpenButton(descriptionText)
    .nextElementSibling as HTMLElement | null;
}

async function openRowMenu(
  user: ReturnType<typeof userEvent.setup>,
  descriptionText: string,
) {
  const moreButton = getRowMoreButton(descriptionText)!;
  await user.click(moreButton);
  return screen.findByRole("menu");
}

const today = new Date().toISOString().slice(0, 10);
const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

describe("getInstallmentDeleteTitleKey / getInstallmentDeleteDescriptionKey via row menu", () => {
  const installmentTx = makeTransaction({
    id: "tx-installment",
    date: today,
    descriptionKey: "Laptop",
    installmentGroupId: "group-1",
    installmentNumber: 1,
    installmentTotal: 3,
  });

  it("shows the 'only this' title/description for the single scope", async () => {
    const user = userEvent.setup();
    renderScreen({ transactions: [installmentTx] });

    const menu = await openRowMenu(user, "Laptop");
    await user.click(within(menu).getByText("Delete only this"));

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText("Delete only this installment?"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Only this installment will be removed."),
    ).toBeInTheDocument();
  });

  it("shows the 'this and following' title/description", async () => {
    const user = userEvent.setup();
    renderScreen({ transactions: [installmentTx] });

    const menu = await openRowMenu(user, "Laptop");
    await user.click(within(menu).getByText("Delete this and following"));

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText("Delete this and following installments?"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "This and following installments will be removed.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the 'all' title/description", async () => {
    const user = userEvent.setup();
    renderScreen({ transactions: [installmentTx] });

    const menu = await openRowMenu(user, "Laptop");
    await user.click(within(menu).getByText("Delete all"));

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText("Delete all installments?"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("All installments will be removed."),
    ).toBeInTheDocument();
  });
});

describe("TransactionRowDeleteMenuItems - installment branch full confirm flow", () => {
  const installmentTx = makeTransaction({
    id: "tx-installment",
    date: today,
    descriptionKey: "Laptop",
    installmentGroupId: "group-1",
    installmentNumber: 1,
    installmentTotal: 3,
  });

  it("confirms deleting installments with the chosen scope, closes, and refreshes", async () => {
    const user = userEvent.setup();
    const deleteInstallmentsAction = vi.fn().mockResolvedValue(undefined);
    renderScreen({ transactions: [installmentTx], deleteInstallmentsAction });

    const menu = await openRowMenu(user, "Laptop");
    await user.click(within(menu).getByText("Delete this and following"));

    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByText("Delete"));

    await vi.waitFor(() => {
      expect(deleteInstallmentsAction).toHaveBeenCalledWith({
        scope: "this_and_following",
        transactionId: "tx-installment",
      });
    });
    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("logs and toasts an error when deleting installments rejects", async () => {
    const user = userEvent.setup();
    const deleteInstallmentsAction = vi
      .fn()
      .mockRejectedValue(new Error("boom"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderScreen({ transactions: [installmentTx], deleteInstallmentsAction });

    const menu = await openRowMenu(user, "Laptop");
    await user.click(within(menu).getByText("Delete all"));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByText("Delete"));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error deleting installments:",
        expect.any(Error),
      );
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("keeps the confirm dialog open while a delete is pending, then closes once it resolves", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<void>();
    const deleteInstallmentsAction = vi.fn().mockReturnValue(deferred.promise);
    renderScreen({ transactions: [installmentTx], deleteInstallmentsAction });

    const menu = await openRowMenu(user, "Laptop");
    await user.click(within(menu).getByText("Delete only this"));
    const dialog = screen.getByRole("alertdialog");
    const confirmButton = within(dialog).getByText("Delete");
    await user.click(confirmButton);

    await vi.waitFor(() => expect(confirmButton).toBeDisabled());

    await user.keyboard("{Escape}");
    // Still pending: the dialog must remain open.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    deferred.resolve();
    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });
});

describe("TransactionRowDeleteMenuItems - subscription branch", () => {
  const subscriptionTx = makeTransaction({
    id: "tx-subscription",
    date: today,
    descriptionKey: "Streaming",
    notes: "subscription:monthly",
  });

  it("shows the subscription title/description for the single scope and confirms it", async () => {
    const user = userEvent.setup();
    const deleteSubscriptionOccurrencesAction = vi
      .fn()
      .mockResolvedValue(undefined);
    renderScreen({
      transactions: [subscriptionTx],
      deleteSubscriptionOccurrencesAction,
    });

    const menu = await openRowMenu(user, "Streaming");
    await user.click(within(menu).getByText("Delete only this occurrence"));

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText("Delete only this occurrence?"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Only this occurrence will be removed."),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByText("Delete"));

    await vi.waitFor(() => {
      expect(deleteSubscriptionOccurrencesAction).toHaveBeenCalledWith({
        scope: "single",
        transactionId: "tx-subscription",
      });
    });
    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows the this-and-following-unpaid title/description", async () => {
    const user = userEvent.setup();
    renderScreen({ transactions: [subscriptionTx] });

    const menu = await openRowMenu(user, "Streaming");
    await user.click(
      within(menu).getByText("Delete this and following unpaid"),
    );

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText("Delete this and following unpaid occurrences?"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "This and following unpaid occurrences will be removed.",
      ),
    ).toBeInTheDocument();
  });

  it("logs and toasts an error when deleting subscription occurrences rejects", async () => {
    const user = userEvent.setup();
    const deleteSubscriptionOccurrencesAction = vi
      .fn()
      .mockRejectedValue(new Error("boom"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderScreen({
      transactions: [subscriptionTx],
      deleteSubscriptionOccurrencesAction,
    });

    const menu = await openRowMenu(user, "Streaming");
    await user.click(within(menu).getByText("Delete only this occurrence"));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByText("Delete"));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error deleting subscription occurrences:",
        expect.any(Error),
      );
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});

describe("TransactionRowDeleteMenuItems - default (plain transaction) branch", () => {
  const plainTx = makeTransaction({
    id: "tx-plain",
    date: today,
    descriptionKey: "Groceries",
  });

  it("opens the delete-transaction confirm dialog, confirms, closes and refreshes", async () => {
    const user = userEvent.setup();
    const deleteTransactionAction = vi.fn().mockResolvedValue(undefined);
    renderScreen({ transactions: [plainTx], deleteTransactionAction });

    const menu = await openRowMenu(user, "Groceries");
    await user.click(within(menu).getByText("Delete"));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Delete transaction?")).toBeInTheDocument();
    expect(
      within(dialog).getByText("This cannot be undone."),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByText("Delete"));

    await vi.waitFor(() => {
      expect(deleteTransactionAction).toHaveBeenCalledWith("tx-plain");
    });
    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("logs and toasts an error when deleting the transaction rejects", async () => {
    const user = userEvent.setup();
    const deleteTransactionAction = vi
      .fn()
      .mockRejectedValue(new Error("boom"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderScreen({ transactions: [plainTx], deleteTransactionAction });

    const menu = await openRowMenu(user, "Groceries");
    await user.click(within(menu).getByText("Delete"));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByText("Delete"));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error deleting transaction:",
        expect.any(Error),
      );
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("keeps the confirm dialog open while pending, then closes once resolved", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<void>();
    const deleteTransactionAction = vi.fn().mockReturnValue(deferred.promise);
    renderScreen({ transactions: [plainTx], deleteTransactionAction });

    const menu = await openRowMenu(user, "Groceries");
    await user.click(within(menu).getByText("Delete"));
    const dialog = screen.getByRole("alertdialog");
    const confirmButton = within(dialog).getByText("Delete");
    await user.click(confirmButton);

    await vi.waitFor(() => expect(confirmButton).toBeDisabled());
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    deferred.resolve();
    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("opens the details dialog via the row's Edit menu item", async () => {
    const user = userEvent.setup();
    renderScreen({ transactions: [plainTx] });

    const menu = await openRowMenu(user, "Groceries");
    await user.click(within(menu).getByText("Edit"));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Transaction")).toBeInTheDocument();
  });

  it("opens the details dialog by clicking the row itself", async () => {
    const user = userEvent.setup();
    renderScreen({ transactions: [plainTx] });

    await user.click(getRowOpenButton("Groceries"));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});

describe("TransactionRow rendering variants", () => {
  it("does not render a more-actions menu for credit card invoice rows", () => {
    const invoiceRow = makeTransaction({
      id: "tx-cc-invoice",
      date: today,
      descriptionKey: "Card invoice",
      isCreditCardInvoice: true,
      paymentMethodKey: "data.paymentMethod.card",
      invoice: {
        closingDate: today,
        dueDate: today,
        paidAmount: 0,
        paymentMethodKey: "data.paymentMethod.card",
        purchases: [],
        totalAmount: -10,
        startsAt: today,
      },
    });
    renderScreen({ transactions: [invoiceRow] });

    expect(getRowMoreButton("Invoice for data.paymentMethod.card")).toBeNull();
  });

  it("shows the planned badge for future planned transactions and excludes invoices from the day net", () => {
    const plannedTx = makeTransaction({
      id: "tx-planned",
      date: future,
      descriptionKey: "Future rent",
      isPlanned: true,
      amount: -100,
    });
    const invoiceSameDay = makeTransaction({
      id: "tx-invoice-same-day",
      date: future,
      descriptionKey: "Same day invoice",
      isCreditCardInvoice: true,
      amount: -900,
      paymentMethodKey: "data.paymentMethod.card",
      invoice: {
        closingDate: future,
        dueDate: future,
        paidAmount: 0,
        paymentMethodKey: "data.paymentMethod.card",
        purchases: [],
        totalAmount: -900,
        startsAt: future,
      },
    });
    renderScreen({ transactions: [plannedTx, invoiceSameDay] });

    expect(screen.getAllByText("Planned").length).toBeGreaterThan(0);
    // Day net excludes the invoice's -900, leaving only the planned -100.
    expect(screen.getByText("−$100.00")).toBeInTheDocument();
  });

  it("shows the invoice-flavored planned badge for planned credit card invoices", () => {
    const plannedInvoice = makeTransaction({
      id: "tx-planned-invoice",
      date: future,
      descriptionKey: "Planned invoice row",
      isPlanned: true,
      isCreditCardInvoice: true,
      paymentMethodKey: "data.paymentMethod.card",
      invoice: {
        closingDate: future,
        dueDate: future,
        paidAmount: 0,
        paymentMethodKey: "data.paymentMethod.card",
        purchases: [],
        totalAmount: -10,
        startsAt: future,
      },
    });
    renderScreen({ transactions: [plannedInvoice] });

    expect(screen.getAllByText("Planned invoice").length).toBeGreaterThan(0);
  });
});

describe("dateGroups grouping", () => {
  it("groups multiple transactions that share the same date together", () => {
    const first = makeTransaction({
      id: "tx-a",
      date: "2026-07-05",
      descriptionKey: "First same-day",
    });
    const second = makeTransaction({
      id: "tx-b",
      date: "2026-07-05",
      descriptionKey: "Second same-day",
    });
    renderScreen({ transactions: [first, second] });

    expect(screen.getByText("First same-day")).toBeInTheDocument();
    expect(screen.getByText("Second same-day")).toBeInTheDocument();
  });
});

describe("Next invoice filtering", () => {
  it("filters next-invoice transactions by group and search query", async () => {
    const user = userEvent.setup();
    const nextInvoiceTransactions = [
      makeTransaction({
        id: "next-needs",
        date: future,
        descriptionKey: "Rent installment",
        group: "needs",
        isCreditCardInvoicePurchase: true,
      }),
      makeTransaction({
        id: "next-wants",
        date: future,
        descriptionKey: "Movie ticket",
        group: "wants",
        isCreditCardInvoicePurchase: true,
      }),
    ];
    renderScreen({ showNextInvoice: true, nextInvoiceTransactions });

    expect(screen.getByText("Rent installment")).toBeInTheDocument();
    expect(screen.getByText("Movie ticket")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Needs"));

    expect(screen.getByText("Rent installment")).toBeInTheDocument();
    expect(screen.queryByText("Movie ticket")).not.toBeInTheDocument();
  });

  it("filters next-invoice transactions by search text", async () => {
    const user = userEvent.setup();
    const nextInvoiceTransactions = [
      makeTransaction({
        id: "next-a",
        date: future,
        descriptionKey: "Zzyzx widget",
        isCreditCardInvoicePurchase: true,
      }),
      makeTransaction({
        id: "next-b",
        date: future,
        descriptionKey: "Coffee",
        isCreditCardInvoicePurchase: true,
      }),
    ];
    renderScreen({ showNextInvoice: true, nextInvoiceTransactions });

    const searchInput = screen.getByPlaceholderText(/./);
    await user.type(searchInput, "zzyzx");

    expect(screen.getByText("Zzyzx widget")).toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
  });

  it("matches a credit card invoice's derived title/payment method against the search query, and shows its positive amount with a '+' prefix", async () => {
    const user = userEvent.setup();
    const nextInvoiceTransactions = [
      makeTransaction({
        id: "next-invoice-a",
        date: future,
        isCreditCardInvoice: true,
        amount: 150,
        paymentMethodKey: "data.paymentMethod.card",
        invoice: {
          closingDate: future,
          dueDate: future,
          paidAmount: 0,
          paymentMethodKey: "data.paymentMethod.card",
          purchases: [],
          totalAmount: -10,
          startsAt: future,
        },
      }),
      makeTransaction({
        id: "next-b",
        date: future,
        descriptionKey: "Coffee",
        isCreditCardInvoicePurchase: true,
      }),
    ];
    renderScreen({ showNextInvoice: true, nextInvoiceTransactions });

    expect(screen.getByText("+$150.00")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/./);
    await user.type(searchInput, "card");

    expect(
      screen.getByText("Invoice for data.paymentMethod.card"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
  });
});

describe("Transaction details dialog - invoice view", () => {
  function buildInvoiceTransaction(): Transaction {
    return makeTransaction({
      id: "tx-invoice",
      date: today,
      descriptionKey: "Invoice row",
      isCreditCardInvoice: true,
      amount: -300,
      paymentMethodKey: "data.paymentMethod.card",
      invoice: {
        closingDate: today,
        dueDate: today,
        paidAmount: 0,
        paymentMethodKey: "data.paymentMethod.card",
        purchases: [
          {
            amount: -100,
            categoryKey: "data.category.rent",
            date: today,
            descriptionKey: "Matched installment",
            id: "installment-matched",
            installmentLabel: "1/3",
          },
          {
            amount: -50,
            categoryKey: "data.category.rent",
            date: today,
            descriptionKey: "Fully paid installment",
            id: "installment-paid",
            installmentLabel: "3/3",
          },
          {
            amount: -20,
            categoryKey: "data.category.rent",
            date: today,
            descriptionKey: "One-off purchase",
            id: "purchase-no-label",
          },
        ],
        totalAmount: -170,
        startsAt: today,
      },
    });
  }

  function matchedInstallmentTransaction(): Transaction {
    return makeTransaction({
      id: "installment-matched",
      date: today,
      descriptionKey: "Matched installment",
      installmentGroupId: "group-invoice",
      installmentNumber: 1,
      installmentTotal: 3,
    });
  }

  it("opens the installment purchase from the invoice, then returns to the invoice on cancel", async () => {
    const user = userEvent.setup();
    renderScreen({
      transactions: [matchedInstallmentTransaction()],
      nextInvoiceTransactions: [buildInvoiceTransaction()],
      showNextInvoice: true,
    });

    await user.click(screen.getByText("Invoice for data.paymentMethod.card"));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("Purchases")).toBeInTheDocument();

    const purchaseRow = within(dialog)
      .getByText("Matched installment")
      .closest(".px-4.py-3") as HTMLElement;
    await user.click(within(purchaseRow).getByRole("button"));
    await user.click(await screen.findByText("Edit"));

    // Now viewing/editing the matched installment transaction directly.
    expect(screen.getByDisplayValue("Matched installment")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));

    // Back to the invoice view (invoiceOrigin restored).
    expect(await screen.findByText("Purchases")).toBeInTheDocument();
  });

  it("does not render edit/advance buttons for purchases without a matching local transaction or eligible installment", async () => {
    const user = userEvent.setup();
    renderScreen({
      transactions: [],
      nextInvoiceTransactions: [buildInvoiceTransaction()],
      showNextInvoice: true,
    });

    await user.click(screen.getByText("Invoice for data.paymentMethod.card"));
    await screen.findByText("Purchases");

    // Advancing is gated on the "N/M" installment label alone (not on a
    // local match), so the "1/3" purchase still offers a menu with Advance,
    // but no Edit/Delete items since no local transaction matches it.
    const matchedRow = screen
      .getByText("Matched installment")
      .closest(".px-4.py-3") as HTMLElement;
    await user.click(within(matchedRow).getByRole("button"));
    const matchedMenu = await screen.findByRole("menu");
    expect(within(matchedMenu).queryByText("Edit")).not.toBeInTheDocument();
    expect(
      matchedMenu.querySelector("svg.lucide-calendar-arrow-down"),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");

    // ...but "3/3" (fully paid) and the label-less purchase get no menu at
    // all: no local match to edit/delete, and not eligible to advance.
    const paidRow = screen
      .getByText("Fully paid installment")
      .closest(".px-4.py-3") as HTMLElement;
    expect(within(paidRow).queryByRole("button")).not.toBeInTheDocument();
    const noLabelRow = screen
      .getByText("One-off purchase")
      .closest(".px-4.py-3") as HTMLElement;
    expect(within(noLabelRow).queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the advance confirm dialog once the pending preview resolves", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<{
      count: number;
      installments: { amount: number; date: string; id: string }[];
      targetMonth: string;
      totalAmount: number;
    }>();
    const previewInstallmentPrepaymentAction = vi
      .fn()
      .mockReturnValue(deferred.promise);
    renderScreen({
      transactions: [matchedInstallmentTransaction()],
      nextInvoiceTransactions: [buildInvoiceTransaction()],
      showNextInvoice: true,
      previewInstallmentPrepaymentAction,
    });

    await user.click(screen.getByText("Invoice for data.paymentMethod.card"));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText("Purchases");

    const purchaseRow = within(dialog)
      .getByText("Matched installment")
      .closest(".px-4.py-3") as HTMLElement;
    await user.click(within(purchaseRow).getByRole("button"));
    const menu = await screen.findByRole("menu");
    const advanceItem = menu
      .querySelector("svg.lucide-calendar-arrow-down")
      ?.closest("[role='menuitem']") as HTMLElement;
    await user.click(advanceItem);

    expect(previewInstallmentPrepaymentAction).toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    deferred.resolve({
      count: 1,
      installments: [{ amount: 100, date: future, id: "installment-2" }],
      targetMonth: "2026-07",
      totalAmount: 100,
    });

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("ignores a non-finite value typed into the advance-count input", async () => {
    const user = userEvent.setup();
    const previewInstallmentPrepaymentAction = vi.fn().mockResolvedValue({
      count: 3,
      installments: [
        { amount: 100, date: future, id: "installment-2" },
        { amount: 100, date: future, id: "installment-3" },
        { amount: 100, date: future, id: "installment-4" },
      ],
      targetMonth: "2026-07",
      totalAmount: 300,
    });
    renderScreen({
      transactions: [matchedInstallmentTransaction()],
      nextInvoiceTransactions: [buildInvoiceTransaction()],
      showNextInvoice: true,
      previewInstallmentPrepaymentAction,
    });

    await user.click(screen.getByText("Invoice for data.paymentMethod.card"));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText("Purchases");

    const purchaseRow = within(dialog)
      .getByText("Matched installment")
      .closest(".px-4.py-3") as HTMLElement;
    await user.click(within(purchaseRow).getByRole("button"));
    const menu = await screen.findByRole("menu");
    const advanceItem = menu
      .querySelector("svg.lucide-calendar-arrow-down")
      ?.closest("[role='menuitem']") as HTMLElement;
    await user.click(advanceItem);

    const countInput = await screen.findByRole("spinbutton");
    expect(countInput).toHaveValue(3);

    // "1e400" is a syntactically valid number-input value that evaluates to
    // Infinity, so it exercises the non-finite guard without ever emptying
    // the field (which the earlier trim-check already short-circuits on).
    fireChange(countInput, "1e400");

    expect(countInput).toHaveValue(3);
  });
});

describe("Transaction details dialog - edit mode", () => {
  it("updates amount, description, date, category, payment method and notes fields, then saves them all", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-edit",
      date: "2026-07-01",
      descriptionKey: "Edit me",
      categoryId: "cat-wants",
      paymentMethodId: "pm-card",
      notes: "old notes",
      amount: -50,
    });
    const updateTransactionAction = vi.fn().mockResolvedValue(undefined);
    renderScreen({ transactions: [plainTx], updateTransactionAction });

    await user.click(getRowOpenButton("Edit me"));
    const dialog = await screen.findByRole("dialog");

    const amountInput = within(dialog).getByLabelText("Transaction amount");
    fireChange(amountInput, "5000");

    const descriptionInput = within(dialog).getByLabelText("Description");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated description");

    const dateInput = within(dialog).getByLabelText("Transaction date");
    fireChange(dateInput, "2026-07-15");

    await user.click(within(dialog).getByLabelText("Category"));
    let listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Rent"));

    await user.click(within(dialog).getByLabelText("Payment method"));
    listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Payment method"));

    const notesInput = within(dialog).getByLabelText("Notes");
    await user.clear(notesInput);
    await user.type(notesInput, "new notes");

    await user.click(within(dialog).getByText("Save changes"));

    await vi.waitFor(() => {
      expect(updateTransactionAction).toHaveBeenCalledWith({
        amount: 50,
        category: "cat-needs",
        date: "2026-07-15",
        description: "Updated description",
        id: "tx-edit",
        notes: "new notes",
        paymentMethod: "none",
        type: "expense",
      });
    });
  });

  it("saves changes successfully: calls updateTransactionAction, closes, and refreshes", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-save",
      date: "2026-07-01",
      descriptionKey: "Save me",
      categoryId: "cat-wants",
      paymentMethodId: "pm-card",
      amount: -50,
    });
    const updateTransactionAction = vi.fn().mockResolvedValue(undefined);
    renderScreen({ transactions: [plainTx], updateTransactionAction });

    await user.click(getRowOpenButton("Save me"));
    const dialog = await screen.findByRole("dialog");

    const descriptionInput = within(dialog).getByLabelText("Description");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Saved description");

    await user.click(within(dialog).getByText("Save changes"));

    await vi.waitFor(() => {
      expect(updateTransactionAction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "tx-save",
          description: "Saved description",
        }),
      );
    });
    await vi.waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("disables save when the description is blank", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-blank",
      date: "2026-07-01",
      descriptionKey: "Blank me",
    });
    renderScreen({ transactions: [plainTx] });

    await user.click(getRowOpenButton("Blank me"));
    const dialog = await screen.findByRole("dialog");
    const descriptionInput = within(dialog).getByLabelText("Description");
    await user.clear(descriptionInput);

    expect(within(dialog).getByText("Save changes")).toBeDisabled();
  });

  it("logs and toasts an error when updating the transaction rejects", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-error",
      date: "2026-07-01",
      descriptionKey: "Error me",
    });
    const updateTransactionAction = vi
      .fn()
      .mockRejectedValue(new Error("boom"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderScreen({ transactions: [plainTx], updateTransactionAction });

    await user.click(getRowOpenButton("Error me"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Save changes"));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating transaction:",
        expect.any(Error),
      );
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("closes via the Cancel button without calling updateTransactionAction", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-cancel",
      date: "2026-07-01",
      descriptionKey: "Cancel me",
    });
    const updateTransactionAction = vi.fn().mockResolvedValue(undefined);
    renderScreen({ transactions: [plainTx], updateTransactionAction });

    await user.click(getRowOpenButton("Cancel me"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Cancel"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(updateTransactionAction).not.toHaveBeenCalled();
  });

  it("closes via the dialog's close button", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-close-x",
      date: "2026-07-01",
      descriptionKey: "Close me",
    });
    renderScreen({ transactions: [plainTx] });

    await user.click(getRowOpenButton("Close me"));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open while an update is pending, then closes once resolved", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-pending",
      date: "2026-07-01",
      descriptionKey: "Pending me",
    });
    const deferred = createDeferred<void>();
    const updateTransactionAction = vi.fn().mockReturnValue(deferred.promise);
    renderScreen({ transactions: [plainTx], updateTransactionAction });

    await user.click(getRowOpenButton("Pending me"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Save changes"));

    await vi.waitFor(() =>
      expect(within(dialog).getByText("Saving...")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    // Still pending: closeTransactionDialog's isPending guard keeps it open.
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    deferred.resolve();
    await vi.waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("resolveCategoryForType: keeps a still-valid category, resets to income, then falls back on return to expense", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-type-switch",
      date: "2026-07-01",
      descriptionKey: "Type switch",
      categoryId: "cat-wants",
      type: "expense",
    });
    renderScreen({ transactions: [plainTx] });

    await user.click(getRowOpenButton("Type switch"));
    const dialog = await screen.findByRole("dialog");

    // expense -> saving: category stays valid ("cat-wants" is in categoryOptions).
    await user.click(within(dialog).getByLabelText("Type"));
    let listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Saving"));
    expect(within(dialog).getByText("Entertainment")).toBeInTheDocument();

    // saving -> income: category becomes the income category id.
    await user.click(within(dialog).getByLabelText("Type"));
    listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Income"));

    // Category select should now only offer the income category option.
    await user.click(within(dialog).getByLabelText("Category"));
    listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(1);
    expect(within(listbox).getByText("Receipts")).toBeInTheDocument();
    await user.click(within(listbox).getByText("Receipts"));

    // income -> expense: previous category (income id) is no longer valid,
    // so it falls back to the first category option (needs group sorts first).
    await user.click(within(dialog).getByLabelText("Type"));
    listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Expense"));
    expect(within(dialog).getByText("Rent")).toBeInTheDocument();
  });

  it("falls back to 'none' when switching away from income with no category options available", async () => {
    const user = userEvent.setup();
    const incomeTx = makeTransaction({
      id: "tx-income-only",
      date: "2026-07-01",
      descriptionKey: "Income only",
      type: "income",
      categoryId: "cat-income",
    });
    renderScreen({
      transactions: [incomeTx],
      categories: incomeOnlyCategories,
    });

    await user.click(getRowOpenButton("Income only"));
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByLabelText("Type"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Expense"));

    // No throw, and the category select still renders with the "none" fallback item.
    expect(within(dialog).getByLabelText("Category")).toBeInTheDocument();
  });
});

describe("Transaction details dialog - delete button variants in the footer", () => {
  it("shows the split delete button for installments and confirms the 'single' scope from the main button", async () => {
    const user = userEvent.setup();
    const installmentTx = makeTransaction({
      id: "tx-installment-footer",
      date: "2026-07-01",
      descriptionKey: "Footer installment",
      installmentGroupId: "group-footer",
      installmentNumber: 1,
      installmentTotal: 2,
    });
    renderScreen({ transactions: [installmentTx] });

    await user.click(getRowOpenButton("Footer installment"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Delete"));

    const alertDialog = screen.getByRole("alertdialog");
    expect(
      within(alertDialog).getByText("Delete only this installment?"),
    ).toBeInTheDocument();
  });

  it("opens the footer split-dropdown and selects this-and-following / all", async () => {
    const user = userEvent.setup();
    const installmentTx = makeTransaction({
      id: "tx-installment-footer-2",
      date: "2026-07-01",
      descriptionKey: "Footer installment 2",
      installmentGroupId: "group-footer-2",
      installmentNumber: 1,
      installmentTotal: 2,
    });
    renderScreen({ transactions: [installmentTx] });

    await user.click(getRowOpenButton("Footer installment 2"));
    const dialog = await screen.findByRole("dialog");
    const splitTrigger = dialog.querySelector(
      "button.rounded-l-none",
    ) as HTMLElement;
    await user.click(splitTrigger);

    const menu = await screen.findByRole("menu");
    await user.click(within(menu).getByText("Delete this and following"));
    expect(
      within(screen.getByRole("alertdialog")).getByText(
        "Delete this and following installments?",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(screen.getByRole("alertdialog")).getByText("Cancel"),
    );

    await user.click(splitTrigger);
    const menu2 = await screen.findByRole("menu");
    await user.click(within(menu2).getByText("Delete all"));
    expect(
      within(screen.getByRole("alertdialog")).getByText(
        "Delete all installments?",
      ),
    ).toBeInTheDocument();
  });

  it("calls onDeleteSubscriptionOccurrences with scope 'single' for subscription transactions", async () => {
    const user = userEvent.setup();
    const subscriptionTx = makeTransaction({
      id: "tx-subscription-footer",
      date: "2026-07-01",
      descriptionKey: "Footer subscription",
      notes: "subscription:weekly",
    });
    renderScreen({ transactions: [subscriptionTx] });

    await user.click(getRowOpenButton("Footer subscription"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Delete"));

    const alertDialog = screen.getByRole("alertdialog");
    expect(
      within(alertDialog).getByText("Delete only this occurrence?"),
    ).toBeInTheDocument();
  });

  it("calls onDeleteTransaction for a plain transaction via the footer delete button", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-plain-footer",
      date: "2026-07-01",
      descriptionKey: "Footer plain",
    });
    renderScreen({ transactions: [plainTx] });

    await user.click(getRowOpenButton("Footer plain"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Delete"));

    const alertDialog = screen.getByRole("alertdialog");
    expect(
      within(alertDialog).getByText("Delete transaction?"),
    ).toBeInTheDocument();
  });
});

describe("ConfirmActionAlertDialog onOpenChange guard", () => {
  it("keeps the delete-transaction confirm alert open while pending via Escape, closes once resolved", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-confirm-pending",
      date: "2026-07-01",
      descriptionKey: "Confirm pending",
    });
    const deferred = createDeferred<void>();
    const deleteTransactionAction = vi.fn().mockReturnValue(deferred.promise);
    renderScreen({ transactions: [plainTx], deleteTransactionAction });

    await user.click(getRowOpenButton("Confirm pending"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Delete"));

    const alertDialog = screen.getByRole("alertdialog");
    const confirmButton = within(alertDialog).getByText("Delete");
    await user.click(confirmButton);

    await vi.waitFor(() => expect(confirmButton).toBeDisabled());
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    deferred.resolve();
    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("closes the confirm alert via Escape when nothing is pending", async () => {
    const user = userEvent.setup();
    const plainTx = makeTransaction({
      id: "tx-confirm-escape",
      date: "2026-07-01",
      descriptionKey: "Confirm escape",
    });
    renderScreen({ transactions: [plainTx] });

    await user.click(getRowOpenButton("Confirm escape"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Delete"));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });
});

describe("Add transaction flow (handleNewTransactionSubmit)", () => {
  it("submits with 'none' category/payment method and undefined notes when nothing is available/filled", async () => {
    const user = userEvent.setup();
    const createTransactionAction = vi.fn().mockResolvedValue(undefined);
    renderScreen({
      categories: incomeOnlyCategories,
      paymentMethods: [],
      createTransactionAction,
    });

    await user.click(screen.getByText("Add Transaction"));
    const dialog = await screen.findByRole("dialog");

    await user.type(
      within(dialog).getByLabelText("Description"),
      "New expense",
    );
    const amountInput = within(dialog).getByLabelText("Transaction amount");
    fireChange(amountInput, "5000");

    await user.click(within(dialog).getByRole("button", { name: /Save/ }));

    await vi.waitFor(() => {
      expect(createTransactionAction).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "",
          paymentMethod: "",
          notes: undefined,
          description: "New expense",
        }),
      );
    });
  });

  it("submits with real category/payment method ids and trimmed notes when filled in", async () => {
    const user = userEvent.setup();
    const createTransactionAction = vi.fn().mockResolvedValue(undefined);
    renderScreen({ categories, paymentMethods, createTransactionAction });

    await user.click(screen.getByText("Add Transaction"));
    const dialog = await screen.findByRole("dialog");

    await user.type(
      within(dialog).getByLabelText("Description"),
      "New savings",
    );
    const amountInput = within(dialog).getByLabelText("Transaction amount");
    fireChange(amountInput, "2500");
    await user.click(within(dialog).getByText("Entertainment"));
    await user.type(within(dialog).getByLabelText("Notes"), "  some notes  ");

    await user.click(within(dialog).getByRole("button", { name: /Save/ }));

    await vi.waitFor(() => {
      expect(createTransactionAction).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "cat-wants",
          paymentMethod: "pm-card",
          notes: "some notes",
          description: "New savings",
        }),
      );
    });
  });
});

/** Mimics a mobile-keyboard `input` event by dispatching a native change with the given value. */
function fireChange(element: HTMLElement, value: string) {
  const input = element as HTMLInputElement;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  nativeSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
