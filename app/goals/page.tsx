import { Target } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function GoalsPage() {
  return (
    <AppShell>
      <PlaceholderPage
        description="Set savings goals and follow progress toward your next milestone."
        icon={Target}
        title="Goals"
      />
    </AppShell>
  )
}
