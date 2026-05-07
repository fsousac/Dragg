import "server-only";

import { redirect } from "next/navigation";

import {
  type Transaction,
  type TransactionGroup,
  type TransactionType,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type DbCategoryGroup = Exclude<TransactionGroup, "income">;
type DbTransactionKind = TransactionType;

type CategoryRow = {
  icon?: string | null;
  id: string;
  group_type: DbCategoryGroup;
  is_default: boolean | null;
  monthly_limit: number | string | null;
  name: string;
};

type PaymentMethodRow = {
  closing_day?: number | string | null;
  credit_limit: number | string | null;
  due_day?: number | string | null;
  id: string;
  is_default: boolean | null;
  name: string;
  type: "pix" | "debit" | "credit" | "cash" | "bank" | "boleto" | "other";
};

type TransactionRow = {
  id: string;
  amount: number | string;
  date: string;
  description: string;
  kind: DbTransactionKind;
  notes: string | null;
  categories: CategoryRow | null;
  category_id: string | null;
  payment_method_id: string | null;
  payment_methods: PaymentMethodRow | null;
};

type GoalRow = {
  color: string;
  current_amount: number | string;
  deadline: string;
  icon: string;
  id: string;
  name: string;
  target_amount: number | string;
};

export type TransactionFormCategory = {
  group: DbCategoryGroup;
  id: string;
  icon: string;
  label: string;
  monthlyLimit: number;
};

export type GoalOverviewItem = {
  color: string;
  currentAmount: number;
  deadline: string;
  icon: string;
  id: string;
  name: string;
  targetAmount: number;
};

export type CreateGoalInput = {
  color: string;
  currentAmount?: number;
  deadline: string;
  icon: string;
  name: string;
  targetAmount: number;
};

export type UpdateGoalInput = CreateGoalInput & {
  id: string;
};

export type TransactionFormPaymentMethod = {
  id: string;
  label: string;
  type: PaymentMethodRow["type"];
};

export type PaymentMethodOverviewItem = TransactionFormPaymentMethod & {
  canModify: boolean;
  closingDay: number | null;
  creditLimit: number;
  dueDay: number | null;
  isDefault: boolean;
  name: string;
  spent: number;
};

export type SubscriptionOverviewItem = {
  amount: number;
  categoryId?: string | null;
  categoryKey: string;
  frequency: "monthly";
  icon: string;
  id: string;
  name: string;
  nextDate: string;
  paymentMethodId?: string | null;
  paymentMethodKey?: string | null;
  status: "active" | "paused";
};

export type TransactionFormOptions = {
  categories: TransactionFormCategory[];
  paymentMethods: TransactionFormPaymentMethod[];
};

export type CreateCategoryInput = {
  group: DbCategoryGroup;
  icon: string;
  monthlyLimit?: number;
  name: string;
};

export type UpdateCategoryInput = CreateCategoryInput & {
  id: string;
};

export type NewTransactionInput = {
  type: "income" | "expense";
  date: string;
  amount: number;
  category: string;
  paymentMethod: string;
  installmentCount: number;
  description: string;
  notes?: string;
};

export type CreateSubscriptionInput = {
  amount: number;
  category: string;
  description: string;
  nextDate: string;
  paymentMethod: string;
};

export type UpdateSubscriptionInput = CreateSubscriptionInput & {
  id: string;
};

export type CreatePaymentMethodInput = {
  closingDay?: number | null;
  creditLimit?: number;
  dueDay?: number | null;
  name: string;
  type: UpdatePaymentMethodInput["type"];
};

export type UpdateTransactionInput = {
  id: string;
  type: TransactionType;
  date: string;
  amount: number;
  category: string;
  paymentMethod: string;
  description: string;
  notes?: string;
};

export type UpdatePaymentMethodInput = {
  closingDay?: number | null;
  creditLimit?: number;
  dueDay?: number | null;
  id: string;
  name: string;
  type: Exclude<PaymentMethodRow["type"], "cash" | "pix">;
};

export type SummaryData = {
  totalIncome: number;
  totalExpenses: number;
  predictedExpenses: number;
  totalSaved: number;
  currentBalance: number;
};

export type BudgetData = Record<
  DbCategoryGroup,
  { spent: number; budget: number; percentage: number }
>;

export type BudgetSplitItem = {
  amount: number;
  nameKey: string;
  maxAmount: number;
  spentAmount: number;
  value: number;
  color: string;
};

export type CategoryOverviewItem = {
  canModify: boolean;
  color: string;
  group: DbCategoryGroup;
  icon: string;
  id: string;
  isDefault: boolean;
  label: string;
  monthlyLimit: number;
  name: string;
  spent: number;
};

export type ExpensesByCategoryItem = {
  nameKey: string;
  value: number;
  color: string;
};

export type ExpensesOverTimeItem = {
  monthKey: string;
  amount: number;
  plannedAmount?: number;
};

export type ReportMonthlyItem = {
  excessExpenses: number;
  expenses: number;
  grossSavings: number;
  income: number;
  month: string;
  monthKey: string;
  netWorth: number;
  savings: number;
  year: string;
};

export type ReportTransactionItem = {
  amount: number;
  category: string;
  date: string;
  description: string;
  financialMonth: string;
  paymentMethod: string | null;
  type: TransactionType;
};

export type ReportsData = {
  monthlyReports: ReportMonthlyItem[];
  periodMonths: number;
  selectedMonth: string;
  transactions: ReportTransactionItem[];
};

export type DashboardData = TransactionFormOptions & {
  budgetData: BudgetData;
  budgetSplitData: BudgetSplitItem[];
  expensesByCategory: ExpensesByCategoryItem[];
  expensesOverTime: ExpensesOverTimeItem[];
  latestTransactions: Transaction[];
  summaryData: SummaryData;
};

export type BudgetOverviewData = {
  budgetData: BudgetData;
  budgetSplitData: BudgetSplitItem[];
  categories: CategoryOverviewItem[];
};

const monthKeys = [
  "data.month.jan",
  "data.month.feb",
  "data.month.mar",
  "data.month.apr",
  "data.month.may",
  "data.month.jun",
  "data.month.jul",
  "data.month.aug",
  "data.month.sep",
  "data.month.oct",
  "data.month.nov",
  "data.month.dec",
] as const;

const groupBudgetRatios = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
} as const;

const categoryGroups = ["needs", "wants", "savings"] as const;
const editablePaymentMethodTypes = [
  "bank",
  "boleto",
  "credit",
  "debit",
  "other",
] as const;
const transactionKinds = ["expense", "income", "saving"] as const;

const groupColors = {
  needs: "#F97316",
  wants: "#EC4899",
  savings: "#8B5CF6",
} as const;

const groupIcons = {
  income: "💼",
  needs: "🏠",
  savings: "📈",
  wants: "🎉",
} as const;

const categoryIconMap: Record<string, string> = {
  debt: "🧾",
  debts: "🧾",
  education: "📚",
  food: "🛒",
  health: "🏥",
  housing: "🏠",
  important: "⚡",
  income: "💼",
  investments: "📈",
  leisure: "🎮",
  other: "🏷️",
  others: "🏷️",
  shopping: "🛍️",
  subscriptions: "🎬",
  transportation: "🚗",
};

const transactionSelect = `
  id,
  date,
  description,
  amount,
  kind,
  notes,
  category_id,
  payment_method_id,
  categories (
    id,
    name,
    icon,
    group_type,
    is_default,
    monthly_limit
  ),
  payment_methods (
    id,
    name,
    due_day,
    type
  )
`;

const transactionSelectWithoutCategoryIcon = `
  id,
  date,
  description,
  amount,
  kind,
  notes,
  category_id,
  payment_method_id,
  categories (
    id,
    name,
    group_type,
    is_default,
    monthly_limit
  ),
  payment_methods (
    id,
    name,
    closing_day,
    due_day,
    type
  )
`;

const categoryTranslationMap: Record<string, string> = {
  debt: "data.category.debts",
  debts: "data.category.debts",
  education: "data.category.education",
  food: "data.category.food",
  health: "data.category.health",
  housing: "data.category.housing",
  important: "data.category.important",
  income: "data.category.receipts",
  investments: "data.category.investments",
  leisure: "data.category.leisure",
  other: "data.category.other",
  others: "data.category.other",
  shopping: "data.category.shopping",
  subscriptions: "data.category.subscriptions",
  transportation: "data.category.transportation",
};

const paymentMethodTranslationMap: Record<string, string> = {
  cash: "transaction.paymentMethods.cash",
  "credit card": "transaction.paymentMethods.creditCard",
  "debit card": "transaction.paymentMethods.debitCard",
  pix: "transaction.paymentMethods.pix",
};

const defaultPaymentMethodNames = new Set([
  "cash",
  "credit card",
  "debit card",
  "pix",
]);

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) {
    throw new Error(`${label} is invalid.`);
  }
}

function normalizeNullableId(value: string, label: string) {
  const normalizedValue = value.trim();

  if (normalizedValue === "none") return null;

  assertUuid(normalizedValue, label);
  return normalizedValue;
}

function isCategoryGroup(value: string): value is DbCategoryGroup {
  return categoryGroups.includes(value as DbCategoryGroup);
}

function isEditablePaymentMethodType(
  value: string,
): value is UpdatePaymentMethodInput["type"] {
  return editablePaymentMethodTypes.some((type) => type === value);
}

function isTransactionKind(value: string): value is DbTransactionKind {
  return transactionKinds.includes(value as DbTransactionKind);
}

function assertPositiveFiniteAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function assertValidMonthDay(value: number | null, label: string) {
  if (
    value !== null &&
    (!Number.isInteger(value) || value < 1 || value > 31)
  ) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertValidIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    !value.match(/^\d{4}-\d{2}-\d{2}$/) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Transaction date is invalid.");
  }
}

function assertValidColor(value: string) {
  if (!value.match(/^#[0-9a-f]{6}$/i)) {
    throw new Error("Color is invalid.");
  }
}

function assertNonEmptyString(value: string, label: string, maxLength = 160) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${label} is required.`);
  }

  if (trimmedValue.length > maxLength) {
    throw new Error(`${label} is too long.`);
  }

  return trimmedValue;
}

function normalizeOptionalString(value: string | undefined, maxLength = 500) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.length > maxLength) {
    throw new Error("Text field is too long.");
  }

  return trimmedValue;
}

function toCategoryLabelKey(categoryName: string, isDefault: boolean | null) {
  // Treat null as true (default to translating if is_default column doesn't exist)
  if (isDefault === false) {
    return categoryName;
  }

  return categoryTranslationMap[normalizeLabel(categoryName)] ?? categoryName;
}

function toCategoryIcon(categoryName: string, icon?: string | null) {
  return icon?.trim() || categoryIconMap[normalizeLabel(categoryName)] || "🏷️";
}

function toPaymentMethodLabelKey(
  paymentMethodName: string,
  paymentMethodType: PaymentMethodRow["type"],
  isDefault: boolean | null,
) {
  const normalizedPaymentMethodName = normalizeLabel(paymentMethodName);
  const shouldTranslateDefaultName =
    isDefault === true ||
    (isDefault === null &&
      defaultPaymentMethodNames.has(normalizedPaymentMethodName));

  if (!shouldTranslateDefaultName) {
    return paymentMethodName;
  }

  if (paymentMethodType === "pix") return "transaction.paymentMethods.pix";
  if (paymentMethodType === "cash") return "transaction.paymentMethods.cash";
  if (paymentMethodType === "credit")
    return "transaction.paymentMethods.creditCard";
  if (paymentMethodType === "debit")
    return "transaction.paymentMethods.debitCard";
  if (paymentMethodType === "boleto")
    return "transaction.paymentMethods.boleto";

  return (
    paymentMethodTranslationMap[normalizedPaymentMethodName] ??
    paymentMethodName
  );
}

async function getUserContext() {
  const supabase = await createClient();
  const [{ data: claimsData }, { data: userData }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.getUser(),
  ]);

  if (!claimsData?.claims?.sub) {
    redirect("/");
  }

  return {
    createdAt: userData.user?.created_at ?? null,
    supabase,
    userId: claimsData.claims.sub,
  };
}

function toUtcDateValue(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return [
    parsedDate.getUTCFullYear(),
    String(parsedDate.getUTCMonth() + 1).padStart(2, "0"),
    String(parsedDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function assertDateNotBeforeUserCreated(
  dateValue: string,
  userCreatedAt: string | null,
) {
  if (!userCreatedAt) return;

  const userCreatedDate = toUtcDateValue(userCreatedAt);

  if (!userCreatedDate) return;

  const userCreatedMonth = userCreatedDate.slice(0, 7);
  const transactionMonth = dateValue.slice(0, 7);

  if (transactionMonth < userCreatedMonth) {
    throw new Error(
      "Transaction date cannot be earlier than the user creation month.",
    );
  }
}

async function assertUserCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  categoryId: string | null,
) {
  if (!categoryId) return;
  assertUuid(categoryId, "Category");

  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate category: ${error.message}`);
  }

  if (!data) {
    throw new Error("Category is invalid.");
  }
}

async function assertUserPaymentMethod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  paymentMethodId: string | null,
) {
  if (!paymentMethodId) return;
  assertUuid(paymentMethodId, "Payment method");

  const { data, error } = await supabase
    .from("payment_methods")
    .select("id")
    .eq("id", paymentMethodId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate payment method: ${error.message}`);
  }

  if (!data) {
    throw new Error("Payment method is invalid.");
  }
}

function toIsoDate(dateValue: string) {
  const [day, month, year] = dateValue.split("/");

  if (!day || !month || !year) {
    return dateValue;
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function toDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addMonthsClamped(date: Date, monthOffset: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + monthOffset;
  const day = date.getDate();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfTargetMonth));
}

function toMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonthValue(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return toMonthValue(new Date(year, monthNumber - 2, 1));
}

function getFinancialMonth(transaction: Transaction) {
  if (
    transaction.paymentMethodType !== "credit" ||
    (!transaction.paymentMethodClosingDay && !transaction.paymentMethodDueDay)
  ) {
    return transaction.date.slice(0, 7);
  }

  const [year, month, day] = transaction.date.split("-").map(Number);
  const transactionMonth = new Date(year, month - 1, 1);
  const closingDay =
    transaction.paymentMethodClosingDay ?? transaction.paymentMethodDueDay;

  if (closingDay && day > closingDay) {
    return toMonthValue(addMonthsClamped(transactionMonth, 1));
  }

  return toMonthValue(transactionMonth);
}

function filterByFinancialMonth(
  transactions: Transaction[],
  month: string,
  includePrevious = false,
) {
  return transactions.filter((transaction) => {
    const financialMonth = getFinancialMonth(transaction);
    return includePrevious ? financialMonth <= month : financialMonth === month;
  });
}

function filterByTransactionMonth(
  transactions: Transaction[],
  month: string,
  includePrevious = false,
) {
  return transactions.filter((transaction) => {
    const transactionMonth = transaction.date.slice(0, 7);
    return includePrevious
      ? transactionMonth <= month
      : transactionMonth === month;
  });
}

function markPlannedTransactions(transactions: Transaction[]) {
  const today = getTodayValue();

  return transactions.map((transaction) =>
    transaction.date > today
      ? { ...transaction, isPlanned: true }
      : transaction,
  );
}

function toTransaction(row: TransactionRow): Transaction {
  const amount = Number(row.amount);
  const group =
    row.kind === "income" ? "income" : (row.categories?.group_type ?? "wants");
  const signedAmount = row.kind === "income" ? amount : -amount;
  const rawCategoryName = row.categories?.name ?? row.kind;
  const categoryName = toCategoryLabelKey(
    rawCategoryName,
    row.categories?.is_default ?? false,
  );
  const paymentMethodKey = row.payment_methods
    ? toPaymentMethodLabelKey(
        row.payment_methods.name,
        row.payment_methods.type,
        null,
      )
    : null;

  return {
    id: row.id,
    amount: signedAmount,
    categoryId: row.category_id,
    categoryKey: categoryName,
    date: row.date,
    descriptionKey: row.description || row.notes || categoryName,
    group,
    icon:
      row.kind === "income"
        ? groupIcons.income
        : toCategoryIcon(rawCategoryName, row.categories?.icon),
    notes: row.notes,
    paymentMethodId: row.payment_method_id,
    paymentMethodClosingDay:
      row.payment_methods?.closing_day == null
        ? null
        : Number(row.payment_methods.closing_day),
    paymentMethodDueDay:
      row.payment_methods?.due_day == null
        ? null
        : Number(row.payment_methods.due_day),
    paymentMethodKey,
    paymentMethodType: row.payment_methods?.type ?? null,
    type: row.kind,
  };
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeMonthValue(month?: string) {
  return month?.match(/^\d{4}-\d{2}$/) ? month : getCurrentMonthValue();
}

function getMonthRange(month?: string) {
  const normalizedMonth = normalizeMonthValue(month);
  const [year, monthNumber] = normalizedMonth.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  return {
    end: `${normalizedMonth}-${String(lastDay).padStart(2, "0")}`,
    month: normalizedMonth,
    start: `${normalizedMonth}-01`,
  };
}

function getCollectedMonthRange(month?: string) {
  const monthRange = getMonthRange(month);
  const today = getTodayValue();

  return {
    ...monthRange,
    end: monthRange.end > today ? today : monthRange.end,
  };
}

function getLastSixMonthKeys(month?: string) {
  return getLastMonthKeys(month, 6);
}

function getLastMonthKeys(month: string | undefined, count: number) {
  const normalizedMonth = normalizeMonthValue(month);
  const [year, monthNumber] = normalizedMonth.split("-").map(Number);
  const baseDate = new Date(year, monthNumber - 1, 1);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() - (count - 1 - index),
      1,
    );

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      monthKey: monthKeys[date.getMonth()],
      year: String(date.getFullYear()),
    };
  });
}

function getMonthlySavingsBalance(transactions: Transaction[]) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const savings = transactions
    .filter((transaction) => transaction.type === "saving")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const needsSpent = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.group === "needs",
    )
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const wantsSpent = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.group === "wants",
    )
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const excessExpenses =
    Math.max(needsSpent - income * groupBudgetRatios.needs, 0) +
    Math.max(wantsSpent - income * groupBudgetRatios.wants, 0);

  return savings - excessExpenses;
}

function getMonthlyFinanceSummary(transactions: Transaction[]) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const grossSavings = transactions
    .filter((transaction) => transaction.type === "saving")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const needsSpent = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.group === "needs",
    )
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const wantsSpent = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.group === "wants",
    )
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const excessExpenses =
    Math.max(needsSpent - income * groupBudgetRatios.needs, 0) +
    Math.max(wantsSpent - income * groupBudgetRatios.wants, 0);

  return {
    excessExpenses,
    expenses,
    grossSavings,
    income,
    savings: grossSavings - excessExpenses,
  };
}

function getCumulativeSavingsBalance(
  transactions: Transaction[],
  month: string,
) {
  const months = [
    ...new Set(
      transactions
        .map((transaction) => getFinancialMonth(transaction))
        .filter((financialMonth) => financialMonth <= month),
    ),
  ];

  return months.reduce((sum, financialMonth) => {
    const monthlyTransactions = transactions.filter(
      (transaction) => getFinancialMonth(transaction) === financialMonth,
    );

    return sum + getMonthlySavingsBalance(monthlyTransactions);
  }, 0);
}

function getSafeReportPeriod(periodMonths?: number) {
  if (!periodMonths || Number.isNaN(periodMonths)) return 6;
  return Math.min(Math.max(Math.trunc(periodMonths), 1), 12);
}

function emptyBudgetData(): BudgetData {
  return {
    needs: { budget: 0, percentage: 0, spent: 0 },
    savings: { budget: 0, percentage: 0, spent: 0 },
    wants: { budget: 0, percentage: 0, spent: 0 },
  };
}

async function listCategories() {
  const { supabase, userId } = await getUserContext();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, group_type, is_default, monthly_limit")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (!error) {
    return (data ?? []) as CategoryRow[];
  }

  if (error.code === "42703") {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("categories")
      .select("id, name, group_type, is_default, monthly_limit")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (fallbackError) {
      throw new Error(`Unable to load categories: ${fallbackError.message}`);
    }

    return (fallbackData ?? []) as CategoryRow[];
  }

  throw new Error(`Unable to load categories: ${error.message}`);
}

export async function listCategoryOverview(
  month?: string,
): Promise<CategoryOverviewItem[]> {
  const categories = await listCategories();
  const transactions = await listTransactions({ month });

  return categories.map((category) => {
    const label = toCategoryLabelKey(category.name, category.is_default);
    const spent = transactions
      .filter((transaction) => transaction.categoryId === category.id)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    return {
      color: groupColors[category.group_type],
      canModify: true,
      group: category.group_type,
      icon: toCategoryIcon(category.name, category.icon),
      id: category.id,
      isDefault: Boolean(category.is_default),
      label,
      monthlyLimit: Number(category.monthly_limit ?? 0),
      name: category.name,
      spent,
    };
  });
}

async function listPaymentMethods() {
  const { supabase, userId } = await getUserContext();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, type, is_default, credit_limit, due_day, closing_day")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (!error) {
    return (data ?? []) as PaymentMethodRow[];
  }

  // Backward-compatible fallback for schemas without is_default in payment_methods.
  if (error.code === "42703") {
    const { data: limitFallbackData, error: limitFallbackError } =
      await supabase
        .from("payment_methods")
        .select("id, name, type, credit_limit, due_day")
        .eq("user_id", userId)
        .order("name", { ascending: true });

    if (!limitFallbackError) {
      return (
        (limitFallbackData ?? []) as Omit<PaymentMethodRow, "is_default">[]
      ).map((paymentMethod) => ({
        ...paymentMethod,
        closing_day: null,
        is_default: null,
      }));
    }

    if (limitFallbackError.code !== "42703") {
      throw new Error(
        `Unable to load payment methods: ${limitFallbackError.message}`,
      );
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("payment_methods")
      .select("id, name, type")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (fallbackError) {
      throw new Error(
        `Unable to load payment methods: ${fallbackError.message}`,
      );
    }

    return (
      (fallbackData ?? []) as Omit<
        PaymentMethodRow,
        "credit_limit" | "is_default"
      >[]
    ).map((paymentMethod) => ({
      ...paymentMethod,
      closing_day: null,
      credit_limit: null,
      due_day: null,
      is_default: null,
    }));
  }

  throw new Error(`Unable to load payment methods: ${error.message}`);
}

function isProtectedPaymentMethod(paymentMethod: PaymentMethodRow) {
  return paymentMethod.type === "cash" || paymentMethod.type === "pix";
}

async function getCategoryForMutation(categoryId: string) {
  assertUuid(categoryId, "Category");

  const { supabase, userId } = await getUserContext();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, group_type, is_default, monthly_limit")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load category: ${error.message}`);
  }

  if (!data) {
    throw new Error("Category not found.");
  }

  return {
    category: data as CategoryRow,
    supabase,
    userId,
  };
}

export async function listPaymentMethodOverview(
  month?: string,
): Promise<PaymentMethodOverviewItem[]> {
  const [paymentMethods, transactions] = await Promise.all([
    listPaymentMethods(),
    listTransactions({ month }),
  ]);

  return paymentMethods.map((paymentMethod) => ({
    canModify: !isProtectedPaymentMethod(paymentMethod),
    closingDay:
      paymentMethod.closing_day == null
        ? null
        : Number(paymentMethod.closing_day),
    creditLimit: Number(paymentMethod.credit_limit ?? 0),
    dueDay:
      paymentMethod.due_day == null ? null : Number(paymentMethod.due_day),
    id: paymentMethod.id,
    isDefault: Boolean(paymentMethod.is_default),
    label: toPaymentMethodLabelKey(
      paymentMethod.name,
      paymentMethod.type,
      paymentMethod.is_default,
    ),
    name: paymentMethod.name,
    spent: transactions
      .filter(
        (transaction) =>
          transaction.paymentMethodId === paymentMethod.id &&
          transaction.type !== "income",
      )
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    type: paymentMethod.type,
  }));
}

export async function listSubscriptionOverview(): Promise<
  SubscriptionOverviewItem[]
> {
  const transactions = await listTransactions({ includeFuture: true });
  const today = getTodayValue();
  const subscriptionTransactions = transactions
    .filter((transaction) => transaction.notes?.startsWith("subscription"))
    .sort((left, right) => left.date.localeCompare(right.date));
  const groupedSubscriptions = new Map<string, SubscriptionOverviewItem>();

  for (const transaction of subscriptionTransactions) {
    const groupKey = [
      transaction.descriptionKey,
      transaction.categoryId ?? transaction.categoryKey,
      transaction.paymentMethodId ?? transaction.paymentMethodKey ?? "",
    ].join("|");
    const existingSubscription = groupedSubscriptions.get(groupKey);
    const isFutureOrToday = transaction.date >= today;

    if (!existingSubscription) {
      groupedSubscriptions.set(groupKey, {
        amount: Math.abs(transaction.amount),
        categoryId: transaction.categoryId,
        categoryKey: transaction.categoryKey,
        frequency: "monthly",
        icon: transaction.icon,
        id: transaction.id,
        name: transaction.descriptionKey,
        nextDate: transaction.date,
        paymentMethodId: transaction.paymentMethodId,
        paymentMethodKey: transaction.paymentMethodKey,
        status: transaction.notes?.includes("paused") ? "paused" : "active",
      });
      continue;
    }

    if (
      isFutureOrToday &&
      transaction.notes?.includes("paused") &&
      existingSubscription.status === "active"
    ) {
      existingSubscription.status = "paused";
    }

    if (
      (existingSubscription.nextDate < today && isFutureOrToday) ||
      (isFutureOrToday && transaction.date < existingSubscription.nextDate)
    ) {
      existingSubscription.nextDate = transaction.date;
    }
  }

  return [...groupedSubscriptions.values()].filter(
    (subscription) => subscription.nextDate >= today,
  );
}

export async function listGoals(): Promise<GoalOverviewItem[]> {
  const { supabase, userId } = await getUserContext();
  const { data, error } = await supabase
    .from("goals")
    .select("id, name, icon, target_amount, current_amount, deadline, color")
    .eq("user_id", userId)
    .order("deadline", { ascending: true })
    .order("created_at", { ascending: false });

  if (error?.code === "42P01") {
    return [];
  }

  if (error) {
    throw new Error(`Unable to load goals: ${error.message}`);
  }

  return ((data ?? []) as GoalRow[]).map((goal) => ({
    color: goal.color,
    currentAmount: Number(goal.current_amount),
    deadline: goal.deadline,
    icon: goal.icon,
    id: goal.id,
    name: goal.name,
    targetAmount: Number(goal.target_amount),
  }));
}

async function getPaymentMethodForMutation(paymentMethodId: string) {
  assertUuid(paymentMethodId, "Payment method");

  const { supabase, userId } = await getUserContext();
  const paymentMethodResult = await supabase
    .from("payment_methods")
    .select("id, name, type, is_default, credit_limit, due_day, closing_day")
    .eq("id", paymentMethodId)
    .eq("user_id", userId)
    .maybeSingle();
  let data = paymentMethodResult.data as PaymentMethodRow | null;
  let error = paymentMethodResult.error;

  if (error?.code === "42703") {
    const fallbackWithLimit = await supabase
      .from("payment_methods")
      .select("id, name, type, is_default, credit_limit, due_day")
      .eq("id", paymentMethodId)
      .eq("user_id", userId)
      .maybeSingle();
    const fallback =
      fallbackWithLimit.error?.code === "42703"
        ? await supabase
            .from("payment_methods")
            .select("id, name, type, credit_limit, due_day")
            .eq("id", paymentMethodId)
            .eq("user_id", userId)
            .maybeSingle()
        : fallbackWithLimit;

    data = fallback.data
        ? ({
          ...fallback.data,
          closing_day: null,
          is_default:
            "is_default" in fallback.data ? fallback.data.is_default : null,
        } as PaymentMethodRow)
      : null;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Unable to load payment method: ${error.message}`);
  }

  if (!data) {
    throw new Error("Payment method not found.");
  }

  return {
    paymentMethod: data as PaymentMethodRow,
    supabase,
    userId,
  };
}

export async function getTransactionFormOptions(): Promise<TransactionFormOptions> {
  const [categories, paymentMethods] = await Promise.all([
    listCategories(),
    listPaymentMethods(),
  ]);

  const mappedCategories = categories.map((category) => ({
    group: category.group_type,
    id: category.id,
    icon: toCategoryIcon(category.name, category.icon),
    label: toCategoryLabelKey(category.name, category.is_default),
    monthlyLimit: Number(category.monthly_limit ?? 0),
  }));

  const mappedPaymentMethods = paymentMethods.map((paymentMethod) => ({
    dueDay:
      paymentMethod.due_day == null ? null : Number(paymentMethod.due_day),
    id: paymentMethod.id,
    label: toPaymentMethodLabelKey(
      paymentMethod.name,
      paymentMethod.type,
      paymentMethod.is_default,
    ),
    type: paymentMethod.type,
  }));

  // If user has no categories or payment methods yet, provide a sentinel
  // "none" option so the form can render a placeholder and handle selection.
  const categoriesResult: TransactionFormCategory[] =
    mappedCategories.length > 0
      ? mappedCategories
      : [
          {
            group: "wants" as DbCategoryGroup,
            id: "none",
            icon: "🏷️",
            label: "none",
            monthlyLimit: 0,
          },
        ];

  const paymentMethodsResult: TransactionFormPaymentMethod[] =
    mappedPaymentMethods.length > 0
      ? mappedPaymentMethods
      : [
          {
            id: "none",
            label: "none",
            type: "cash",
          },
        ];

  return {
    categories: categoriesResult,
    paymentMethods: paymentMethodsResult,
  };
}

export async function createTransaction(input: NewTransactionInput) {
  const { createdAt, supabase, userId } = await getUserContext();
  const description = assertNonEmptyString(input.description, "Description");
  const amount = Math.abs(input.amount);
  assertPositiveFiniteAmount(amount, "Amount");

  if (input.type !== "income" && input.type !== "expense") {
    throw new Error("Transaction type is invalid.");
  }

  const categoryId =
    input.type === "income"
      ? null
      : normalizeNullableId(input.category, "Category");
  const paymentMethodId = normalizeNullableId(
    input.paymentMethod,
    "Payment method",
  );
  const kind: DbTransactionKind =
    input.type === "income" ? "income" : categoryId ? "expense" : input.type;
  const date = toIsoDate(input.date);
  const installmentCount = Number(input.installmentCount);

  assertValidIsoDate(date);
  assertDateNotBeforeUserCreated(date, createdAt);
  await Promise.all([
    assertUserCategory(supabase, userId, categoryId),
    assertUserPaymentMethod(supabase, userId, paymentMethodId),
  ]);

  if (
    !Number.isInteger(installmentCount) ||
    installmentCount < 1 ||
    installmentCount > 120
  ) {
    throw new Error("Installment count is invalid.");
  }

  const occurrenceCount = input.type === "expense" ? installmentCount : 1;
  const installmentAmount =
    installmentCount > 1
      ? Number((amount / installmentCount).toFixed(2))
      : amount;
  const totalRoundedInstallments = Number(
    (installmentAmount * installmentCount).toFixed(2),
  );
  const installmentRemainder = Number(
    (amount - totalRoundedInstallments).toFixed(2),
  );
  const notes = normalizeOptionalString(input.notes);

  const [year, month, day] = date.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  const rows = Array.from({ length: occurrenceCount }, (_, index) => {
    const occurrenceDate = addMonthsClamped(baseDate, index);
    const dateValue = [
      occurrenceDate.getFullYear(),
      String(occurrenceDate.getMonth() + 1).padStart(2, "0"),
      String(occurrenceDate.getDate()).padStart(2, "0"),
    ].join("-");
    const scheduleNote =
      installmentCount > 1 ? `${index + 1}/${installmentCount}` : null;
    const finalNotes =
      [scheduleNote, notes].filter(Boolean).join(" - ") || null;
    const rowAmount =
      index === installmentCount - 1
        ? Number((installmentAmount + installmentRemainder).toFixed(2))
        : installmentAmount;

    return {
      amount: rowAmount,
      category_id: categoryId,
      date: dateValue,
      description:
        installmentCount > 1
          ? `${description} (${index + 1}/${installmentCount})`
          : description,
      kind,
      notes: finalNotes,
      payment_method_id: paymentMethodId,
      user_id: userId,
    };
  });

  const { error } = await supabase.from("transactions").insert(rows);

  if (error) {
    throw new Error(`Unable to save transaction: ${error.message}`);
  }
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const { createdAt, supabase, userId } = await getUserContext();
  const description = assertNonEmptyString(input.description, "Subscription");
  const amount = Math.abs(input.amount);
  assertPositiveFiniteAmount(amount, "Amount");

  const categoryId = normalizeNullableId(input.category, "Category");
  const paymentMethodId = normalizeNullableId(
    input.paymentMethod,
    "Payment method",
  );
  const date = toIsoDate(input.nextDate);

  assertValidIsoDate(date);
  assertDateNotBeforeUserCreated(date, createdAt);
  await Promise.all([
    assertUserCategory(supabase, userId, categoryId),
    assertUserPaymentMethod(supabase, userId, paymentMethodId),
  ]);

  const [year, month, day] = date.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  const rows = Array.from({ length: 12 }, (_, index) => {
    const occurrenceDate = addMonthsClamped(baseDate, index);
    const dateValue = [
      occurrenceDate.getFullYear(),
      String(occurrenceDate.getMonth() + 1).padStart(2, "0"),
      String(occurrenceDate.getDate()).padStart(2, "0"),
    ].join("-");

    return {
      amount,
      category_id: categoryId,
      date: dateValue,
      description,
      kind: "expense" as DbTransactionKind,
      notes: `subscription ${index + 1}/12`,
      payment_method_id: paymentMethodId,
      user_id: userId,
    };
  });

  const { error } = await supabase.from("transactions").insert(rows);

  if (error) {
    throw new Error(`Unable to save subscription: ${error.message}`);
  }
}

type SubscriptionReferenceRow = {
  category_id: string | null;
  description: string;
  id: string;
  notes: string | null;
  payment_method_id: string | null;
};

type SubscriptionOccurrenceRow = {
  date: string;
  id: string;
};

async function getSubscriptionOccurrences(subscriptionId: string) {
  assertUuid(subscriptionId, "Subscription");
  const { supabase, userId } = await getUserContext();
  const { data: reference, error: referenceError } = await supabase
    .from("transactions")
    .select("id, description, category_id, payment_method_id, notes")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (referenceError) {
    throw new Error(
      `Unable to load subscription: ${referenceError.message}`,
    );
  }

  const subscription = reference as SubscriptionReferenceRow | null;

  if (!subscription?.notes?.startsWith("subscription")) {
    throw new Error("Subscription is invalid.");
  }

  let query = supabase
    .from("transactions")
    .select("id, date")
    .eq("user_id", userId)
    .eq("description", subscription.description)
    .like("notes", "subscription%")
    .gte("date", getTodayValue())
    .order("date", { ascending: true });

  query = subscription.category_id
    ? query.eq("category_id", subscription.category_id)
    : query.is("category_id", null);

  query = subscription.payment_method_id
    ? query.eq("payment_method_id", subscription.payment_method_id)
    : query.is("payment_method_id", null);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load subscription charges: ${error.message}`);
  }

  const occurrences = (data ?? []) as SubscriptionOccurrenceRow[];

  if (!occurrences.length) {
    throw new Error("No future subscription charges found.");
  }

  return { occurrences, subscription, supabase, userId };
}

export async function updateSubscription(input: UpdateSubscriptionInput) {
  const { createdAt } = await getUserContext();
  const description = assertNonEmptyString(input.description, "Subscription");
  const amount = Math.abs(input.amount);
  assertPositiveFiniteAmount(amount, "Amount");

  const categoryId = normalizeNullableId(input.category, "Category");
  const paymentMethodId = normalizeNullableId(
    input.paymentMethod,
    "Payment method",
  );
  const date = toIsoDate(input.nextDate);

  assertValidIsoDate(date);
  assertDateNotBeforeUserCreated(date, createdAt);

  const { occurrences, supabase, userId } = await getSubscriptionOccurrences(
    input.id,
  );

  await Promise.all([
    assertUserCategory(supabase, userId, categoryId),
    assertUserPaymentMethod(supabase, userId, paymentMethodId),
  ]);

  const [year, month, day] = date.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  const updates = occurrences.map((occurrence, index) =>
    supabase
      .from("transactions")
      .update({
        amount,
        category_id: categoryId,
        date: toDateValue(addMonthsClamped(baseDate, index)),
        description,
        notes: `subscription ${index + 1}/12`,
        payment_method_id: paymentMethodId,
      })
      .eq("id", occurrence.id)
      .eq("user_id", userId),
  );
  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;

  if (error) {
    throw new Error(`Unable to update subscription: ${error.message}`);
  }
}

export async function setSubscriptionPaused(
  subscriptionId: string,
  paused: boolean,
) {
  const { occurrences, supabase, userId } =
    await getSubscriptionOccurrences(subscriptionId);
  const updates = occurrences.map((occurrence, index) =>
    supabase
      .from("transactions")
      .update({
        notes: paused
          ? `subscription paused ${index + 1}/12`
          : `subscription ${index + 1}/12`,
      })
      .eq("id", occurrence.id)
      .eq("user_id", userId),
  );
  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;

  if (error) {
    throw new Error(`Unable to update subscription status: ${error.message}`);
  }
}

export async function deleteSubscription(subscriptionId: string) {
  const { occurrences, supabase, userId } =
    await getSubscriptionOccurrences(subscriptionId);
  const occurrenceIds = occurrences.map((occurrence) => occurrence.id);
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .in("id", occurrenceIds);

  if (error) {
    throw new Error(`Unable to delete subscription: ${error.message}`);
  }
}

export async function createPaymentMethod(input: CreatePaymentMethodInput) {
  const { supabase, userId } = await getUserContext();
  const name = assertNonEmptyString(input.name, "Payment method name");
  const creditLimit = Number(input.creditLimit ?? 0);
  const dueDay = input.type === "credit" ? (input.dueDay ?? null) : null;
  const closingDay =
    input.type === "credit" ? (input.closingDay ?? null) : null;

  if (!isEditablePaymentMethodType(input.type)) {
    throw new Error("Payment method type is invalid.");
  }

  if (!Number.isFinite(creditLimit) || creditLimit < 0) {
    throw new Error("Payment method credit limit is invalid.");
  }

  assertValidMonthDay(dueDay, "Payment method due day");
  assertValidMonthDay(closingDay, "Payment method closing day");

  const { error } = await supabase.from("payment_methods").insert({
    closing_day: closingDay,
    credit_limit: creditLimit,
    due_day: dueDay,
    name,
    type: input.type,
    user_id: userId,
  });

  if (error?.code === "42703") {
    const fallbackWithLimit = await supabase.from("payment_methods").insert({
      credit_limit: creditLimit,
      due_day: dueDay,
      name,
      type: input.type,
      user_id: userId,
    });
    const fallbackError =
      fallbackWithLimit.error?.code === "42703"
        ? (
            await supabase.from("payment_methods").insert({
              name,
              type: input.type,
              user_id: userId,
            })
          ).error
        : fallbackWithLimit.error;

    if (fallbackError) {
      throw new Error(
        `Unable to save payment method: ${fallbackError.message}`,
      );
    }

    return;
  }

  if (error) {
    throw new Error(`Unable to save payment method: ${error.message}`);
  }
}

export async function updatePaymentMethod(input: UpdatePaymentMethodInput) {
  assertUuid(input.id, "Payment method");
  const name = assertNonEmptyString(input.name, "Payment method name");
  const creditLimit = Number(input.creditLimit ?? 0);
  const dueDay = input.type === "credit" ? (input.dueDay ?? null) : null;
  const closingDay =
    input.type === "credit" ? (input.closingDay ?? null) : null;

  if (!isEditablePaymentMethodType(input.type)) {
    throw new Error("Payment method type is invalid.");
  }

  if (!Number.isFinite(creditLimit) || creditLimit < 0) {
    throw new Error("Payment method credit limit is invalid.");
  }

  assertValidMonthDay(dueDay, "Payment method due day");
  assertValidMonthDay(closingDay, "Payment method closing day");

  const { paymentMethod, supabase, userId } = await getPaymentMethodForMutation(
    input.id,
  );

  if (isProtectedPaymentMethod(paymentMethod)) {
    throw new Error("This payment method cannot be edited.");
  }

  const { error } = await supabase
    .from("payment_methods")
    .update({
      closing_day: closingDay,
      credit_limit: creditLimit,
      due_day: dueDay,
      name,
      type: input.type,
    })
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error?.code === "42703") {
    const fallbackWithLimit = await supabase
      .from("payment_methods")
      .update({
        credit_limit: creditLimit,
        due_day: dueDay,
        name,
        type: input.type,
      })
      .eq("id", input.id)
      .eq("user_id", userId);
    const fallbackError =
      fallbackWithLimit.error?.code === "42703"
        ? (
            await supabase
              .from("payment_methods")
              .update({
                name,
                type: input.type,
              })
              .eq("id", input.id)
              .eq("user_id", userId)
          ).error
        : fallbackWithLimit.error;

    if (fallbackError) {
      throw new Error(
        `Unable to update payment method: ${fallbackError.message}`,
      );
    }

    return;
  }

  if (error) {
    throw new Error(`Unable to update payment method: ${error.message}`);
  }
}

export async function deletePaymentMethod(paymentMethodId: string) {
  assertUuid(paymentMethodId, "Payment method");
  const { paymentMethod, supabase, userId } =
    await getPaymentMethodForMutation(paymentMethodId);

  if (isProtectedPaymentMethod(paymentMethod)) {
    throw new Error("This payment method cannot be deleted.");
  }

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", paymentMethodId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to delete payment method: ${error.message}`);
  }
}

export async function createGoal(input: CreateGoalInput) {
  const { createdAt, supabase, userId } = await getUserContext();
  const name = assertNonEmptyString(input.name, "Goal name");
  const icon = assertNonEmptyString(input.icon, "Goal icon", 32);
  const targetAmount = Number(input.targetAmount);
  const currentAmount = Number(input.currentAmount ?? 0);
  const deadline = toIsoDate(input.deadline);

  assertPositiveFiniteAmount(targetAmount, "Target amount");
  if (!Number.isFinite(currentAmount) || currentAmount < 0) {
    throw new Error("Current amount is invalid.");
  }
  assertValidIsoDate(deadline);
  assertDateNotBeforeUserCreated(deadline, createdAt);
  assertValidColor(input.color);

  const { error } = await supabase.from("goals").insert({
    color: input.color,
    current_amount: Math.min(currentAmount, targetAmount),
    deadline,
    icon,
    name,
    target_amount: targetAmount,
    user_id: userId,
  });

  if (error) {
    throw new Error(`Unable to save goal: ${error.message}`);
  }
}

export async function updateGoal(input: UpdateGoalInput) {
  assertUuid(input.id, "Goal");
  const { createdAt, supabase, userId } = await getUserContext();
  const name = assertNonEmptyString(input.name, "Goal name");
  const icon = assertNonEmptyString(input.icon, "Goal icon", 32);
  const targetAmount = Number(input.targetAmount);
  const currentAmount = Number(input.currentAmount ?? 0);
  const deadline = toIsoDate(input.deadline);

  assertPositiveFiniteAmount(targetAmount, "Target amount");
  if (!Number.isFinite(currentAmount) || currentAmount < 0) {
    throw new Error("Current amount is invalid.");
  }
  assertValidIsoDate(deadline);
  assertDateNotBeforeUserCreated(deadline, createdAt);
  assertValidColor(input.color);

  const { error } = await supabase
    .from("goals")
    .update({
      color: input.color,
      current_amount: Math.min(currentAmount, targetAmount),
      deadline,
      icon,
      name,
      target_amount: targetAmount,
    })
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to update goal: ${error.message}`);
  }
}

export async function addGoalFunds(goalId: string, amount: number) {
  assertUuid(goalId, "Goal");
  assertPositiveFiniteAmount(amount, "Amount");
  const { supabase, userId } = await getUserContext();
  const { data, error: loadError } = await supabase
    .from("goals")
    .select("current_amount, target_amount")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Unable to load goal: ${loadError.message}`);
  }

  if (!data) {
    throw new Error("Goal not found.");
  }

  const currentAmount = Number(data.current_amount ?? 0);
  const targetAmount = Number(data.target_amount);
  const { error } = await supabase
    .from("goals")
    .update({
      current_amount: Math.min(currentAmount + amount, targetAmount),
    })
    .eq("id", goalId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to add goal funds: ${error.message}`);
  }
}

export async function deleteGoal(goalId: string) {
  assertUuid(goalId, "Goal");
  const { supabase, userId } = await getUserContext();
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to delete goal: ${error.message}`);
  }
}

export async function createCategory(input: CreateCategoryInput) {
  const { supabase, userId } = await getUserContext();
  const name = assertNonEmptyString(input.name, "Category name");
  const monthlyLimit = Number(input.monthlyLimit ?? 0);

  if (!isCategoryGroup(input.group)) {
    throw new Error("Category group is invalid.");
  }

  if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
    throw new Error("Category monthly limit is invalid.");
  }

  const payload = {
    group_type: input.group,
    icon: toCategoryIcon(input.name, input.icon),
    is_default: false,
    monthly_limit: monthlyLimit,
    name,
    user_id: userId,
  };

  const { error } = await supabase.from("categories").insert(payload);

  if (error?.code === "42703") {
    const fallbackPayload: Omit<typeof payload, "icon"> & { icon?: string } = {
      ...payload,
    };
    delete fallbackPayload.icon;
    const { error: fallbackError } = await supabase
      .from("categories")
      .insert(fallbackPayload);

    if (fallbackError) {
      throw new Error(`Unable to save category: ${fallbackError.message}`);
    }

    return;
  }

  if (error) {
    throw new Error(`Unable to save category: ${error.message}`);
  }
}

export async function updateCategory(input: UpdateCategoryInput) {
  const name = assertNonEmptyString(input.name, "Category name");
  const monthlyLimit = Number(input.monthlyLimit ?? 0);

  if (!isCategoryGroup(input.group)) {
    throw new Error("Category group is invalid.");
  }

  if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
    throw new Error("Category monthly limit is invalid.");
  }

  const { supabase, userId } = await getCategoryForMutation(input.id);

  const payload = {
    group_type: input.group,
    icon: toCategoryIcon(input.name, input.icon),
    monthly_limit: monthlyLimit,
    name,
  };

  const { error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error?.code === "42703") {
    const fallbackPayload: Omit<typeof payload, "icon"> & { icon?: string } = {
      ...payload,
    };
    delete fallbackPayload.icon;
    const { error: fallbackError } = await supabase
      .from("categories")
      .update(fallbackPayload)
      .eq("id", input.id)
      .eq("user_id", userId);

    if (fallbackError) {
      throw new Error(`Unable to update category: ${fallbackError.message}`);
    }

    return;
  }

  if (error) {
    throw new Error(`Unable to update category: ${error.message}`);
  }
}

export async function deleteCategory(categoryId: string) {
  const { supabase, userId } = await getCategoryForMutation(categoryId);

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to delete category: ${error.message}`);
  }
}

export async function updateTransaction(input: UpdateTransactionInput) {
  const { createdAt, supabase, userId } = await getUserContext();
  assertUuid(input.id, "Transaction");
  const amount = Math.abs(input.amount);
  const date = toIsoDate(input.date);
  const description = assertNonEmptyString(input.description, "Description");

  assertPositiveFiniteAmount(amount, "Amount");
  assertValidIsoDate(date);
  assertDateNotBeforeUserCreated(date, createdAt);

  if (!isTransactionKind(input.type)) {
    throw new Error("Transaction type is invalid.");
  }

  const categoryId =
    input.type === "income" || input.category === "none"
      ? null
      : input.category;
  const paymentMethodId =
    input.paymentMethod === "none" ? null : input.paymentMethod;

  await Promise.all([
    assertUserCategory(supabase, userId, categoryId),
    assertUserPaymentMethod(supabase, userId, paymentMethodId),
  ]);

  const { error } = await supabase
    .from("transactions")
    .update({
      amount,
      category_id: categoryId,
      date,
      description,
      kind: input.type,
      notes: input.notes?.trim() || null,
      payment_method_id: paymentMethodId,
    })
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to update transaction: ${error.message}`);
  }
}

export async function deleteTransaction(transactionId: string) {
  assertUuid(transactionId, "Transaction");
  const { supabase, userId } = await getUserContext();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to delete transaction: ${error.message}`);
  }
}

export async function listTransactions(options?: {
  includePrevious?: boolean;
  includeFuture?: boolean;
  month?: string;
  useFinancialMonth?: boolean;
}) {
  const { supabase, userId } = await getUserContext();
  const includePrevious = options?.includePrevious ?? false;
  const includeFuture = options?.includeFuture ?? false;
  const useFinancialMonth = options?.useFinancialMonth ?? true;
  const monthRange = options?.month
    ? includeFuture
      ? getMonthRange(options.month)
      : getCollectedMonthRange(options.month)
    : null;
  const queryStart = monthRange
    ? useFinancialMonth
      ? `${getPreviousMonthValue(monthRange.month)}-01`
      : monthRange.start
    : null;
  const filterByMonth = useFinancialMonth
    ? filterByFinancialMonth
    : filterByTransactionMonth;

  let query = supabase
    .from("transactions")
    .select(transactionSelect)
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (monthRange) {
    query = query.lte("date", monthRange.end);
    if (!includePrevious && queryStart) {
      query = query.gte("date", queryStart);
    }
  } else if (!includeFuture) {
    query = query.lte("date", getTodayValue());
  }

  const { data, error } = await query;

  if (!error) {
    const transactions = ((data ?? []) as unknown as TransactionRow[]).map(
      toTransaction,
    );
    const filteredTransactions = monthRange
      ? filterByMonth(transactions, monthRange.month, includePrevious)
      : transactions;

    return includeFuture
      ? markPlannedTransactions(filteredTransactions)
      : filteredTransactions;
  }

  if (error.code === "42703") {
    let fallbackQuery = supabase
      .from("transactions")
      .select(transactionSelectWithoutCategoryIcon)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (monthRange) {
      fallbackQuery = fallbackQuery.lte("date", monthRange.end);
      if (!includePrevious && queryStart) {
        fallbackQuery = fallbackQuery.gte("date", queryStart);
      }
    } else if (!includeFuture) {
      fallbackQuery = fallbackQuery.lte("date", getTodayValue());
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;

    if (fallbackError) {
      throw new Error(`Unable to load transactions: ${fallbackError.message}`);
    }

    const transactions = (
      (fallbackData ?? []) as unknown as TransactionRow[]
    ).map(toTransaction);
    const filteredTransactions = monthRange
      ? filterByMonth(transactions, monthRange.month, includePrevious)
      : transactions;

    return includeFuture
      ? markPlannedTransactions(filteredTransactions)
      : filteredTransactions;
  }

  throw new Error(`Unable to load transactions: ${error.message}`);
}

export async function getDashboardData(month?: string): Promise<DashboardData> {
  const selectedMonth = normalizeMonthValue(month);
  const monthBuckets = getLastSixMonthKeys(selectedMonth);
  const [
    transactions,
    scheduledTransactions,
    trendTransactions,
    { categories, paymentMethods },
  ] = await Promise.all([
    listTransactions({ month: selectedMonth }),
    listTransactions({ includeFuture: true, month: selectedMonth }),
    listTransactions({ includePrevious: true, month: selectedMonth }),
    getTransactionFormOptions(),
  ]);
  const incomeTransactions = transactions.filter(
    (transaction) => transaction.type === "income",
  );
  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const trendExpenseTransactions = trendTransactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const scheduledExpenseTransactions = scheduledTransactions.filter(
    (transaction) => transaction.type === "expense",
  );

  const totalIncome = incomeTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0,
  );
  const totalExpenses = expenseTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0,
  );
  const predictedExpenses = scheduledExpenseTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0,
  );
  const totalSaved = getCumulativeSavingsBalance(
    trendTransactions,
    selectedMonth,
  );

  const budgetData = emptyBudgetData();
  for (const group of Object.keys(groupBudgetRatios) as DbCategoryGroup[]) {
    const spent = transactions
      .filter((transaction) => transaction.group === group)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const budget = totalIncome * groupBudgetRatios[group];

    budgetData[group] = {
      budget,
      percentage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
      spent,
    };
  }

  const expensesByCategory = expenseTransactions
    .reduce((acc, transaction) => {
      const group = transaction.group as DbCategoryGroup;
      const nameKey = `data.group.${group}`;
      const existing = acc.find((item) => item.nameKey === nameKey);

      if (existing) {
        existing.value += Math.abs(transaction.amount);
      } else {
        acc.push({
          color: groupColors[group] ?? "#64748B",
          nameKey,
          value: Math.abs(transaction.amount),
        });
      }

      return acc;
    }, [] as ExpensesByCategoryItem[])
    .sort((left, right) => {
      const order = {
        "data.group.needs": 0,
        "data.group.wants": 1,
        "data.group.savings": 2,
      };

      return (
        (order[left.nameKey as keyof typeof order] ?? 99) -
        (order[right.nameKey as keyof typeof order] ?? 99)
      );
    });

  const expensesOverTime = monthBuckets.map((monthBucket) => ({
    amount: trendExpenseTransactions
      .filter(
        (transaction) => getFinancialMonth(transaction) === monthBucket.key,
      )
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    plannedAmount: scheduledExpenseTransactions
      .filter(
        (transaction) => getFinancialMonth(transaction) === monthBucket.key,
      )
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    monthKey: monthBucket.monthKey,
  }));

  const budgetSplitData = [
    {
      amount: budgetData.needs.spent,
      color: groupColors.needs,
      maxAmount: totalIncome * groupBudgetRatios.needs,
      nameKey: "data.group.needs",
      spentAmount: budgetData.needs.spent,
      value: 50,
    },
    {
      amount: budgetData.wants.spent,
      color: groupColors.wants,
      maxAmount: totalIncome * groupBudgetRatios.wants,
      nameKey: "data.group.wants",
      spentAmount: budgetData.wants.spent,
      value: 30,
    },
    {
      amount: budgetData.savings.spent,
      color: groupColors.savings,
      maxAmount: totalIncome * groupBudgetRatios.savings,
      nameKey: "data.group.savings",
      spentAmount: budgetData.savings.spent,
      value: 20,
    },
  ];

  return {
    budgetData,
    budgetSplitData,
    categories,
    expensesByCategory,
    expensesOverTime,
    // Merge recent actual transactions with scheduled (future) transactions,
    // marking scheduled ones with `isPlanned` so the UI can render them faded.
    latestTransactions: (() => {
      const today = getTodayValue();
      const byId = new Map<string, Transaction>();

      for (const tx of transactions) {
        byId.set(tx.id, tx);
      }

      for (const tx of scheduledTransactions) {
        // if already present (actual), skip; otherwise add as planned only
        if (!byId.has(tx.id)) {
          // mark planned if in the future relative to today
          const isPlanned = tx.date > today;
          byId.set(tx.id, { ...tx, isPlanned });
        }
      }

      return [...byId.values()]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
    })(),
    paymentMethods,
    summaryData: {
      currentBalance: totalIncome - totalExpenses,
      predictedExpenses,
      totalExpenses,
      totalIncome,
      totalSaved,
    },
  };
}

export async function getReportsData(
  month?: string,
  periodMonths?: number,
): Promise<ReportsData> {
  const selectedMonth = normalizeMonthValue(month);
  const safePeriodMonths = getSafeReportPeriod(periodMonths);
  const periodBuckets = getLastMonthKeys(selectedMonth, safePeriodMonths);
  const periodMonthSet = new Set(periodBuckets.map((bucket) => bucket.key));
  const transactions = await listTransactions({
    includePrevious: true,
    month: selectedMonth,
  });
  const transactionMonthPairs = transactions.map((transaction) => ({
    financialMonth: getFinancialMonth(transaction),
    transaction,
  }));
  const allMonthKeys = [
    ...new Set(transactionMonthPairs.map((pair) => pair.financialMonth)),
  ].sort();
  const netWorthByMonth = new Map<string, number>();
  let netWorth = 0;

  for (const financialMonth of allMonthKeys) {
    const monthTransactions = transactionMonthPairs
      .filter((pair) => pair.financialMonth === financialMonth)
      .map((pair) => pair.transaction);
    netWorth += getMonthlyFinanceSummary(monthTransactions).savings;
    netWorthByMonth.set(financialMonth, netWorth);
  }

  let lastKnownNetWorth = 0;
  const monthlyReports = periodBuckets.map((bucket) => {
    const monthTransactions = transactionMonthPairs
      .filter((pair) => pair.financialMonth === bucket.key)
      .map((pair) => pair.transaction);
    const summary = getMonthlyFinanceSummary(monthTransactions);

    if (netWorthByMonth.has(bucket.key)) {
      lastKnownNetWorth = netWorthByMonth.get(bucket.key) ?? lastKnownNetWorth;
    } else {
      const previousMonthWithBalance = allMonthKeys
        .filter((financialMonth) => financialMonth < bucket.key)
        .at(-1);
      lastKnownNetWorth = previousMonthWithBalance
        ? (netWorthByMonth.get(previousMonthWithBalance) ?? lastKnownNetWorth)
        : 0;
    }

    return {
      ...summary,
      month: bucket.key,
      monthKey: bucket.monthKey,
      netWorth: lastKnownNetWorth,
      year: bucket.year,
    };
  });

  const reportTransactions = transactionMonthPairs
    .filter((pair) => periodMonthSet.has(pair.financialMonth))
    .map(({ financialMonth, transaction }) => ({
      amount: Math.abs(transaction.amount),
      category: transaction.categoryKey,
      date: transaction.date,
      description: transaction.descriptionKey,
      financialMonth,
      paymentMethod: transaction.paymentMethodKey ?? null,
      type: transaction.type,
    }))
    .sort((left, right) => right.date.localeCompare(left.date));

  return {
    monthlyReports: monthlyReports.reverse(),
    periodMonths: safePeriodMonths,
    selectedMonth,
    transactions: reportTransactions,
  };
}

export async function getBudgetOverviewData(
  month?: string,
): Promise<BudgetOverviewData> {
  const [dashboardData, categories] = await Promise.all([
    getDashboardData(month),
    listCategoryOverview(month),
  ]);

  return {
    budgetData: dashboardData.budgetData,
    budgetSplitData: dashboardData.budgetSplitData,
    categories,
  };
}
