import { AppShell } from "@/components/dashboard/app-shell"
import { CategoriesScreen } from "@/components/dashboard/categories-screen"
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/transactions/actions"
import { listCategoryOverview } from "@/lib/finance/transactions"

export default async function CategoriesPage() {
  const categories = await listCategoryOverview()

  return (
    <AppShell>
      <CategoriesScreen
        categories={categories}
        createCategoryAction={createCategoryAction}
        deleteCategoryAction={deleteCategoryAction}
        updateCategoryAction={updateCategoryAction}
      />
    </AppShell>
  )
}
