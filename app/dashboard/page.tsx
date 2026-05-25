import { Suspense } from "react";

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
import { getDashboardData, getUserContext } from "@/lib/finance/transactions";

type DashboardPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
};

function DashboardContentFallback() {
  return (
    <div aria-label="Loading dashboard" className="space-y-4 lg:space-y-6">
      <div className="h-[336px] animate-pulse rounded-xl border border-border bg-card/70 lg:h-[326px]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[132px] animate-pulse rounded-xl border border-border bg-card/70"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="h-[430px] animate-pulse rounded-xl border border-border bg-card/70" />
        <div className="h-[430px] animate-pulse rounded-xl border border-border bg-card/70 lg:col-span-2" />
      </div>
    </div>
  );
}

async function DashboardContent({
  selectedMonth,
  userContext,
}: {
  selectedMonth?: string;
  userContext: Awaited<ReturnType<typeof getUserContext>>;
}) {
  const dashboardData = await getDashboardData(selectedMonth, userContext);

  return (
    <>
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
        <section aria-label="Latest transactions" className="h-full">
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
    </>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams?.month;
  const userContext = await getUserContext();

  return (
    <AppShell userContext={userContext}>
      <Suspense fallback={<DashboardContentFallback />}>
        <DashboardContent
          selectedMonth={selectedMonth}
          userContext={userContext}
        />
      </Suspense>
    </AppShell>
  );
}
