import { AppShell } from "@/components/dashboard/app-shell";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { BudgetSplitChart } from "@/components/dashboard/budget-split-chart";
import { DashboardTransactionForm } from "@/components/dashboard/dashboard-transaction-form";
import { ExpensesByCategoryChart } from "@/components/dashboard/expenses-by-category-chart";
import { ExpensesOverTimeChart } from "@/components/dashboard/expenses-over-time-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TransactionsList } from "@/components/dashboard/transactions-list";

export default async function DashboardPage() {
  return (
    <AppShell>
      <section aria-label="New transaction form" className="mb-6 lg:mb-8">
        <DashboardTransactionForm />
      </section>

      <section aria-label="Financial summary">
        <SummaryCards />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <section aria-label="Budget split chart">
          <BudgetSplitChart />
        </section>
        <section aria-label="Expenses over time" className="lg:col-span-2">
          <ExpensesOverTimeChart />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <section aria-label="Expenses by category">
          <ExpensesByCategoryChart />
        </section>
        <section aria-label="Latest transactions">
          <TransactionsList />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <section aria-label="Budget progress">
          <BudgetProgress />
        </section>
        <section aria-label="Quick actions">
          <QuickActions />
        </section>
      </div>
    </AppShell>
  );
}
