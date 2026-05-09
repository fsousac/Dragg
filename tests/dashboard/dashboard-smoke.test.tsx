import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BudgetProgress } from "@/components/dashboard/budget-progress";
import {
  BudgetSplitChart,
  BudgetSplitTooltip,
} from "@/components/dashboard/budget-split-chart";
import {
  ExpensesByCategoryChart,
  ExpensesByCategoryTooltip,
} from "@/components/dashboard/expenses-by-category-chart";
import { CompactInput } from "@/components/dashboard/form-inputs/compact-input";
import { CompactSelect } from "@/components/dashboard/form-inputs/compact-select";
import { CompactTextarea } from "@/components/dashboard/form-inputs/compact-textarea";
import {
  getCurrentMonthValue,
  getMonthFromSearchParams,
  withSelectedMonth,
} from "@/components/dashboard/month-route";
import { PageHeader } from "@/components/dashboard/page-header";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";
import { SummaryCards } from "@/components/dashboard/summary-cards";

const translations: Record<string, string> = {
  "common.expense": "Expense",
  "common.income": "Income",
  "common.left": "Left",
  "common.noDataForPeriod": "No data for this period yet.",
  "common.ofTotal": "of total",
  "common.overBudget": "over budget",
  "common.planned": "Planned",
  "common.predicted": "Predicted",
  "common.spent": "Spent",
  "common.used": "used",
  "dashboard.budgetSplit.description": "Monthly budget split",
  "dashboard.budgetSplit.incomeBase": "Monthly income base",
  "dashboard.budgetSplit.title": "Budget Split",
  "dashboard.expensesByCategory.description": "Spending by category",
  "dashboard.expensesByCategory.title": "Expenses by Category",
  "dashboard.summary.currentBalance": "Current Balance",
  "dashboard.summary.predictedExpenses": "Predicted Expenses",
  "dashboard.summary.totalExpenses": "Total Expenses",
  "dashboard.summary.totalIncome": "Total Income",
  "dashboard.summary.totalSaved": "Total Saved",
  "data.category.health": "Health",
  "data.category.shopping": "Shopping",
  "data.group.needs": "Needs",
  "data.group.savings": "Savings",
  "data.group.wants": "Wants",
  "page.settings.description": "Coming soon",
};

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    formatCurrency: (value: number) => `$${value}`,
    formatDate: (value: string | Date) =>
      value instanceof Date ? value.toISOString() : value,
    formatNumber: (value: number) => String(value),
    locale: "en",
    t: (key: string) => translations[key] ?? key,
  }),
}));

function renderWithI18n(node: React.ReactNode) {
  return renderToStaticMarkup(node);
}

describe("month route helpers", () => {
  it("reads valid selected months and rejects malformed values", () => {
    expect(getMonthFromSearchParams(new URLSearchParams("month=2026-05"))).toBe(
      "2026-05",
    );
    expect(getMonthFromSearchParams(new URLSearchParams("month=may"))).toBe(
      null,
    );
    expect(getMonthFromSearchParams(new URLSearchParams())).toBe(null);
  });

  it("preserves existing query params when applying the selected month", () => {
    expect(
      withSelectedMonth(
        "/transactions?type=expense",
        new URLSearchParams("month=2026-05"),
      ),
    ).toBe("/transactions?type=expense&month=2026-05");
  });

  it("generates the current month in yyyy-mm format", () => {
    expect(getCurrentMonthValue()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("dashboard component rendering", () => {
  it("renders summary cards with predicted expenses", () => {
    const html = renderWithI18n(
      <SummaryCards
        summaryData={{
          currentBalance: 1000,
          predictedExpenses: 125,
          totalExpenses: 500,
          totalIncome: 1500,
          totalSaved: 250,
        }}
      />,
    );

    expect(html).toContain("Total Income");
    expect(html).toContain("Predicted");
  });

  it("renders budget progress for every 50/30/20 group", () => {
    const html = renderWithI18n(
      <BudgetProgress
        budgetData={{
          needs: { budget: 1000, percentage: 40, spent: 400 },
          savings: { budget: 400, percentage: 100, spent: 400 },
          wants: { budget: 600, percentage: 25, spent: 150 },
        }}
      />,
    );

    expect(html).toContain("Needs");
    expect(html).toContain("Wants");
    expect(html).toContain("Savings");
  });

  it("renders budget split with income base and over-budget status", () => {
    const html = renderWithI18n(
      <BudgetSplitChart
        budgetSplitData={[
          {
            amount: 1200,
            color: "#F97316",
            maxAmount: 1000,
            nameKey: "data.group.needs",
            spentAmount: 1200,
            value: 50,
          },
          {
            amount: 100,
            color: "#EC4899",
            maxAmount: 600,
            nameKey: "data.group.wants",
            spentAmount: 100,
            value: 30,
          },
          {
            amount: 300,
            color: "#8B5CF6",
            maxAmount: 400,
            nameKey: "data.group.savings",
            spentAmount: 300,
            value: 20,
          },
        ]}
      />,
    );

    expect(html).toContain("Monthly income base");
    expect(html).toContain("over budget");
  });

  it("renders and hides budget split tooltip content", () => {
    const payload = [
      {
        payload: {
          amount: 1200,
          color: "#F97316",
          maxAmount: 1000,
          name: "Needs",
          nameKey: "data.group.needs",
          spentAmount: 1200,
          value: 50,
        },
      },
    ];

    expect(
      renderToStaticMarkup(
        <BudgetSplitTooltip
          active
          payload={payload}
          formatCurrency={(value) => `$${value}`}
          t={(key) => key}
        />,
      ),
    ).toContain("Needs");
    expect(
      BudgetSplitTooltip({
        active: false,
        formatCurrency: String,
        payload,
        t: (key) => key,
      }),
    ).toBeNull();
    expect(
      BudgetSplitTooltip({
        active: true,
        formatCurrency: String,
        payload: [],
        t: (key) => key,
      }),
    ).toBeNull();
  });

  it("renders expenses by category grouped by 50/30/20", () => {
    const html = renderWithI18n(
      <ExpensesByCategoryChart
        expensesByCategory={[
          {
            color: "#F97316",
            group: "needs",
            groupKey: "data.group.needs",
            nameKey: "data.category.health",
            value: 250,
          },
          {
            color: "#EC4899",
            group: "wants",
            groupKey: "data.group.wants",
            nameKey: "data.category.shopping",
            value: 75,
          },
        ]}
      />,
    );

    expect(html).toContain("Expenses by Category");
    expect(html).toContain("Health");
    expect(html).toContain("Shopping");
  });

  it("renders category tooltip percentages and empty fallback", () => {
    const payload = [
      {
        payload: {
          color: "#F97316",
          group: "needs" as const,
          groupKey: "data.group.needs",
          groupName: "Needs",
          name: "Health",
          nameKey: "data.category.health",
          value: 250,
        },
      },
    ];

    expect(
      renderToStaticMarkup(
        <ExpensesByCategoryTooltip
          active
          payload={payload}
          total={500}
          formatCurrency={(value) => `$${value}`}
          t={(key) => key}
        />,
      ),
    ).toContain("50.0%");
    expect(
      renderToStaticMarkup(
        <ExpensesByCategoryTooltip
          active
          payload={payload}
          total={0}
          formatCurrency={(value) => `$${value}`}
          t={(key) => key}
        />,
      ),
    ).toContain("0.0%");
    expect(
      ExpensesByCategoryTooltip({
        active: false,
        formatCurrency: String,
        payload,
        t: (key) => key,
        total: 500,
      }),
    ).toBeNull();
    expect(
      ExpensesByCategoryTooltip({
        active: true,
        formatCurrency: String,
        payload: [],
        t: (key) => key,
        total: 500,
      }),
    ).toBeNull();
  });

  it("renders the empty category chart state", () => {
    expect(
      renderWithI18n(<ExpensesByCategoryChart expensesByCategory={[]} />),
    ).toContain("No data for this period yet.");
  });

  it("renders compact form inputs and simple page chrome", () => {
    const html = renderWithI18n(
      <>
        <PageHeader
          title="Settings"
          description="Preferences"
          actions={<button type="button">Action</button>}
        />
        <PlaceholderPage
          icon="settings"
          titleKey="nav.settings"
          descriptionKey="page.settings.description"
        />
        <CompactInput
          id="amount"
          label="Amount"
          value="10"
          onChange={() => undefined}
          error="Required"
        />
        <CompactInput
          id="date"
          label="Date"
          type="date"
          icon={<span>calendar</span>}
          inputClassName="custom-input"
        />
        <CompactTextarea
          id="notes"
          label="Notes"
          value="memo"
          onChange={() => undefined}
        />
        <CompactTextarea
          id="plain-notes"
          label="Plain notes"
          icon={<span>note</span>}
          placeholder="Optional"
        />
        <CompactSelect
          id="category"
          label="Category"
          value="none"
          onChange={() => undefined}
          options={[{ value: "none", label: "Receipts", icon: "💼" }]}
          disabled
        />
        <CompactSelect
          id="payment"
          label="Payment"
          value="cash"
          onChange={() => undefined}
          options={[
            { value: "cash", label: "Cash" },
            { value: "card", label: "Card", icon: "💳" },
          ]}
          addActionLabel="Add payment"
          onAddAction={() => undefined}
          error="Pick one"
        />
      </>,
    );

    expect(html).toContain("Preferences");
    expect(html).toContain("Coming soon");
    expect(html).toContain("Amount");
    expect(html).toContain("Required");
    expect(html).toContain("Notes");
  });
});
