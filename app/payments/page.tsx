import { AppShell } from "@/components/dashboard/app-shell"
import { PaymentsScreen } from "@/components/dashboard/payments-screen"
import {
  deletePaymentMethodAction,
  updatePaymentMethodAction,
} from "@/app/transactions/actions"
import { listPaymentMethodOverview } from "@/lib/finance/transactions"

export default async function PaymentsPage() {
  const paymentMethods = await listPaymentMethodOverview()

  return (
    <AppShell>
      <PaymentsScreen
        deletePaymentMethodAction={deletePaymentMethodAction}
        paymentMethods={paymentMethods}
        updatePaymentMethodAction={updatePaymentMethodAction}
      />
    </AppShell>
  )
}
