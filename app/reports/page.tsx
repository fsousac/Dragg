import { BarChart3 } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function ReportsPage() {
  return (
    <AppShell>
      <PlaceholderPage
        description="Explore trends, monthly summaries, and finance insights."
        icon={BarChart3}
        title="Reports"
      />
    </AppShell>
  )
}
