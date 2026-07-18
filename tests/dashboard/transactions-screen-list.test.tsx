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

const searchParamsState = vi.hoisted(() => ({ search: "month=2026-07" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsState.search),
}));

const translations: Record<string, string> = {
  "common.all": "All",
  "common.date": "Date",
  "common.amount": "Amount",
  "common.today": "Today",
  "common.yesterday": "Yesterday",
  "data.group.needs": "Needs",
  "data.group.wants": "Wants",
  "data.group.savings": "Savings",
  "data.group.income": "Income",
  "dashboard.summary.totalIncome": "Total Income",
  "dashboard.summary.totalExpenses": "Total Expenses",
  "dashboard.summary.totalSaved": "Total Saved",
  "dashboard.summary.currentBalance": "Current Balance",
  "screen.transactions.title": "Transactions",
  "screen.transactions.description": "View and manage all your transactions",
  "screen.transactions.add": "Add Transaction",
  "screen.transactions.count": "Transactions",
  "screen.transactions.searchPlaceholder": "Name, group, or note",
  "screen.transactions.clearFilters": "Clear filters",
  "screen.transactions.showNextInvoice": "Show next invoice",
  "screen.transactions.hideNextInvoice": "Hide next invoice",
  "screen.transactions.showPrevious": "Show previous",
  "screen.transactions.hidePrevious": "Hide previous",
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

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

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

const paymentMethods: TransactionFormPaymentMethod[] = [
  { id: "pm-1", label: "transaction.paymentMethods.creditCard", type: "credit_card" },
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

const transactions: Transaction[] = [
  makeTransaction({
    id: "tx-today",
    date: today,
    amount: -120,
    descriptionKey: "Grocery Store",
    categoryKey: "data.category.rent",
    group: "needs",
    type: "expense",
  }),
  makeTransaction({
    id: "tx-yesterday",
    date: yesterday,
    amount: -45,
    descriptionKey: "Movie Tickets",
    categoryKey: "data.category.entertainment",
    group: "wants",
    type: "expense",
  }),
  makeTransaction({
    id: "tx-savings",
    date: "2026-07-10",
    amount: -200,
    descriptionKey: "Emergency Fund",
    categoryKey: "data.category.investments",
    group: "savings",
    type: "saving",
  }),
  makeTransaction({
    id: "tx-income",
    date: "2026-07-01",
    amount: 2500,
    descriptionKey: "Paycheck",
    categoryKey: "data.category.receipts",
    group: "income",
    type: "income",
  }),
  makeTransaction({
    id: "tx-outside-month",
    date: "2026-06-20",
    amount: -75,
    descriptionKey: "June CC Purchase",
    categoryKey: "data.category.rent",
    group: "needs",
    type: "expense",
    isCreditCardInvoicePurchase: true,
  }),
  makeTransaction({
    id: "tx-unique",
    date: "2026-07-05",
    amount: -15,
    descriptionKey: "Zzyzx Gadget",
    categoryKey: "data.category.entertainment",
    group: "wants",
    type: "expense",
    notes: "rare gizmo",
  }),
];

function noop() {
  return Promise.resolve();
}

type ScreenProps = React.ComponentProps<typeof TransactionsScreen>;

function renderScreen(overrides: Partial<ScreenProps> = {}) {
  return render(
    <TransactionsScreen
      categories={categories}
      advanceInstallmentsAction={noop}
      createCategoryAction={noop}
      createTransactionAction={noop}
      deleteInstallmentsAction={noop}
      deleteSubscriptionOccurrencesAction={noop}
      deleteTransactionAction={noop}
      monthlySummary={{
        totalIncome: 2500,
        totalExpenses: 440,
        totalSavings: 200,
      }}
      nextInvoiceTransactions={[]}
      paymentMethods={paymentMethods}
      previewInstallmentPrepaymentAction={() =>
        Promise.resolve({ count: 0, installments: [], targetMonth: "2026-07", totalAmount: 0 })
      }
      showNextInvoice={false}
      showPrevious={false}
      transactions={transactions}
      updateTransactionAction={noop}
      {...overrides}
    />,
  );
}

describe("TransactionsScreen list rendering", () => {
  it("renders summary chips and all in-month transactions, excluding out-of-month invoice purchases", () => {
    const { container } = renderScreen();
    const summaryChips = within(
      container.querySelector(".grid.grid-cols-2")!,
    );

    expect(screen.getByText("Total Income")).toBeInTheDocument();
    expect(summaryChips.getByText("$2500.00")).toBeInTheDocument();
    expect(summaryChips.getByText("$440.00")).toBeInTheDocument();
    expect(summaryChips.getByText("$200.00")).toBeInTheDocument();
    // balance = income - expenses - savings = 2500 - 440 - 200 = 1860
    expect(summaryChips.getByText("$1860.00")).toBeInTheDocument();

    expect(screen.getByText("5 Transactions")).toBeInTheDocument();
    expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    expect(screen.getByText("Movie Tickets")).toBeInTheDocument();
    expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
    expect(screen.getByText("Paycheck")).toBeInTheDocument();
    expect(screen.getByText("Zzyzx Gadget")).toBeInTheDocument();
    expect(screen.queryByText("June CC Purchase")).not.toBeInTheDocument();

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("filters by search text and clears via the inline clear button", async () => {
    const user = userEvent.setup();
    renderScreen();

    const searchInput = screen.getByPlaceholderText("Name, group, or note");
    await user.type(searchInput, "zzyzx");

    expect(screen.getByText("Zzyzx Gadget")).toBeInTheDocument();
    expect(screen.queryByText("Grocery Store")).not.toBeInTheDocument();
    expect(screen.getByText("1 Transactions")).toBeInTheDocument();

    const clearInlineButton = searchInput.parentElement?.querySelector("button");
    expect(clearInlineButton).toBeTruthy();
    await user.click(clearInlineButton!);

    expect(searchInput).toHaveValue("");
    expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    expect(screen.getByText("5 Transactions")).toBeInTheDocument();
  });

  it("matches search text against notes", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(
      screen.getByPlaceholderText("Name, group, or note"),
      "rare gizmo",
    );

    expect(screen.getByText("Zzyzx Gadget")).toBeInTheDocument();
    expect(screen.getByText("1 Transactions")).toBeInTheDocument();
  });

  it("shows the clear filters button once a search query is active, and it resets state", async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Name, group, or note");
    await user.type(searchInput, "grocery");

    const clearFiltersButton = screen.getByText("Clear filters");
    await user.click(clearFiltersButton);

    expect(searchInput).toHaveValue("");
    expect(screen.getByText("5 Transactions")).toBeInTheDocument();
  });

  it("filters by group using the group select", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Needs"));

    expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    expect(screen.queryByText("Movie Tickets")).not.toBeInTheDocument();
    expect(screen.queryByText("Paycheck")).not.toBeInTheDocument();
    expect(screen.getByText("1 Transactions")).toBeInTheDocument();
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("shows an empty list (zero count, no rows) when no transaction matches the filters", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(
      screen.getByPlaceholderText("Name, group, or note"),
      "nothing-matches-this-query",
    );

    expect(screen.getByText("0 Transactions")).toBeInTheDocument();
    expect(screen.queryByText("Grocery Store")).not.toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });

  it("toggles amount sort order when the amount sort button is clicked", async () => {
    const user = userEvent.setup();
    renderScreen();

    const getDescriptionOrder = () =>
      screen
        .getAllByText(
          /Grocery Store|Movie Tickets|Emergency Fund|Paycheck|Zzyzx Gadget/,
        )
        .map((element) => element.textContent);

    await user.click(screen.getByRole("button", { name: /Amount/ }));
    const descOrder = getDescriptionOrder();
    // amount-desc: abs values 2500, 200, 120, 45, 15
    expect(descOrder).toEqual([
      "Paycheck",
      "Emergency Fund",
      "Grocery Store",
      "Movie Tickets",
      "Zzyzx Gadget",
    ]);

    await user.click(screen.getByRole("button", { name: /Amount/ }));
    const ascOrder = getDescriptionOrder();
    expect(ascOrder).toEqual([...descOrder].reverse());
  });

  it("toggles date sort order when the date sort button is clicked", async () => {
    const user = userEvent.setup();
    renderScreen();

    // Default sort is date-desc; clicking Date toggles to date-asc.
    await user.click(screen.getByRole("button", { name: /Date/ }));

    const dateHeadings = screen
      .getAllByText(/Today|Yesterday|Jul/)
      .map((element) => element.textContent);
    // Earliest date group ("Paycheck" on 2026-07-01) should now render first.
    expect(dateHeadings[0]).not.toBe("Today");

    await user.click(screen.getByRole("button", { name: /Date/ }));
    const dateHeadingsDesc = screen
      .getAllByText(/Today|Yesterday|Jul/)
      .map((element) => element.textContent);
    expect(dateHeadingsDesc[0]).toBe("Today");
  });

  it("renders the show-previous / hide-previous link based on showPrevious prop", () => {
    const { rerender } = renderScreen({ showPrevious: false });
    expect(screen.getByText("Show previous")).toBeInTheDocument();

    rerender(
      <TransactionsScreen
        categories={categories}
        advanceInstallmentsAction={noop}
        createCategoryAction={noop}
        createTransactionAction={noop}
        deleteInstallmentsAction={noop}
        deleteSubscriptionOccurrencesAction={noop}
        deleteTransactionAction={noop}
        monthlySummary={{
          totalIncome: 2500,
          totalExpenses: 440,
          totalSavings: 200,
        }}
        nextInvoiceTransactions={[]}
        paymentMethods={paymentMethods}
        previewInstallmentPrepaymentAction={() =>
          Promise.resolve({ count: 0, installments: [], targetMonth: "2026-07", totalAmount: 0 })
        }
        showNextInvoice={false}
        showPrevious
        transactions={transactions}
        updateTransactionAction={noop}
      />,
    );

    expect(screen.getByText("Hide previous")).toBeInTheDocument();
  });

  it("shows a negative current balance in the expense color", () => {
    renderScreen({
      monthlySummary: {
        totalIncome: 100,
        totalExpenses: 500,
        totalSavings: 0,
      },
    });

    // balance = 100 - 500 - 0 = -400
    expect(screen.getByText("$-400.00")).toBeInTheDocument();
  });

  it("falls back to the current month when the URL has no 'month' param", () => {
    searchParamsState.search = "";
    try {
      renderScreen({ showPrevious: false });

      const currentMonth = new Date().toISOString().slice(0, 7);
      const link = screen.getByText("Show previous").closest("a");
      expect(link).toHaveAttribute(
        "href",
        expect.stringContaining(`month=${currentMonth}`),
      );
    } finally {
      searchParamsState.search = "month=2026-07";
    }
  });

  it("falls back to the default income category label/id when no income-group category is configured", () => {
    renderScreen({
      categories: categories.filter((category) => category.group !== "income"),
    });

    expect(screen.getByText("Total Income")).toBeInTheDocument();
  });
});
