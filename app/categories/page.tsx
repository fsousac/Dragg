import { Folder } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { PlaceholderPage } from "@/components/dashboard/placeholder-page"

export default function CategoriesPage() {
  return (
    <AppShell>
      <PlaceholderPage
        description="Create spending categories and keep your money organized by purpose."
        icon={Folder}
        title="Categories"
      />
    </AppShell>
  )
}
