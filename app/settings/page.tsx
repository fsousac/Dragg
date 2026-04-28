import { Settings } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function SettingsPage() {
  return (
    <AppShell>
      <PlaceholderPage
        description="Manage preferences, account details, and dashboard settings."
        icon={Settings}
        title="Settings"
      />
    </AppShell>
  )
}
