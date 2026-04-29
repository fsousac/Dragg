import { AppShell } from "@/components/dashboard/app-shell"
import { TransactionsScreen } from "@/components/dashboard/transactions-screen"
import { listTransactions } from "@/lib/finance/transactions"

export default async function TransactionsPage() {
  const transactions = await listTransactions()

  return (
    <AppShell>
      <TransactionsScreen transactions={transactions} />
    </AppShell>
  )
}
