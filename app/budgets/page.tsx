import { PieChart } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function BudgetsPage() {
  return (
    <AppShell>
      <PlaceholderPage
        description="Plan monthly limits, compare spending, and keep budgets visible."
        icon={PieChart}
        title="Budgets"
      />
    </AppShell>
  )
}
