import { AppShell } from "@/components/dashboard/app-shell"
import { TransactionsScreen } from "@/components/dashboard/transactions-screen"
import {
  getTransactionFormOptions,
  listTransactions,
} from "@/lib/finance/transactions"
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/app/transactions/actions"

export default async function TransactionsPage() {
  const [transactions, transactionFormOptions] = await Promise.all([
    listTransactions(),
    getTransactionFormOptions(),
  ])

  return (
    <AppShell>
      <TransactionsScreen
        categories={transactionFormOptions.categories}
        createTransactionAction={createTransactionAction}
        deleteTransactionAction={deleteTransactionAction}
        paymentMethods={transactionFormOptions.paymentMethods}
        transactions={transactions}
        updateTransactionAction={updateTransactionAction}
      />
    </AppShell>
  )
}
