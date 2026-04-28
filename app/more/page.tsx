import { MoreHorizontal } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function MorePage() {
  return (
    <AppShell>
      <PlaceholderPage
        description="Access the remaining Dragg tools from the mobile navigation."
        icon={MoreHorizontal}
        title="More"
      />
    </AppShell>
  )
}
