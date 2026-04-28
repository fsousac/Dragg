import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { BudgetSplitChart } from "@/components/dashboard/budget-split-chart"
import { ExpensesOverTimeChart } from "@/components/dashboard/expenses-over-time-chart"
import { ExpensesByCategoryChart } from "@/components/dashboard/expenses-by-category-chart"
import { TransactionsList } from "@/components/dashboard/transactions-list"
import { BudgetProgress } from "@/components/dashboard/budget-progress"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { NewTransactionCTA } from "@/components/dashboard/new-transaction-cta"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <Header />
        
        <div className="px-4 lg:px-8 py-4 lg:py-6 pb-24 lg:pb-8">
          {/* Summary Cards */}
          <section aria-label="Financial summary">
            <SummaryCards />
          </section>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-4 lg:mt-6">
            <section aria-label="Budget split chart">
              <BudgetSplitChart />
            </section>
            <section aria-label="Expenses over time" className="lg:col-span-2">
              <ExpensesOverTimeChart />
            </section>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4 lg:mt-6">
            <section aria-label="Expenses by category">
              <ExpensesByCategoryChart />
            </section>
            <section aria-label="Latest transactions">
              <TransactionsList />
            </section>
          </div>

          {/* Third Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-4 lg:mt-6">
            <section aria-label="Budget progress">
              <BudgetProgress />
            </section>
            <section aria-label="Quick actions">
              <QuickActions />
            </section>
          </div>
        </div>

        {/* Floating Action Button */}
        <NewTransactionCTA />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  )
}
