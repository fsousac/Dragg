import { AppShell } from "@/components/dashboard/app-shell"
import { CategoriesScreen } from "@/components/dashboard/categories-screen"
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/transactions/actions"
import { listCategoryOverview } from "@/lib/finance/transactions"

type CategoriesPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
};

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams?.month;
  const categories = await listCategoryOverview(selectedMonth)

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
