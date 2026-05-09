import { AppShell } from "@/components/dashboard/app-shell"
import { ReportsScreen } from "@/components/dashboard/reports-screen"
import { getReportsData } from "@/lib/finance/transactions"

type ReportsPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
    period?: string | string[];
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams?.month;
  const selectedPeriod = Array.isArray(resolvedSearchParams?.period)
    ? resolvedSearchParams.period[0]
    : resolvedSearchParams?.period;
  const reportsData = await getReportsData(
    selectedMonth,
    Number(selectedPeriod),
  );

  return (
    <AppShell>
      <ReportsScreen reportsData={reportsData} />
    </AppShell>
  )
}
