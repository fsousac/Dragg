import { type Transaction } from "@/lib/data";
import { getCreditCardInvoiceCycle } from "@/lib/finance/credit-card-invoices";

type PaymentMethodSpentSource = {
  closingDay?: number | null;
  dueDay?: number | null;
  id: string;
  type?: string | null;
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

export function calculatePaymentMethodSpent(options: {
  paymentMethod: PaymentMethodSpentSource;
  today: string;
  transactions: Transaction[];
}) {
  const { paymentMethod, today, transactions } = options;

  return transactions
    .filter(
      (transaction) =>
        transaction.paymentMethodId === paymentMethod.id &&
        isUnpaidTransaction({ paymentMethod, today, transaction }),
    )
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
}
