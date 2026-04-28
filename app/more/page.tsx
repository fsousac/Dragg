import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function MorePage() {
  return (
    <AppShell>
      <PlaceholderPage
        descriptionKey="page.more.description"
        icon="more"
        titleKey="nav.more"
      />
    </AppShell>
  )
}
