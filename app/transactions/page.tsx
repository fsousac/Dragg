import { AppShell } from "@/components/dashboard/app-shell";
import { TransactionsScreen } from "@/components/dashboard/transactions-screen";
import {
  getUserContext,
  getMonthlySummary,
  getTransactionFormOptions,
  listTransactions,
} from "@/lib/finance/transactions";
import {
  createCategoryAction,
  advanceInstallmentsAction,
  createTransactionAction,
  deleteInstallmentsAction,
  deleteSubscriptionOccurrencesAction,
  deleteTransactionAction,
  previewInstallmentPrepaymentAction,
  updateTransactionAction,
  createPaymentMethodAction,
} from "@/app/transactions/actions";

type TransactionsPageProps = {
  searchParams?: Promise<{
    history?: string | string[];
    month?: string | string[];
    nextInvoice?: string | string[];
  }>;
};

function getNextMonthValue(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = new Date(year, monthNumber, 1);

  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams.month[0]
    : (resolvedSearchParams?.month ?? new Date().toISOString().slice(0, 7));
  const showPrevious = Array.isArray(resolvedSearchParams?.history)
    ? resolvedSearchParams.history[0] === "1"
    : resolvedSearchParams?.history === "1";
  const showNextInvoice = Array.isArray(resolvedSearchParams?.nextInvoice)
    ? resolvedSearchParams.nextInvoice[0] === "1"
    : resolvedSearchParams?.nextInvoice === "1";
  const userContext = await getUserContext();
  const nextMonth = getNextMonthValue(selectedMonth);
  const [
    transactions,
    transactionFormOptions,
    nextMonthTransactions,
    monthlySummary,
  ] = await Promise.all([
    listTransactions({
      includeCreditCardInvoices: true,
      includePrevious: showPrevious,
      includeFuture: true,
      month: selectedMonth,
      preserveCreditCardInvoicePurchases: true,
      userContext,
    }),
    getTransactionFormOptions({ userContext }),
    listTransactions({
      includeCreditCardInvoices: true,
      includeFuture: true,
      month: nextMonth,
      preserveCreditCardInvoicePurchases: true,
      userContext,
    }),
    getMonthlySummary(selectedMonth, userContext),
  ]);

  const nextInvoiceTransactions = nextMonthTransactions.filter(
    (transaction) => transaction.isCreditCardInvoice,
  );

  return (
    <AppShell>
      <TransactionsScreen
        categories={transactionFormOptions.categories}
        createCategoryAction={createCategoryAction}
        createPaymentMethodAction={createPaymentMethodAction}
        createTransactionAction={createTransactionAction}
        advanceInstallmentsAction={advanceInstallmentsAction}
        deleteInstallmentsAction={deleteInstallmentsAction}
        deleteSubscriptionOccurrencesAction={
          deleteSubscriptionOccurrencesAction
        }
        deleteTransactionAction={deleteTransactionAction}
        monthlySummary={monthlySummary}
        nextInvoiceTransactions={nextInvoiceTransactions}
        previewInstallmentPrepaymentAction={previewInstallmentPrepaymentAction}
        paymentMethods={transactionFormOptions.paymentMethods}
        showPrevious={showPrevious}
        showNextInvoice={showNextInvoice}
        transactions={transactions}
        updateTransactionAction={updateTransactionAction}
      />
    </AppShell>
  );
}
