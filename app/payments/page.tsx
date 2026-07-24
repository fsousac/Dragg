import { AppShell } from "@/components/dashboard/app-shell";
import { PaymentsScreen } from "@/components/dashboard/payments-screen";
import {
  createPaymentMethodAction,
  createInvoiceAdvancePaymentAction,
  createSubscriptionAction,
  deletePaymentMethodAction,
  deleteSubscriptionAction,
  pauseSubscriptionAction,
  resumeSubscriptionAction,
  updatePaymentMethodAction,
  updateSubscriptionAction,
} from "@/app/transactions/actions";
import {
  getPaymentsDueData,
  getTransactionFormOptions,
  listPaymentMethodOverview,
  listSubscriptionOverview,
} from "@/lib/finance/transactions";

type PaymentsPageProps = {
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

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams?.month;
  const normalizedSelectedMonth = normalizeMonthValue(selectedMonth);
  const [
    paymentMethods,
    subscriptions,
    paymentsDueData,
    transactionFormOptions,
  ] = await Promise.all([
    listPaymentMethodOverview(normalizedSelectedMonth),
    listSubscriptionOverview(),
    getPaymentsDueData(normalizedSelectedMonth),
    getTransactionFormOptions(),
  ]);

  return (
    <AppShell>
      <PaymentsScreen
        categories={transactionFormOptions.categories}
        createInvoiceAdvancePaymentAction={createInvoiceAdvancePaymentAction}
        createPaymentMethodAction={createPaymentMethodAction}
        createSubscriptionAction={createSubscriptionAction}
        deletePaymentMethodAction={deletePaymentMethodAction}
        deleteSubscriptionAction={deleteSubscriptionAction}
        pauseSubscriptionAction={pauseSubscriptionAction}
        paymentMethods={paymentMethods}
        paymentsDueData={paymentsDueData}
        resumeSubscriptionAction={resumeSubscriptionAction}
        selectedMonth={normalizedSelectedMonth}
        subscriptions={subscriptions}
        transactionPaymentMethods={transactionFormOptions.paymentMethods}
        updatePaymentMethodAction={updatePaymentMethodAction}
        updateSubscriptionAction={updateSubscriptionAction}
      />
    </AppShell>
  );
}
