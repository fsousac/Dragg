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

function resolveMonthParam(value: string | string[] | undefined): string {
  return Array.isArray(value)
    ? value[0]
    : (value ?? new Date().toISOString().slice(0, 7));
}

function resolveFlagParam(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value[0] === "1" : value === "1";
}

function resolveTransactionsPageParams(
  resolvedSearchParams: Awaited<TransactionsPageProps["searchParams"]>,
) {
  return {
    selectedMonth: resolveMonthParam(resolvedSearchParams?.month),
    showPrevious: resolveFlagParam(resolvedSearchParams?.history),
    showNextInvoice: resolveFlagParam(resolvedSearchParams?.nextInvoice),
  };
}

async function getTransactionsPageData(
  selectedMonth: string,
  showPrevious: boolean,
  userContext: Awaited<ReturnType<typeof getUserContext>>,
) {
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

  return {
    transactions,
    transactionFormOptions,
    nextInvoiceTransactions,
    monthlySummary,
  };
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { selectedMonth, showPrevious, showNextInvoice } =
    resolveTransactionsPageParams(resolvedSearchParams);
  const userContext = await getUserContext();
  const {
    transactions,
    transactionFormOptions,
    nextInvoiceTransactions,
    monthlySummary,
  } = await getTransactionsPageData(selectedMonth, showPrevious, userContext);

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
