import { AppShell } from "@/components/dashboard/app-shell";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { BudgetSplitChart } from "@/components/dashboard/budget-split-chart";
import { TransactionForm } from "@/components/dashboard/transaction-form";
import { ExpensesByCategoryChart } from "@/components/dashboard/expenses-by-category-chart";
import { ExpensesOverTimeChart } from "@/components/dashboard/expenses-over-time-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TransactionsList } from "@/components/dashboard/transactions-list";
import {
  createCategoryAction,
  createTransactionAction,
} from "@/app/transactions/actions";
import { getDashboardData } from "@/lib/finance/transactions";

type DashboardPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams?.month;
  const dashboardData = await getDashboardData(selectedMonth);

  return (
    <AppShell>
      <section aria-label="New transaction form" className="mb-6 lg:mb-8">
        <TransactionForm
          categories={dashboardData.categories}
          createCategoryAction={createCategoryAction}
          onSubmit={createTransactionAction}
          paymentMethods={dashboardData.paymentMethods}
        />
      </section>

      <section aria-label="Financial summary">
        <SummaryCards summaryData={dashboardData.summaryData} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <section aria-label="Budget split chart">
          <BudgetSplitChart budgetSplitData={dashboardData.budgetSplitData} />
        </section>
        <section aria-label="Expenses over time" className="lg:col-span-2">
          <ExpensesOverTimeChart
            expensesOverTime={dashboardData.expensesOverTime}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <section aria-label="Expenses by category">
          <ExpensesByCategoryChart
            expensesByCategory={dashboardData.expensesByCategory}
          />
        </section>
        <section aria-label="Latest transactions">
          <TransactionsList transactions={dashboardData.latestTransactions} />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <section aria-label="Budget progress">
          <BudgetProgress budgetData={dashboardData.budgetData} />
        </section>
        <section aria-label="Quick actions">
          <QuickActions />
        </section>
      </div>
    </AppShell>
  );
}
