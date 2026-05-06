import { AppShell } from "@/components/dashboard/app-shell";
import { TransactionsScreen } from "@/components/dashboard/transactions-screen";
import {
  getTransactionFormOptions,
  listTransactions,
} from "@/lib/finance/transactions";
import {
  createCategoryAction,
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
  createPaymentMethodAction,
} from "@/app/transactions/actions";

type TransactionsPageProps = {
  searchParams?: Promise<{
    history?: string | string[];
    month?: string | string[];
  }>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams?.month;
  const showPrevious = Array.isArray(resolvedSearchParams?.history)
    ? resolvedSearchParams.history[0] === "1"
    : resolvedSearchParams?.history === "1";
  const [transactions, transactionFormOptions] = await Promise.all([
    listTransactions({
      includePrevious: showPrevious,
      includeFuture: true,
      month: selectedMonth,
    }),
    getTransactionFormOptions(),
  ]);

  return (
    <AppShell>
      <TransactionsScreen
        categories={transactionFormOptions.categories}
        createCategoryAction={createCategoryAction}
        createPaymentMethodAction={createPaymentMethodAction}
        createTransactionAction={createTransactionAction}
        deleteTransactionAction={deleteTransactionAction}
        paymentMethods={transactionFormOptions.paymentMethods}
        showPrevious={showPrevious}
        transactions={transactions}
        updateTransactionAction={updateTransactionAction}
      />
    </AppShell>
  );
}
