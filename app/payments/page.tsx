import { CreditCard } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function PaymentsPage() {
  return (
    <AppShell>
      <PlaceholderPage
        description="Track upcoming bills, recurring payments, and due dates."
        icon={CreditCard}
        title="Payments"
      />
    </AppShell>
  )
}
