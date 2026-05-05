import { AppShell } from "@/components/dashboard/app-shell"
import { PaymentsScreen } from "@/components/dashboard/payments-screen"
import {
  createPaymentMethodAction,
  createSubscriptionAction,
  deletePaymentMethodAction,
  updatePaymentMethodAction,
} from "@/app/transactions/actions"
import {
  getTransactionFormOptions,
  listPaymentMethodOverview,
  listSubscriptionOverview,
} from "@/lib/finance/transactions"

type PaymentsPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams?.month;
  const [paymentMethods, subscriptions, transactionFormOptions] = await Promise.all([
    listPaymentMethodOverview(selectedMonth),
    listSubscriptionOverview(),
    getTransactionFormOptions(),
  ])

  return (
    <AppShell>
      <PaymentsScreen
        categories={transactionFormOptions.categories}
        createPaymentMethodAction={createPaymentMethodAction}
        createSubscriptionAction={createSubscriptionAction}
        deletePaymentMethodAction={deletePaymentMethodAction}
        paymentMethods={paymentMethods}
        subscriptions={subscriptions}
        transactionPaymentMethods={transactionFormOptions.paymentMethods}
        updatePaymentMethodAction={updatePaymentMethodAction}
      />
    </AppShell>
  )
}
