import { type TransactionGroup, type TransactionType } from "@/lib/data";

type TransactionLike = {
  amount: number;
  date: string;
  group?: TransactionGroup;
  type: TransactionType;
};

export type CalculateTotalSavedInput = {
  selectedMonth: string;
  transactions: TransactionLike[];
};

export type TotalSavedClosedMonth = {
  contributedLeftover: number;
  expenses: number;
  finalBalance: number;
  income: number;
  month: string;
  savings: number;
};

export type TotalSavedResult = {
  closedMonths: TotalSavedClosedMonth[];
  totalClosedMonthLeftover: number;
  totalInvested: number;
  totalSaved: number;
};

export function calculateTotalSaved({
  selectedMonth,
  transactions,
}: CalculateTotalSavedInput): TotalSavedResult {
  const validTransactions = transactions.filter((transaction) =>
    isValidMonthValue(getTransactionMonth(transaction)),
  );
  const investedTransactions = validTransactions.filter(
    (transaction) =>
      isSavingsTransaction(transaction) &&
      getTransactionMonth(transaction) <= selectedMonth,
  );
  const totalInvested = toMoneyValue(
    investedTransactions.reduce(
      (sum, transaction) => sum + Math.abs(transaction.amount),
      0,
    ),
  );
  const earliestMonth = validTransactions
    .map(getTransactionMonth)
    .sort((a, b) => a.localeCompare(b))[0];
  const closedMonths = (earliestMonth
    ? getMonthRange(earliestMonth, selectedMonth)
    : []
  ).map((month) => calculateClosedMonth(month, validTransactions));
  const totalClosedMonthLeftover = toMoneyValue(
    closedMonths.reduce(
      (sum, month) => sum + month.contributedLeftover,
      0,
    ),
  );

  return {
    closedMonths,
    totalClosedMonthLeftover,
    totalInvested,
    totalSaved: toMoneyValue(totalInvested + totalClosedMonthLeftover),
  };
}

function calculateClosedMonth(
  month: string,
  transactions: TransactionLike[],
): TotalSavedClosedMonth {
  const monthTransactions = transactions.filter(
    (transaction) => getTransactionMonth(transaction) === month,
  );
  const income = sumTransactionsByType(monthTransactions, "income");
  const expenses = sumExpenses(monthTransactions);
  const savings = sumSavings(monthTransactions);
  const finalBalance = toMoneyValue(income - expenses - savings);

  return {
    contributedLeftover: Math.max(finalBalance, 0),
    expenses,
    finalBalance,
    income,
    month,
    savings,
  };
}

function sumTransactionsByType(
  transactions: TransactionLike[],
  type: TransactionType,
) {
  return toMoneyValue(
    transactions
      .filter((transaction) => transaction.type === type)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
  );
}

function sumExpenses(transactions: TransactionLike[]) {
  return toMoneyValue(
    transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" && !isSavingsTransaction(transaction),
      )
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
  );
}

function sumSavings(transactions: TransactionLike[]) {
  return toMoneyValue(
    transactions
      .filter(isSavingsTransaction)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
  );
}

function isSavingsTransaction(transaction: TransactionLike) {
  return transaction.type === "saving" || transaction.group === "savings";
}

function getTransactionMonth(transaction: TransactionLike) {
  return transaction.date.slice(0, 7);
}

function getMonthRange(startMonth: string, endMonth: string) {
  const months: string[] = [];
  let cursor = startMonth;

  while (cursor < endMonth) {
    months.push(cursor);
    cursor = getNextMonth(cursor);
  }

  return months;
}

function getNextMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextYear = monthNumber === 12 ? year + 1 : year;

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function isValidMonthValue(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

function toMoneyValue(value: number) {
  return Number(value.toFixed(2));
}
