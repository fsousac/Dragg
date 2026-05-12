import {
  type CreditCardInvoiceDetails,
  type CreditCardInvoicePurchase,
  type Transaction,
} from "@/lib/data";

type CreditCardInvoicePaymentMethod = {
  closingDay?: number | null;
  dueDay?: number | null;
  id: string;
  labelKey: string;
};

export type CreditCardInvoiceTransaction = Transaction & {
  invoice: CreditCardInvoiceDetails;
  isCreditCardInvoice: true;
  isPlanned: true;
};

function toDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(Math.max(day, 1), daysInMonth(year, monthIndex));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getInvoiceClosingDate(
  month: string,
  dueDay: number,
  closingDay: number,
) {
  const [year, monthNumber] = month.split("-").map(Number);
  const selectedMonthIndex = monthNumber - 1;
  const closingMonthIndex =
    closingDay <= dueDay ? selectedMonthIndex : selectedMonthIndex - 1;
  const closingDateYear = new Date(year, closingMonthIndex, 1).getFullYear();
  const normalizedClosingMonthIndex = new Date(
    year,
    closingMonthIndex,
    1,
  ).getMonth();

  return new Date(
    closingDateYear,
    normalizedClosingMonthIndex,
    clampDay(closingDateYear, normalizedClosingMonthIndex, closingDay),
  );
}

export function getCreditCardInvoiceCycle(options: {
  closingDay?: number | null;
  dueDay?: number | null;
  month: string;
}) {
  const [year, monthNumber] = options.month.split("-").map(Number);
  const monthIndex = monthNumber - 1;
  const dueDay = options.dueDay ?? daysInMonth(year, monthIndex);
  // Safe fallback for cards without `closing_day`: close the invoice on the
  // due day. This avoids pulling purchases from an unknown later cycle.
  const closingDay = options.closingDay ?? dueDay;
  const dueDate = new Date(
    year,
    monthIndex,
    clampDay(year, monthIndex, dueDay),
  );
  const closingDate = addDays(
    getInvoiceClosingDate(options.month, dueDay, closingDay),
    -1,
  );
  const previousInvoiceMonth = toDateValue(
    new Date(year, monthIndex - 1, 1),
  ).slice(0, 7);
  const previousClosingDate = getInvoiceClosingDate(
    previousInvoiceMonth,
    dueDay,
    closingDay,
  );

  return {
    closingDate: toDateValue(closingDate),
    dueDate: toDateValue(dueDate),
    startsAt: toDateValue(previousClosingDate),
  };
}

function extractInstallmentLabel(transaction: Transaction) {
  return (
    transaction.notes?.match(/\b\d+\/\d+\b/)?.[0] ??
    transaction.descriptionKey.match(/\b\d+\/\d+\b/)?.[0] ??
    null
  );
}

function toInvoicePurchase(
  transaction: Transaction,
): CreditCardInvoicePurchase {
  return {
    amount: Math.abs(transaction.amount),
    categoryKey: transaction.categoryKey,
    date: transaction.date,
    descriptionKey: transaction.descriptionKey,
    id: transaction.id,
    installmentLabel: extractInstallmentLabel(transaction),
  };
}

export function createCreditCardInvoiceTransactions(options: {
  month: string;
  paymentMethods: CreditCardInvoicePaymentMethod[];
  transactions: Transaction[];
}): {
  invoices: CreditCardInvoiceTransaction[];
  purchaseIds: Set<string>;
} {
  const purchaseIds = new Set<string>();
  const invoices = options.paymentMethods.flatMap((paymentMethod) => {
    if (paymentMethod.dueDay == null) {
      return [];
    }
    const cycle = getCreditCardInvoiceCycle({
      closingDay: paymentMethod.closingDay,
      dueDay: paymentMethod.dueDay,
      month: options.month,
    });
    const purchases = options.transactions
      .filter(
        (transaction) =>
          transaction.paymentMethodId === paymentMethod.id &&
          transaction.paymentMethodType === "credit" &&
          transaction.type === "expense" &&
          transaction.date >= cycle.startsAt &&
          transaction.date <= cycle.closingDate,
      )
      .sort((left, right) => left.date.localeCompare(right.date));

    if (!purchases.length) {
      return [];
    }

    for (const purchase of purchases) {
      purchaseIds.add(purchase.id);
    }

    const amount = purchases.reduce(
      (sum, transaction) => sum + Math.abs(transaction.amount),
      0,
    );

    return [
      {
        amount: -Number(amount.toFixed(2)),
        categoryId: null,
        categoryKey: "transaction.creditCardInvoice",
        date: cycle.dueDate,
        descriptionKey: "transaction.creditCardInvoice",
        group: "needs",
        icon: "💳",
        id: `credit-card-invoice:${paymentMethod.id}:${options.month}`,
        invoice: {
          closingDate: cycle.closingDate,
          dueDate: cycle.dueDate,
          paymentMethodKey: paymentMethod.labelKey,
          purchases: purchases.map(toInvoicePurchase),
          startsAt: cycle.startsAt,
        },
        isCreditCardInvoice: true,
        isPlanned: true,
        notes: null,
        paymentMethodId: paymentMethod.id,
        paymentMethodKey: paymentMethod.labelKey,
        paymentMethodClosingDay: paymentMethod.closingDay ?? null,
        paymentMethodDueDay: paymentMethod.dueDay ?? null,
        paymentMethodType: "credit",
        type: "expense",
      } satisfies CreditCardInvoiceTransaction,
    ];
  });

  return { invoices, purchaseIds };
}
