import { type Transaction } from "@/lib/data";
import {
  extractInstallmentLabel,
  getCreditCardInvoiceCycle,
} from "@/lib/finance/credit-card-invoices";

type PaymentMethodSpentSource = {
  closingDay?: number | null;
  dueDay?: number | null;
  id: string;
  label?: string;
  name?: string;
  type?: string | null;
};

export type PaymentMethodDetailTransaction = {
  amount: number;
  categoryKey: string;
  date: string;
  descriptionKey: string;
  id: string;
  installmentLabel?: string;
  invoiceDueDate?: string | null;
  status?: "planned";
};

export type PaymentMethodDetail = {
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodType: string;
  selectedMonth: string;
  totalAmount: number;
  transactions: PaymentMethodDetailTransaction[];
};

function getMonthOffsetValue(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getCreditCardPurchaseDueDate(
  transaction: Transaction,
  paymentMethod: PaymentMethodSpentSource,
) {
  if (paymentMethod.dueDay == null) {
    return null;
  }

  const transactionMonth = transaction.date.slice(0, 7);
  const candidateMonths = [0, 1, 2].map((offset) =>
    getMonthOffsetValue(transactionMonth, offset),
  );

  for (const month of candidateMonths) {
    const cycle = getCreditCardInvoiceCycle({
      closingDay: paymentMethod.closingDay,
      dueDay: paymentMethod.dueDay,
      month,
    });

    if (
      transaction.date >= cycle.startsAt &&
      transaction.date <= cycle.closingDate
    ) {
      return cycle.dueDate;
    }
  }

  return getCreditCardInvoiceCycle({
    closingDay: paymentMethod.closingDay,
    dueDay: paymentMethod.dueDay,
    month: getMonthOffsetValue(transactionMonth, 1),
  }).dueDate;
}

function isUnpaidTransaction(options: {
  paymentMethod: PaymentMethodSpentSource;
  today: string;
  transaction: Transaction;
}) {
  const { paymentMethod, today, transaction } = options;

  if (transaction.type === "income") {
    return false;
  }

  if (paymentMethod.type !== "credit") {
    return true;
  }

  const dueDate = getCreditCardPurchaseDueDate(transaction, paymentMethod);

  return dueDate == null || dueDate >= today;
}

function toPaymentMethodDetailTransaction(
  transaction: Transaction,
  paymentMethod: PaymentMethodSpentSource,
): PaymentMethodDetailTransaction {
  const installmentLabel = extractInstallmentLabel(transaction) ?? undefined;

  return {
    amount: Math.abs(transaction.amount),
    categoryKey: transaction.categoryKey,
    date: transaction.date,
    descriptionKey: transaction.descriptionKey,
    id: transaction.id,
    installmentLabel,
    invoiceDueDate:
      paymentMethod.type === "credit"
        ? getCreditCardPurchaseDueDate(transaction, paymentMethod)
        : null,
    status: transaction.isPlanned ? "planned" : undefined,
  };
}

export function getPaymentMethodDetail(options: {
  paymentMethod: PaymentMethodSpentSource;
  selectedMonth: string;
  today: string;
  transactions: Transaction[];
}): PaymentMethodDetail {
  const { paymentMethod, selectedMonth, today, transactions } = options;
  const detailTransactions = transactions
    .filter(
      (transaction) =>
        transaction.paymentMethodId === paymentMethod.id &&
        (paymentMethod.type === "credit" ||
          !selectedMonth ||
          transaction.date.slice(0, 7) === selectedMonth) &&
        isUnpaidTransaction({ paymentMethod, today, transaction }),
    )
    .map((transaction) =>
      toPaymentMethodDetailTransaction(transaction, paymentMethod),
    )
    .sort((left, right) => left.date.localeCompare(right.date));
  const totalAmount = detailTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  return {
    paymentMethodId: paymentMethod.id,
    paymentMethodName: paymentMethod.label ?? paymentMethod.name ?? "",
    paymentMethodType: paymentMethod.type ?? "other",
    selectedMonth,
    totalAmount: Number(totalAmount.toFixed(2)),
    transactions: detailTransactions,
  };
}

export function calculatePaymentMethodSpent(options: {
  paymentMethod: PaymentMethodSpentSource;
  today: string;
  transactions: Transaction[];
}) {
  return getPaymentMethodDetail({
    ...options,
    selectedMonth: "",
  }).totalAmount;
}
