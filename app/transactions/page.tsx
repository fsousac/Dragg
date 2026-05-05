import { AppShell } from "@/components/dashboard/app-shell"
import { TransactionsScreen } from "@/components/dashboard/transactions-screen"
import {
  getTransactionFormOptions,
  listTransactions,
} from "@/lib/finance/transactions"
import {
  createCategoryAction,
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/app/transactions/actions"

type TransactionsPageProps = {
  searchParams?: Promise<{
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
  const [transactions, transactionFormOptions] = await Promise.all([
    listTransactions({ month: selectedMonth }),
    getTransactionFormOptions(),
  ])

  return (
    <AppShell>
      <TransactionsScreen
        categories={transactionFormOptions.categories}
        createCategoryAction={createCategoryAction}
        createTransactionAction={createTransactionAction}
        deleteTransactionAction={deleteTransactionAction}
        paymentMethods={transactionFormOptions.paymentMethods}
        transactions={transactions}
        updateTransactionAction={updateTransactionAction}
      />
    </AppShell>
  )
}
