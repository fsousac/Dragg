import { ArrowLeftRight } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function TransactionsPage() {
  return (
    <AppShell>
      <PlaceholderPage
        description="Review, search, and organize every income and expense entry in one place."
        icon={ArrowLeftRight}
        title="Transactions"
      />
    </AppShell>
  )
}
