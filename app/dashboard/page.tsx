import { Suspense } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { BudgetSplitChart } from "@/components/dashboard/budget-split-chart";
import { SummarySection } from "@/components/dashboard/summary-section";
import { ExpensesByCategoryChart } from "@/components/dashboard/expenses-by-category-chart";
import {
  DailyExpensesSplineChart,
  ExpensesOverTimeChart,
} from "@/components/dashboard/expenses-over-time-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TransactionsList } from "@/components/dashboard/transactions-list";
import {
  createCategoryAction,
  createTransactionAction,
} from "@/app/transactions/actions";
import { getDashboardData, getUserContext } from "@/lib/finance/transactions";
import { AnimatedCard } from "@/components/ui/animated-card";

type DashboardPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
};

function DashboardContentFallback() {
  return (
    <div aria-label="Loading dashboard" className="space-y-4 lg:space-y-6">
      <div className="h-84 animate-pulse rounded-xl border border-border bg-card/70 lg:h-81.5" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-33 animate-pulse rounded-xl border border-border bg-card/70"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="h-107.5 animate-pulse rounded-xl border border-border bg-card/70" />
        <div className="h-107.5 animate-pulse rounded-xl border border-border bg-card/70 lg:col-span-2" />
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
      <AnimatedCard index={0} className="mb-6 lg:mb-8">
        <section aria-label="Financial summary">
          <SummarySection
            summaryData={dashboardData.summaryData}
            categories={dashboardData.categories}
            paymentMethods={dashboardData.paymentMethods}
            createCategoryAction={createCategoryAction}
            onSubmit={createTransactionAction}
          />
        </section>
      </AnimatedCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <AnimatedCard index={2}>
          <BudgetSplitChart budgetSplitData={dashboardData.budgetSplitData} />
        </AnimatedCard>
        <AnimatedCard index={3} className="lg:col-span-2">
          <ExpensesOverTimeChart
            expensesOverTime={dashboardData.expensesOverTime}
          />
        </AnimatedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <AnimatedCard index={4}>
          <ExpensesByCategoryChart
            expensesByCategory={dashboardData.expensesByCategory}
          />
        </AnimatedCard>
        <AnimatedCard index={5} className="h-full">
          <TransactionsList transactions={dashboardData.latestTransactions} />
        </AnimatedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <AnimatedCard index={6} className="h-full">
          <DailyExpensesSplineChart
            dailyExpensesOverTime={dashboardData.dailyExpensesOverTime}
            selectedMonth={selectedMonth}
          />
        </AnimatedCard>
        <AnimatedCard index={7}>
          <QuickActions />
        </AnimatedCard>
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
