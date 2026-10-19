import { AppShell } from "@/components/dashboard/app-shell";
import { DebtsScreen } from "@/components/dashboard/debts-screen";
import {
  amortizeDebtAction,
  createCategoryAction,
  createPaymentMethodAction,
  createTransactionAction,
} from "@/app/transactions/actions";
import {
  getFundingContext,
  getTransactionFormOptions,
  listDebtOverview,
} from "@/lib/finance/transactions";

type DebtsPageProps = {
  readonly searchParams?: Promise<{
    month?: string | string[];
  }>;
};

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeMonthValue(month?: string) {
  return month?.match(/^\d{4}-\d{2}$/) ? month : getCurrentMonthValue();
}

export default async function DebtsPage({ searchParams }: DebtsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams?.month;
  const [overview, transactionFormOptions, funding] = await Promise.all([
    listDebtOverview(normalizeMonthValue(selectedMonth)),
    getTransactionFormOptions(),
    getFundingContext(),
  ]);

  return (
    <AppShell>
      <DebtsScreen
        amortizeDebtAction={amortizeDebtAction}
        availableSavings={funding.totalSaved}
        categories={transactionFormOptions.categories}
        createCategoryAction={createCategoryAction}
        createPaymentMethodAction={createPaymentMethodAction}
        createTransactionAction={createTransactionAction}
        overview={overview}
        paymentMethods={transactionFormOptions.paymentMethods}
      />
    </AppShell>
  );
}
