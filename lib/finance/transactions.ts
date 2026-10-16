import "server-only";

import { redirect } from "next/navigation";
import {
  isAuthSessionMissingError,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import {
  decryptDescription,
  decryptField,
  encryptDescription,
  encryptField,
} from "@/lib/crypto/field-encryption";
import {
  type CreditCardInvoiceDetails,
  type Transaction,
  type TransactionGroup,
  type TransactionType,
} from "@/lib/data";
import {
  calculateBudgetData,
  sumBudgetUsageByGroup,
} from "@/lib/finance/budget";
import {
  buildExpensesByCategoryData,
  type ExpensesByCategoryItem,
} from "@/lib/finance/category-aggregation";
import {
  allocateSavingsFunding,
  buildAmortization,
  buildFinancingBreakdown,
  getAccrual,
  resolveFinancingSchedule,
  toCents,
  type AmortizationMode,
  type FinancingBreakdown,
  type FinancingPlanRecord,
  type FinancingSchedule,
  type TransactionFinancingInput,
} from "@/lib/finance/financing";
import {
  getInvoiceAdvancePaymentInvoiceId,
  getInvoiceAdvancePaymentNote,
  withCreditCardInvoiceTransactions,
} from "@/lib/finance/credit-card-invoices";
import {
  getPaymentMethodDetail,
  type PaymentMethodDetail,
} from "@/lib/finance/payment-method-overview";
import {
  createInstallmentMetadata,
  getInstallmentPrepaymentSummary,
  isInstallmentTransaction,
  selectInstallmentsForDeletion,
  selectInstallmentsForPrepayment,
  type InstallmentDeleteScope,
  type InstallmentPrepaymentScope,
} from "@/lib/finance/installments";
import {
  buildSubscriptionOverview,
  selectSubscriptionOccurrencesForDeletion,
  shouldShowSubscriptionOccurrenceInTransactionHistory,
  type SubscriptionOverviewItem,
} from "@/lib/finance/subscriptions";

export {
  getSubscriptionMatchKey,
  type SubscriptionOverviewItem,
} from "@/lib/finance/subscriptions";
import { GROUP_COLORS } from "@/lib/finance/group-colors";
import {
  buildDebtOverview,
  stripInstallmentSuffix,
  type DebtOverview,
} from "@/lib/finance/debts";
import { createClient } from "@/lib/supabase/server";

export { buildExpensesByCategoryData };
export type { ExpensesByCategoryItem };

export type AuthenticatedUserClaims = {
  email?: string;
  sub: string;
} & Record<string, unknown>;

export type AuthenticatedUserContext = {
  claims: AuthenticatedUserClaims;
  createdAt: string | null;
  supabase: SupabaseClient;
  user: User;
  userId: string;
};

type DbCategoryGroup = Exclude<TransactionGroup, "income">;
type DbTransactionKind = TransactionType;

type CategoryRow = {
  icon?: string | null;
  id: string;
  group_type: TransactionGroup;
  is_default: boolean | null;
  monthly_limit: number | string | null;
  name: string;
};

type PaymentMethodRow = {
  closing_day?: number | string | null;
  credit_limit: number | string | null;
  due_day?: number | string | null;
  id: string;
  name: string;
  type: "pix" | "debit" | "credit" | "cash" | "bank" | "boleto" | "other";
};

type TransactionRow = {
  id: string;
  amount: number | string;
  advanced_at?: string | null;
  advanced_to_month?: string | null;
  date: string;
  description: string;
  kind: DbTransactionKind;
  installment_group_id?: string | null;
  installment_number?: number | string | null;
  installment_total?: number | string | null;
  financing_plan_id?: string | null;
  goal_id?: string | null;
  savings_funded_amount?: number | string | null;
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
  group: TransactionGroup;
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
  detail: PaymentMethodDetail;
  dueDay: number | null;
  isDefault: boolean;
  name: string;
  spent: number;
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
  type: "income" | "expense" | "saving";
  date: string;
  amount: number;
  category: string;
  paymentMethod: string;
  installmentCount: number;
  description: string;
  notes?: string;
  savingsFundedAmount?: number;
  financing?: TransactionFinancingInput;
  // Goal that receives this expense's amount once each row's date is reached.
  goalId?: string;
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

export type CreateInvoiceAdvancePaymentInput = {
  amount: number;
  date: string;
  invoiceId: string;
  paymentMethod: string;
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
  // undefined keeps the current link, null removes it.
  goalId?: string | null;
};

export type DeleteInstallmentsInput = {
  scope: InstallmentDeleteScope;
  transactionId: string;
};

export type AdvanceInstallmentsInput = {
  count?: number;
  scope?: InstallmentPrepaymentScope;
  targetMonth: string;
  transactionId: string;
};

export type InstallmentPrepaymentPreview = {
  count: number;
  installments: { amount: number; date: string; id: string }[];
  targetMonth: string;
  totalAmount: number;
};

export type SubscriptionDeleteScope = "single" | "this_and_following_unpaid";

export type DeleteSubscriptionOccurrencesInput = {
  scope: SubscriptionDeleteScope;
  transactionId: string;
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
  trends: {
    totalExpenses: number;
    totalIncome: number;
    totalSaved: number;
  };
};

export type BudgetData = Record<
  DbCategoryGroup,
  { spent: number; plannedSpent: number; budget: number; percentage: number }
>;

export type BudgetSplitItem = {
  amount: number;
  nameKey: string;
  maxAmount: number;
  spentAmount: number;
  plannedSpentAmount: number;
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

export type ExpensesOverTimeItem = {
  monthKey: string;
  amount: number;
  plannedAmount?: number;
};

export type DailyExpensesOverTimeItem = {
  amount: number;
  date: string;
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

export type PaymentsDueStatus = "planned" | "next";

export type PaymentInvoiceItem = {
  amount: number;
  dueDate: string;
  id: string;
  invoice: CreditCardInvoiceDetails;
  paidAmount: number;
  paymentMethodKey: string;
  purchaseCount: number;
  status: PaymentsDueStatus;
  totalAmount: number;
};

export type PaymentBillItem = {
  amount: number;
  categoryKey: string;
  date: string;
  descriptionKey: string;
  id: string;
  paymentMethodKey?: string | null;
  status: PaymentsDueStatus;
};

export type PaymentsDueSummary = {
  nextDueDate: string | null;
  totalBills: number;
  totalDue: number;
  totalInvoices: number;
  totalSubscriptions: number;
};

export type PaymentsDueData = {
  bills: PaymentBillItem[];
  invoices: PaymentInvoiceItem[];
  subscriptions: SubscriptionOverviewItem[];
  summary: PaymentsDueSummary;
};

export type DashboardData = TransactionFormOptions & {
  budgetData: BudgetData;
  budgetSplitData: BudgetSplitItem[];
  expensesByCategory: ExpensesByCategoryItem[];
  expensesOverTime: ExpensesOverTimeItem[];
  dailyExpensesOverTime: DailyExpensesOverTimeItem[];
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

const categoryGroups = ["needs", "wants", "savings"] as const;
const editablePaymentMethodTypes = [
  "bank",
  "boleto",
  "credit",
  "debit",
  "other",
] as const;
const transactionKinds = ["expense", "income", "saving"] as const;

const groupColors = GROUP_COLORS;

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
  reserve: "🛟",
  shopping: "🛍️",
  subscriptions: "🎬",
  transportation: "🚗",
};

const transactionSelect = `
  id,
  date,
  description,
  amount,
  advanced_at,
  advanced_to_month,
  kind,
  installment_group_id,
  installment_number,
  installment_total,
  financing_plan_id,
  goal_id,
  savings_funded_amount,
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
    closing_day,
    due_day,
    type
  )
`;

const transactionSelectWithoutAdvancedMetadata = `
  id,
  date,
  description,
  amount,
  kind,
  installment_group_id,
  installment_number,
  installment_total,
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
  reserve: "data.category.reserve",
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
  return editablePaymentMethodTypes.includes(
    value as UpdatePaymentMethodInput["type"],
  );
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
  if (value !== null && (!Number.isInteger(value) || value < 1 || value > 31)) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertValidIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.exec(value) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Transaction date is invalid.");
  }
}

function assertValidColor(value: string) {
  if (!/^#[0-9a-f]{6}$/i.exec(value)) {
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
    /* c8 ignore next */
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

  /* c8 ignore next 3 */
  return (
    paymentMethodTranslationMap[normalizedPaymentMethodName] ??
    paymentMethodName
  );
}

export async function getUserContext(
  supabaseClient?: SupabaseClient | Promise<SupabaseClient>,
): Promise<AuthenticatedUserContext> {
  const supabase = supabaseClient
    ? await (supabaseClient as Promise<SupabaseClient>)
    : await createClient();
  const [
    { data: claimsData, error: claimsError },
    { data: userData, error: userError },
  ] = await Promise.all([supabase.auth.getClaims(), supabase.auth.getUser()]);

  // Sessão ausente é o caso esperado de "deslogado", tratado no
  // redirect abaixo. Qualquer outro erro não pode ser mascarado como
  // isso, ou uma falha transitória entra em loop com a página pra
  // onde redireciona assim que a falha passa.
  const unexpectedError = [claimsError, userError].find(
    (error) => error && !isAuthSessionMissingError(error),
  );
  if (unexpectedError) {
    throw unexpectedError;
  }

  const claims = claimsData?.claims as AuthenticatedUserClaims | undefined;
  const user = userData.user;

  if (!claims?.sub || !user) {
    redirect("/");
  }

  return {
    claims,
    createdAt: user.created_at ?? null,
    supabase,
    user,
    userId: claims.sub,
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

function getUserCreatedMonth(userCreatedAt: string | null) {
  if (!userCreatedAt) return null;

  const userCreatedDate = toUtcDateValue(userCreatedAt);

  if (!userCreatedDate) return null;

  return userCreatedDate.slice(0, 7);
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

async function assertUserGoal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  goalId: string | null,
) {
  if (!goalId) return;

  const { data, error } = await supabase
    .from("goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate goal: ${error.message}`);
  }

  if (!data) {
    throw new Error("Goal is invalid.");
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
  return getMonthOffsetValue(month, -1);
}

function getMonthOffsetValue(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return toMonthValue(new Date(year, monthNumber - 1 + offset, 1));
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
    if (transaction.advancedToMonth) {
      return includePrevious
        ? transaction.advancedToMonth <= month
        : transaction.advancedToMonth === month;
    }

    const transactionMonth = transaction.date.slice(0, 7);
    return includePrevious
      ? transactionMonth <= month
      : transactionMonth === month;
  });
}

function markPlannedTransactions(transactions: Transaction[]) {
  const today = getTodayValue();

  return transactions.map((transaction) =>
    transaction.date > today || transaction.isCreditCardInvoice
      ? { ...transaction, isPlanned: true }
      : transaction,
  );
}

function resolveTransactionGroup(row: TransactionRow): TransactionGroup {
  return row.kind === "income"
    ? "income"
    : (row.categories?.group_type ?? "wants");
}

function resolveTransactionCategoryName(
  row: TransactionRow,
  rawCategoryName: string,
) {
  return toCategoryLabelKey(
    rawCategoryName,
    row.categories?.is_default ?? false,
  );
}

function resolveTransactionPaymentMethodKey(row: TransactionRow) {
  return row.payment_methods
    ? toPaymentMethodLabelKey(
        row.payment_methods.name,
        row.payment_methods.type,
        null,
      )
    : null;
}

function resolveTransactionIcon(row: TransactionRow, rawCategoryName: string) {
  return row.kind === "income"
    ? groupIcons.income
    : toCategoryIcon(rawCategoryName, row.categories?.icon);
}

function resolveInstallmentNumber(row: TransactionRow) {
  return row.installment_number == null ? null : Number(row.installment_number);
}

function resolveInstallmentTotal(row: TransactionRow) {
  return row.installment_total == null ? null : Number(row.installment_total);
}

function resolveTransactionPaymentMethodClosingDay(row: TransactionRow) {
  return row.payment_methods?.closing_day == null
    ? null
    : Number(row.payment_methods.closing_day);
}

function resolveTransactionPaymentMethodDueDay(row: TransactionRow) {
  return row.payment_methods?.due_day == null
    ? null
    : Number(row.payment_methods.due_day);
}

function resolveSignedAmount(row: TransactionRow, amount: number) {
  return row.kind === "income" ? amount : -amount;
}

function resolveRawCategoryName(row: TransactionRow) {
  return row.categories?.name ?? row.kind;
}

function resolveDescriptionKey(
  description: string | null,
  notes: string | null,
  categoryName: string,
) {
  return description || notes || categoryName;
}

function toTransaction(row: TransactionRow): Transaction {
  const amount = Number(row.amount);
  const group = resolveTransactionGroup(row);
  const signedAmount = resolveSignedAmount(row, amount);
  const rawCategoryName = resolveRawCategoryName(row);
  const categoryName = resolveTransactionCategoryName(row, rawCategoryName);
  const paymentMethodKey = resolveTransactionPaymentMethodKey(row);
  const description = decryptDescription(row.description);
  const notes = decryptField(row.notes);

  return {
    id: row.id,
    advancedAt: row.advanced_at ?? null,
    advancedToMonth: row.advanced_to_month ?? null,
    amount: signedAmount,
    categoryId: row.category_id,
    categoryKey: categoryName,
    date: row.date,
    descriptionKey: resolveDescriptionKey(description, notes, categoryName),
    group,
    icon: resolveTransactionIcon(row, rawCategoryName),
    installmentGroupId: row.installment_group_id ?? null,
    installmentNumber: resolveInstallmentNumber(row),
    installmentTotal: resolveInstallmentTotal(row),
    financingGroupId: row.financing_plan_id ?? null,
    goalId: row.goal_id ?? null,
    savingsFundedAmount: Number(row.savings_funded_amount ?? 0),
    notes,
    paymentMethodId: row.payment_method_id,
    paymentMethodClosingDay: resolveTransactionPaymentMethodClosingDay(row),
    paymentMethodDueDay: resolveTransactionPaymentMethodDueDay(row),
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

function getPaymentsDueStatus(dateValue: string, today: string) {
  if (dateValue <= today) return "planned" as const;

  const threshold = new Date(`${today}T00:00:00.000Z`);
  threshold.setDate(threshold.getDate() + 3);
  const thresholdValue = threshold.toISOString().slice(0, 10);

  if (dateValue <= thresholdValue) return "next" as const;
  return "planned" as const;
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
  const excessExpenses = Math.max(expenses - income, 0);

  return {
    excessExpenses,
    expenses,
    grossSavings,
    income,
    savings: grossSavings - excessExpenses,
  };
}

function getSafeReportPeriod(periodMonths?: number) {
  if (!periodMonths || Number.isNaN(periodMonths)) return 6;
  return Math.min(Math.max(Math.trunc(periodMonths), 1), 12);
}

async function listCategories(options?: {
  userContext?: Awaited<ReturnType<typeof getUserContext>>;
}) {
  /* c8 ignore start */
  const ctx = options?.userContext ?? (await getUserContext());
  const { supabase, userId } = ctx;
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, group_type, is_default, monthly_limit")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  /* c8 ignore stop */

  if (error) {
    throw new Error(`Unable to load categories: ${error.message}`);
  }

  return (data ?? []) as CategoryRow[];
}

export async function listCategoryOverview(
  month?: string,
  userContext?: Awaited<ReturnType<typeof getUserContext>>,
): Promise<CategoryOverviewItem[]> {
  const ctx = userContext ?? (await getUserContext());
  const categories = await listCategories({ userContext: ctx });
  const transactions = await listTransactions({ month, userContext: ctx });

  return categories
    .filter(
      (category): category is CategoryRow & { group_type: DbCategoryGroup } =>
        category.group_type !== "income",
    )
    .map((category) => {
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

async function listPaymentMethods(options?: {
  userContext?: Awaited<ReturnType<typeof getUserContext>>;
}) {
  /* c8 ignore start */
  const ctx = options?.userContext ?? (await getUserContext());
  const { supabase, userId } = ctx;
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, type, credit_limit, due_day, closing_day")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  /* c8 ignore stop */

  if (error) {
    throw new Error(`Unable to load payment methods: ${error.message}`);
  }

  return (data ?? []) as PaymentMethodRow[];
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

type PaymentMethodOverviewContext = {
  selectedMonth: string;
  today: string;
  transactions: Transaction[];
  registeredTransactions: Transaction[];
};

function buildPaymentMethodOverviewItem(
  paymentMethod: Awaited<ReturnType<typeof listPaymentMethods>>[number],
  context: PaymentMethodOverviewContext,
): PaymentMethodOverviewItem {
  const closingDay =
    paymentMethod.closing_day == null
      ? null
      : Number(paymentMethod.closing_day);
  const dueDay =
    paymentMethod.due_day == null ? null : Number(paymentMethod.due_day);

  const label = toPaymentMethodLabelKey(
    paymentMethod.name,
    paymentMethod.type,
    null,
  );
  const detail = getPaymentMethodDetail({
    paymentMethod: {
      closingDay,
      dueDay,
      id: paymentMethod.id,
      label,
      name: paymentMethod.name,
      type: paymentMethod.type,
    },
    selectedMonth: context.selectedMonth,
    today: context.today,
    transactions:
      paymentMethod.type === "credit"
        ? context.registeredTransactions
        : context.transactions,
  });

  return {
    canModify: !isProtectedPaymentMethod(paymentMethod),
    closingDay,
    creditLimit: Number(paymentMethod.credit_limit ?? 0),
    detail,
    dueDay,
    id: paymentMethod.id,
    isDefault: false,
    label,
    name: paymentMethod.name,
    spent: detail.totalAmount,
    type: paymentMethod.type,
  };
}

export async function listPaymentMethodOverview(
  month?: string,
  userContext?: Awaited<ReturnType<typeof getUserContext>>,
): Promise<PaymentMethodOverviewItem[]> {
  const selectedMonth = normalizeMonthValue(month);
  const ctx = userContext ?? (await getUserContext());
  const today = getTodayValue();
  const [paymentMethods, transactions, registeredTransactions] =
    await Promise.all([
      listPaymentMethods({ userContext: ctx }),
      listTransactions({ month: selectedMonth, userContext: ctx }),
      listTransactions({ includeFuture: true, userContext: ctx }),
    ]);

  return paymentMethods.map((paymentMethod) =>
    buildPaymentMethodOverviewItem(paymentMethod, {
      selectedMonth,
      today,
      transactions,
      registeredTransactions,
    }),
  );
}

export async function listSubscriptionOverview(): Promise<
  SubscriptionOverviewItem[]
> {
  const transactions = await listTransactions({
    includeFuture: true,
    includePausedSubscriptions: true,
  });

  return buildSubscriptionOverview(transactions, getTodayValue());
}

function buildPaymentInvoices(
  plannedTransactions: Transaction[],
  today: string,
): PaymentInvoiceItem[] {
  return plannedTransactions
    .filter((transaction) => transaction.isCreditCardInvoice)
    .map((transaction) => {
      const invoice = transaction.invoice as CreditCardInvoiceDetails;

      return {
        amount: Math.abs(transaction.amount),
        dueDate: invoice.dueDate,
        id: transaction.id,
        invoice,
        paidAmount: invoice.paidAmount,
        paymentMethodKey: invoice.paymentMethodKey,
        purchaseCount: invoice.purchases.length,
        status: getPaymentsDueStatus(invoice.dueDate, today),
        totalAmount: invoice.totalAmount,
      };
    })
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

type GroupedSubscription = SubscriptionOverviewItem & {
  isCreditCardInvoicePurchase: boolean;
};

function groupSubscriptionTransactions(
  plannedTransactions: Transaction[],
  monthRange: { start: string; end: string },
): Map<string, GroupedSubscription> {
  const subscriptionTransactions = plannedTransactions
    .filter((transaction) => transaction.notes?.startsWith("subscription"))
    .filter(
      (transaction) =>
        transaction.date >= monthRange.start &&
        transaction.date <= monthRange.end,
    )
    .sort((left, right) => left.date.localeCompare(right.date));
  const groupedSubscriptions = new Map<string, GroupedSubscription>();

  for (const transaction of subscriptionTransactions) {
    const groupKey = [
      transaction.descriptionKey,
      transaction.categoryId ?? transaction.categoryKey,
      transaction.paymentMethodId ?? transaction.paymentMethodKey ?? "",
    ].join("|");
    const existingSubscription = groupedSubscriptions.get(groupKey);

    if (!existingSubscription) {
      groupedSubscriptions.set(groupKey, {
        amount: Math.abs(transaction.amount),
        categoryId: transaction.categoryId,
        categoryKey: transaction.categoryKey,
        frequency: "monthly",
        icon: transaction.icon,
        id: transaction.id,
        isCreditCardInvoicePurchase: Boolean(
          transaction.isCreditCardInvoicePurchase,
        ),
        name: transaction.descriptionKey,
        nextDate: transaction.date,
        paymentMethodId: transaction.paymentMethodId,
        paymentMethodKey: transaction.paymentMethodKey,
        status: transaction.notes?.includes("paused") ? "paused" : "active",
      });
      continue;
    }

    /* c8 ignore start */
    if (transaction.date < existingSubscription.nextDate) {
      existingSubscription.nextDate = transaction.date;
      existingSubscription.isCreditCardInvoicePurchase = Boolean(
        transaction.isCreditCardInvoicePurchase,
      );
    }
    /* c8 ignore stop */
  }

  return groupedSubscriptions;
}

function buildPaymentBills(
  plannedTransactions: Transaction[],
  today: string,
): PaymentBillItem[] {
  return plannedTransactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        !transaction.isCreditCardInvoice &&
        !getInvoiceAdvancePaymentInvoiceId(transaction) &&
        !transaction.notes?.startsWith("subscription") &&
        (transaction.paymentMethodType === "boleto" ||
          transaction.paymentMethodType === "bank"),
    )
    .map((transaction) => ({
      amount: Math.abs(transaction.amount),
      categoryKey: transaction.categoryKey,
      date: transaction.date,
      descriptionKey: transaction.descriptionKey,
      id: transaction.id,
      /* c8 ignore next */
      paymentMethodKey: transaction.paymentMethodKey ?? null,
      status: getPaymentsDueStatus(transaction.date, today),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildPaymentsDueSummary({
  invoices,
  groupedSubscriptions,
  filteredSubscriptions,
  bills,
}: {
  invoices: PaymentInvoiceItem[];
  groupedSubscriptions: Map<string, GroupedSubscription>;
  filteredSubscriptions: SubscriptionOverviewItem[];
  bills: PaymentBillItem[];
}): PaymentsDueData["summary"] {
  const totalInvoices = invoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );
  const totalSubscriptions = [...groupedSubscriptions.values()]
    .filter((subscription) => !subscription.isCreditCardInvoicePurchase)
    .reduce((sum, subscription) => sum + subscription.amount, 0);
  const totalBills = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalDue = totalInvoices + totalSubscriptions + totalBills;
  const nextDueDate =
    [
      ...invoices.map((invoice) => invoice.dueDate),
      ...filteredSubscriptions.map((subscription) => subscription.nextDate),
      ...bills.map((bill) => bill.date),
    ]
      .sort((left, right) => left.localeCompare(right))
      .at(0) ?? null;

  return {
    nextDueDate,
    totalBills,
    totalDue,
    totalInvoices,
    totalSubscriptions,
  };
}

export async function getPaymentsDueData(
  month?: string,
  userContext?: Awaited<ReturnType<typeof getUserContext>>,
): Promise<PaymentsDueData> {
  const selectedMonth = normalizeMonthValue(month);
  const monthRange = getMonthRange(selectedMonth);
  const ctx = userContext ?? (await getUserContext());
  const plannedTransactions = await listTransactions({
    includeCreditCardInvoices: true,
    includeFuture: true,
    month: selectedMonth,
    preserveCreditCardInvoicePurchases: true,
    useFinancialMonth: false,
    userContext: ctx,
  });
  const today = getTodayValue();

  const invoices = buildPaymentInvoices(plannedTransactions, today);
  const groupedSubscriptions = groupSubscriptionTransactions(
    plannedTransactions,
    monthRange,
  );
  const filteredSubscriptions: SubscriptionOverviewItem[] = [
    ...groupedSubscriptions.values(),
  ];
  const bills = buildPaymentBills(plannedTransactions, today);
  const summary = buildPaymentsDueSummary({
    invoices,
    groupedSubscriptions,
    filteredSubscriptions,
    bills,
  });

  return {
    bills,
    invoices,
    subscriptions: filteredSubscriptions,
    summary,
  };
}

// Expenses linked to a goal count once their date is reached, so editing or
// deleting the transaction is reflected without touching goals.current_amount.
async function sumLinkedGoalPayments(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("goal_id, amount, principal_portion")
    .eq("user_id", userId)
    .not("goal_id", "is", null)
    .lte("date", getTodayValue());

  if (error) {
    throw new Error(`Unable to load goal payments: ${error.message}`);
  }

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as {
    goal_id: string;
    amount: number | string;
    principal_portion: number | string | null;
  }[]) {
    // A financed installment only moves its principal; interest is the bank's.
    const paid = Number(row.principal_portion ?? row.amount);
    totals.set(row.goal_id, (totals.get(row.goal_id) ?? 0) + paid);
  }
  return totals;
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

  const goals = (data ?? []) as GoalRow[];
  const linked = goals.length
    ? await sumLinkedGoalPayments(supabase, userId)
    : new Map<string, number>();

  return goals.map((goal) => ({
    color: goal.color,
    currentAmount: Math.min(
      toCents(Number(goal.current_amount) + (linked.get(goal.id) ?? 0)),
      Number(goal.target_amount),
    ),
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
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, type, credit_limit, due_day, closing_day")
    .eq("id", paymentMethodId)
    .eq("user_id", userId)
    .maybeSingle();

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

function mapTransactionFormCategories(
  categories: Awaited<ReturnType<typeof listCategories>>,
): TransactionFormCategory[] {
  const mappedCategories = categories.map((category) => ({
    group: category.group_type,
    id: category.id,
    icon: toCategoryIcon(category.name, category.icon),
    label: toCategoryLabelKey(category.name, category.is_default),
    monthlyLimit: Number(category.monthly_limit ?? 0),
  }));

  return mappedCategories.length > 0
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
}

function mapTransactionFormPaymentMethods(
  paymentMethods: Awaited<ReturnType<typeof listPaymentMethods>>,
): TransactionFormPaymentMethod[] {
  const mappedPaymentMethods = paymentMethods.map((paymentMethod) => ({
    dueDay:
      paymentMethod.due_day == null ? null : Number(paymentMethod.due_day),
    id: paymentMethod.id,
    label: toPaymentMethodLabelKey(
      paymentMethod.name,
      paymentMethod.type,
      null,
    ),
    type: paymentMethod.type,
  }));

  return mappedPaymentMethods.length > 0
    ? mappedPaymentMethods
    : [
        {
          id: "none",
          label: "none",
          type: "cash",
        },
      ];
}

export async function getTransactionFormOptions(options?: {
  userContext?: Awaited<ReturnType<typeof getUserContext>>;
}): Promise<TransactionFormOptions> {
  const ctx = options?.userContext ?? (await getUserContext());
  const [categories, paymentMethods] = await Promise.all([
    listCategories({ userContext: ctx }),
    listPaymentMethods({ userContext: ctx }),
  ]);

  return {
    categories: mapTransactionFormCategories(categories),
    paymentMethods: mapTransactionFormPaymentMethods(paymentMethods),
  };
}

function resolveNewTransactionKind(
  type: NewTransactionInput["type"],
): DbTransactionKind {
  if (type !== "income" && type !== "expense" && type !== "saving") {
    throw new Error("Transaction type is invalid.");
  }
  return type;
}

function assertValidInstallmentCount(installmentCount: number) {
  if (
    !Number.isInteger(installmentCount) ||
    installmentCount < 1 ||
    installmentCount > 120
  ) {
    throw new Error("Installment count is invalid.");
  }
}

type ResolvedNewTransactionInput = {
  description: string;
  amount: number;
  kind: DbTransactionKind;
  categoryId: string | null;
  paymentMethodId: string | null;
  date: string;
  installmentCount: number;
  goalId: string | null;
};

function resolveNewTransactionInput(
  input: NewTransactionInput,
): ResolvedNewTransactionInput {
  const description = assertNonEmptyString(input.description, "Description");
  const amount = Math.abs(input.amount);
  assertPositiveFiniteAmount(amount, "Amount");
  const kind = resolveNewTransactionKind(input.type);
  const categoryId =
    kind === "income" ? null : normalizeNullableId(input.category, "Category");
  const paymentMethodId = normalizeNullableId(
    input.paymentMethod,
    "Payment method",
  );
  const date = toIsoDate(input.date);
  const installmentCount = Number(input.installmentCount);
  assertValidIsoDate(date);
  const goalId = input.goalId ?? null;

  if (goalId) {
    assertUuid(goalId, "Goal");
    if (kind !== "expense" || input.financing?.operationType === "loan") {
      throw new Error("Only expenses can be linked to a goal.");
    }
  }

  return {
    description,
    amount,
    kind,
    categoryId,
    paymentMethodId,
    date,
    installmentCount,
    goalId,
  };
}

type InstallmentPlan = {
  isInstallmentPurchase: boolean;
  occurrenceCount: number;
  installmentGroupId: string | null;
  installmentAmount: number;
  installmentRemainder: number;
};

function computeInstallmentPlan(
  kind: DbTransactionKind,
  amount: number,
  installmentCount: number,
): InstallmentPlan {
  const isInstallmentPurchase = kind === "expense" && installmentCount > 1;
  const occurrenceCount = isInstallmentPurchase ? installmentCount : 1;
  const installmentGroupId = isInstallmentPurchase ? crypto.randomUUID() : null;
  const installmentAmount = isInstallmentPurchase
    ? Number((amount / installmentCount).toFixed(2))
    : amount;
  const totalRoundedInstallments = Number(
    (installmentAmount * occurrenceCount).toFixed(2),
  );
  const installmentRemainder = Number(
    (amount - totalRoundedInstallments).toFixed(2),
  );

  return {
    isInstallmentPurchase,
    occurrenceCount,
    installmentGroupId,
    installmentAmount,
    installmentRemainder,
  };
}

type InstallmentRowContext = {
  resolved: ResolvedNewTransactionInput;
  plan: InstallmentPlan;
  notes: string | null;
  userId: string;
  baseDate: Date;
};

function formatOccurrenceDate(baseDate: Date, index: number) {
  const occurrenceDate = addMonthsClamped(baseDate, index);
  return [
    occurrenceDate.getFullYear(),
    String(occurrenceDate.getMonth() + 1).padStart(2, "0"),
    String(occurrenceDate.getDate()).padStart(2, "0"),
  ].join("-");
}

function resolveOccurrenceInstallmentMetadata(
  index: number,
  plan: InstallmentPlan,
  installmentCount: number,
) {
  return plan.isInstallmentPurchase && plan.installmentGroupId
    ? createInstallmentMetadata({
        groupId: plan.installmentGroupId,
        installmentNumber: index + 1,
        installmentTotal: installmentCount,
      })
    : null;
}

function resolveOccurrenceNotes(
  installmentMetadata: ReturnType<typeof createInstallmentMetadata> | null,
  notes: string | null,
) {
  const scheduleNote = installmentMetadata
    ? `${installmentMetadata.installmentNumber}/${installmentMetadata.installmentTotal}`
    : null;
  return [scheduleNote, notes].filter(Boolean).join(" - ") || null;
}

function resolveOccurrenceAmount(index: number, plan: InstallmentPlan) {
  return index === plan.occurrenceCount - 1
    ? Number((plan.installmentAmount + plan.installmentRemainder).toFixed(2))
    : plan.installmentAmount;
}

function resolveOccurrenceDescription({
  description,
  installmentMetadata,
  index,
  installmentCount,
}: {
  description: string;
  installmentMetadata: ReturnType<typeof createInstallmentMetadata> | null;
  index: number;
  installmentCount: number;
}) {
  return installmentMetadata
    ? `${description} (${index + 1}/${installmentCount})`
    : description;
}

function buildInstallmentRow(index: number, context: InstallmentRowContext) {
  const { resolved, plan, notes, userId, baseDate } = context;
  const { description, categoryId, kind, paymentMethodId, installmentCount } =
    resolved;
  const installmentMetadata = resolveOccurrenceInstallmentMetadata(
    index,
    plan,
    installmentCount,
  );

  return {
    amount: resolveOccurrenceAmount(index, plan),
    category_id: categoryId,
    date: formatOccurrenceDate(baseDate, index),
    description: encryptDescription(
      resolveOccurrenceDescription({
        description,
        installmentMetadata,
        index,
        installmentCount,
      }),
    ),
    installment_group_id: installmentMetadata?.installmentGroupId ?? null,
    installment_number: installmentMetadata?.installmentNumber ?? null,
    installment_total: installmentMetadata?.installmentTotal ?? null,
    kind,
    notes: encryptField(resolveOccurrenceNotes(installmentMetadata, notes)),
    payment_method_id: paymentMethodId,
    user_id: userId,
    ...(resolved.goalId ? { goal_id: resolved.goalId } : {}),
  };
}

function buildInstallmentTransactionRows({
  resolved,
  plan,
  notes,
  userId,
}: Omit<InstallmentRowContext, "baseDate">) {
  const [year, month, day] = resolved.date.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  const context: InstallmentRowContext = {
    resolved,
    plan,
    notes,
    userId,
    baseDate,
  };

  return Array.from({ length: plan.occurrenceCount }, (_, index) =>
    buildInstallmentRow(index, context),
  );
}

function filterRowsByUserCreatedMonth<T extends { date: string }>(
  rows: T[],
  userCreatedMonth: string | null,
): T[] {
  return userCreatedMonth
    ? rows.filter((row) => row.date.slice(0, 7) >= userCreatedMonth)
    : rows;
}

async function insertTransactionRows(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) {
    throw new Error(
      "Transaction date cannot be earlier than the user creation month.",
    );
  }

  const { error } = await supabase.from("transactions").insert(rows);

  if (error) {
    throw new Error(`Unable to save transaction: ${error.message}`);
  }
}

function resolveSavingsFundedAmount(value: number | undefined) {
  if (value == null) return 0;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Savings funded amount is invalid.");
  }
  return toCents(value);
}

async function assertNonSavingsCategory(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string | null,
) {
  if (!categoryId) return;

  const { data, error } = await supabase
    .from("categories")
    .select("group_type")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate category: ${error.message}`);
  }

  if (data?.group_type === "savings") {
    throw new Error(
      "Savings categories cannot be financed or funded from savings.",
    );
  }
}

async function assertSavingsFundingOrFinancingAllowed(
  ctx: AuthenticatedUserContext,
  resolved: ResolvedNewTransactionInput,
  funding: { amount: number; released: number },
) {
  if (resolved.kind !== "expense") {
    throw new Error(
      "Savings funding and financing are only available for expenses.",
    );
  }

  await assertNonSavingsCategory(ctx.supabase, ctx.userId, resolved.categoryId);

  if (funding.amount === 0) return;

  const totalSaved = await getSavingsAvailableToFund(ctx);

  if (funding.amount > toCents(totalSaved + funding.released)) {
    throw new Error("Savings funded amount exceeds the saved total.");
  }
}

function applySavingsFunding<T extends { amount: number }>(
  rows: T[],
  savingsFundedAmount: number,
): (T | (T & { savings_funded_amount: number }))[] {
  // ponytail: no savings → untouched rows, so legacy payloads stay identical.
  if (savingsFundedAmount === 0 || rows.length === 0) return rows;

  return applySavingsFundingToAll(rows, savingsFundedAmount);
}

type FinancedRowsContext = {
  resolved: ResolvedNewTransactionInput;
  notes: string | null;
  userId: string;
  planId: string;
  financing: TransactionFinancingInput;
  schedule: FinancingSchedule;
};

function buildFinancedRowBase({ resolved, userId, planId }: FinancedRowsContext) {
  return {
    category_id: resolved.categoryId,
    financing_plan_id: planId,
    payment_method_id: resolved.paymentMethodId,
    user_id: userId,
    ...(resolved.goalId ? { goal_id: resolved.goalId } : {}),
  };
}

// Down payment and loan income: one row on the operation date, outside the
// installment numbering (see transactions_installment_fields_consistent).
function buildFinancedPlainRow(
  context: FinancedRowsContext,
  amount: number,
  kind: DbTransactionKind,
) {
  return {
    ...buildFinancedRowBase(context),
    amount,
    date: context.resolved.date,
    description: encryptDescription(context.resolved.description),
    installment_group_id: null,
    installment_number: null,
    installment_total: null,
    kind,
    notes: encryptField(context.notes),
  };
}

function buildFinancedInstallmentRows(context: FinancedRowsContext) {
  const { resolved, notes, planId, financing, schedule } = context;
  const [year, month, day] = resolved.date.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  // A loan or a purchase with a down payment starts paying next month;
  // otherwise the first installment falls on the purchase date, as today.
  const firstOffset =
    financing.operationType === "loan" || schedule.totals.downPayment > 0
      ? 1
      : 0;
  const count = schedule.rows.length;

  return schedule.rows.map((row, index) => {
    const metadata = createInstallmentMetadata({
      groupId: planId,
      installmentNumber: row.number,
      installmentTotal: count,
    });
    return {
      ...buildFinancedRowBase(context),
      amount: row.payment,
      date: formatOccurrenceDate(baseDate, index + firstOffset),
      description: encryptDescription(
        `${resolved.description} (${row.number}/${count})`,
      ),
      installment_group_id: planId,
      installment_number: row.number,
      installment_total: count,
      interest_portion: row.interest,
      kind: "expense" as DbTransactionKind,
      notes: encryptField(resolveOccurrenceNotes(metadata, notes)),
      principal_portion: row.principal,
    };
  });
}

function buildFinancedTransactionRows(context: FinancedRowsContext) {
  const downPayment = context.schedule.totals.downPayment;
  const downPaymentRows =
    downPayment > 0
      ? [
          {
            ...buildFinancedPlainRow(context, downPayment, "expense"),
            principal_portion: downPayment,
            interest_portion: 0,
          },
        ]
      : [];
  const incomeRows =
    context.financing.operationType === "loan"
      ? [
          {
            ...buildFinancedPlainRow(context, context.resolved.amount, "income"),
            category_id: null,
            principal_portion: null,
            interest_portion: null,
            savings_funded_amount: 0,
          },
        ]
      : [];

  return {
    expenseRows: [...downPaymentRows, ...buildFinancedInstallmentRows(context)],
    incomeRows,
  };
}

async function insertFinancingPlan({
  ctx,
  resolved,
  financing,
  planId,
  resolution,
  savingsFundedAmount,
}: {
  ctx: AuthenticatedUserContext;
  resolved: ResolvedNewTransactionInput;
  financing: TransactionFinancingInput;
  planId: string;
  resolution: ReturnType<typeof resolveFinancingSchedule>;
  savingsFundedAmount: number;
}) {
  const isInstallmentMode = financing.rateInputMode === "installment";
  const { error } = await ctx.supabase.from("financing_plans").insert({
    id: planId,
    user_id: ctx.userId,
    operation_type: financing.operationType,
    interest_system: resolution.system,
    rate_input_mode: financing.rateInputMode,
    // Installment mode stores the solved rate, always per month.
    rate: isInstallmentMode
      ? Number((resolution.monthlyRate * 100).toFixed(6))
      : Number(financing.rate),
    rate_period: isInstallmentMode ? "monthly" : financing.ratePeriod,
    principal: resolved.amount,
    down_payment: resolution.schedule.totals.downPayment,
    fees: financing.fees,
    installment_count: resolved.installmentCount,
    savings_funded_amount: savingsFundedAmount,
  });

  if (error) {
    throw new Error(`Unable to save financing plan: ${error.message}`);
  }
}

type FinancedTransactionInput = {
  ctx: AuthenticatedUserContext;
  resolved: ResolvedNewTransactionInput;
  notes: string | null;
  financing: TransactionFinancingInput;
  savingsFundedAmount: number;
};

async function createFinancedTransaction(input: FinancedTransactionInput) {
  const { ctx, resolved, notes, financing, savingsFundedAmount } = input;
  const resolution = resolveFinancingSchedule({
    principal: resolved.amount,
    installmentCount: resolved.installmentCount,
    financing,
  });
  const planId = crypto.randomUUID();
  const { expenseRows, incomeRows } = buildFinancedTransactionRows({
    resolved,
    notes,
    userId: ctx.userId,
    planId,
    financing,
    schedule: resolution.schedule,
  });
  // Validates the split before anything is written.
  const rows = [
    ...applySavingsFundingToAll(expenseRows, savingsFundedAmount),
    ...incomeRows,
  ];

  await insertFinancingPlan({
    ctx,
    resolved,
    financing,
    planId,
    resolution,
    savingsFundedAmount,
  });

  const { error } = await ctx.supabase.from("transactions").insert(rows);

  if (error) {
    // Compensation: supabase-js has no multi-statement transaction here.
    await ctx.supabase
      .from("financing_plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", ctx.userId);
    throw new Error(`Unable to save transaction: ${error.message}`);
  }
}

function applySavingsFundingToAll<T extends { amount: number }>(
  rows: T[],
  savingsFundedAmount: number,
) {
  const slices = allocateSavingsFunding(
    rows.map((row) => row.amount),
    savingsFundedAmount,
  );
  return rows.map((row, index) => ({
    ...row,
    savings_funded_amount: slices[index],
  }));
}

async function createPlainTransaction({
  ctx,
  resolved,
  notes,
  savingsFundedAmount,
}: Omit<FinancedTransactionInput, "financing">) {
  const plan = computeInstallmentPlan(
    resolved.kind,
    resolved.amount,
    resolved.installmentCount,
  );
  const rows = buildInstallmentTransactionRows({
    resolved,
    plan,
    notes,
    userId: ctx.userId,
  });
  const filteredRows = filterRowsByUserCreatedMonth(
    rows,
    getUserCreatedMonth(ctx.createdAt),
  );

  await insertTransactionRows(
    ctx.supabase,
    applySavingsFunding(filteredRows, savingsFundedAmount),
  );
}

// releasedSavings: savings held by rows a replacement is about to delete.
export async function createTransaction(
  input: NewTransactionInput,
  releasedSavings = 0,
) {
  const ctx = await getUserContext();
  const resolved = resolveNewTransactionInput(input);
  await Promise.all([
    assertUserCategory(ctx.supabase, ctx.userId, resolved.categoryId),
    assertUserPaymentMethod(ctx.supabase, ctx.userId, resolved.paymentMethodId),
    assertUserGoal(ctx.supabase, ctx.userId, resolved.goalId),
  ]);
  assertValidInstallmentCount(resolved.installmentCount);
  const savingsFundedAmount = resolveSavingsFundedAmount(
    input.savingsFundedAmount,
  );

  if (input.financing || savingsFundedAmount > 0) {
    await assertSavingsFundingOrFinancingAllowed(ctx, resolved, {
      amount: savingsFundedAmount,
      released: releasedSavings,
    });
  }

  const notes = normalizeOptionalString(input.notes);

  if (!input.financing) {
    await createPlainTransaction({ ctx, resolved, notes, savingsFundedAmount });
    return;
  }

  assertDateNotBeforeUserCreated(resolved.date, ctx.createdAt);
  await createFinancedTransaction({
    ctx,
    resolved,
    notes,
    financing: input.financing,
    savingsFundedAmount,
  });
}

function parseCreditCardInvoiceId(invoiceId: string) {
  const match =
    /^credit-card-invoice:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):(\d{4}-\d{2})$/i.exec(
      invoiceId,
    );

  if (!match) {
    throw new Error("Invoice is invalid.");
  }

  return {
    month: match[2],
    paymentMethodId: match[1],
  };
}

function resolveInvoiceAdvancePaymentInput(
  input: CreateInvoiceAdvancePaymentInput,
  createdAt: string | null,
) {
  const amount = Math.abs(input.amount);
  assertPositiveFiniteAmount(amount, "Amount");

  const date = toIsoDate(input.date);
  assertValidIsoDate(date);
  assertDateNotBeforeUserCreated(date, createdAt);

  const { month, paymentMethodId: invoicePaymentMethodId } =
    parseCreditCardInvoiceId(input.invoiceId);
  const paymentMethodId = normalizeNullableId(
    input.paymentMethod,
    "Payment method",
  );

  return { amount, date, month, invoicePaymentMethodId, paymentMethodId };
}

async function assertValidInvoicePaymentMethod({
  supabase,
  userId,
  invoicePaymentMethodId,
  paymentMethodId,
}: {
  supabase: SupabaseClient;
  userId: string;
  invoicePaymentMethodId: string | null;
  paymentMethodId: string | null;
}) {
  const [{ data: invoicePaymentMethod, error: invoicePaymentMethodError }] =
    await Promise.all([
      supabase
        .from("payment_methods")
        .select("id, type")
        .eq("id", invoicePaymentMethodId)
        .eq("user_id", userId)
        .maybeSingle(),
      assertUserPaymentMethod(supabase, userId, paymentMethodId),
    ]);

  if (invoicePaymentMethodError) {
    throw new Error(
      `Unable to validate invoice: ${invoicePaymentMethodError.message}`,
    );
  }

  if (invoicePaymentMethod?.type !== "credit") {
    throw new Error("Invoice is invalid.");
  }
}

async function findAdvanceableInvoice({
  ctx,
  month,
  invoiceId,
  amount,
}: {
  ctx: Awaited<ReturnType<typeof getUserContext>>;
  month: string;
  invoiceId: string;
  amount: number;
}) {
  const invoices = await listTransactions({
    includeCreditCardInvoices: true,
    includeFuture: true,
    month,
    useFinancialMonth: false,
    userContext: ctx,
  });
  const invoice = invoices.find(
    (transaction) =>
      transaction.isCreditCardInvoice && transaction.id === invoiceId,
  );

  if (!invoice) {
    throw new Error("Invoice is already paid or unavailable.");
  }

  if (amount > Math.abs(invoice.amount)) {
    throw new Error("Advance payment cannot exceed the remaining invoice.");
  }

  return invoice;
}

export async function createInvoiceAdvancePayment(
  input: CreateInvoiceAdvancePaymentInput,
) {
  const ctx = await getUserContext();
  const { createdAt, supabase, userId } = ctx;
  const { amount, date, month, invoicePaymentMethodId, paymentMethodId } =
    resolveInvoiceAdvancePaymentInput(input, createdAt);

  await assertValidInvoicePaymentMethod({
    supabase,
    userId,
    invoicePaymentMethodId,
    paymentMethodId,
  });
  await findAdvanceableInvoice({
    ctx,
    month,
    invoiceId: input.invoiceId,
    amount,
  });

  const { error } = await supabase.from("transactions").insert({
    amount,
    category_id: null,
    date,
    description: encryptDescription("transaction.invoiceAdvancePayment"),
    kind: "expense" satisfies DbTransactionKind,
    notes: encryptField(getInvoiceAdvancePaymentNote(input.invoiceId)),
    payment_method_id: paymentMethodId,
    user_id: userId,
  });

  if (error) {
    throw new Error(`Unable to save invoice advance payment: ${error.message}`);
  }
}

function buildSubscriptionRows({
  date,
  amount,
  categoryId,
  description,
  paymentMethodId,
  userId,
}: {
  date: string;
  amount: number;
  categoryId: string | null;
  description: string;
  paymentMethodId: string | null;
  userId: string;
}) {
  const [year, month, day] = date.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  const encryptedDescription = encryptDescription(description);

  return Array.from({ length: 12 }, (_, index) => {
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
      description: encryptedDescription,
      kind: "expense" as DbTransactionKind,
      notes: encryptField(`subscription ${index + 1}/12`),
      payment_method_id: paymentMethodId,
      user_id: userId,
    };
  });
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

  const rows = buildSubscriptionRows({
    date,
    amount,
    categoryId,
    description,
    paymentMethodId,
    userId,
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

async function loadSubscriptionReference(
  supabase: SupabaseClient,
  userId: string,
  subscriptionId: string,
) {
  const { data: reference, error: referenceError } = await supabase
    .from("transactions")
    .select("id, description, category_id, payment_method_id, notes")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (referenceError) {
    throw new Error(`Unable to load subscription: ${referenceError.message}`);
  }

  const subscription = reference as SubscriptionReferenceRow | null;

  if (!subscription) {
    throw new Error("Subscription is invalid.");
  }

  const decryptedNotes = decryptField(subscription.notes);

  if (!decryptedNotes?.startsWith("subscription")) {
    throw new Error("Subscription is invalid.");
  }

  return subscription;
}

async function queryFutureSubscriptionOccurrences(
  supabase: SupabaseClient,
  userId: string,
  subscription: SubscriptionReferenceRow,
) {
  let query = supabase
    .from("transactions")
    .select("id, date, notes")
    .eq("user_id", userId)
    .eq("description", subscription.description)
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

  const rows = (data ?? []) as Array<
    SubscriptionOccurrenceRow & { notes: string | null }
  >;
  const occurrences: SubscriptionOccurrenceRow[] = rows
    .filter((row) => decryptField(row.notes)?.startsWith("subscription"))
    .map(({ id, date }) => ({ id, date }));

  if (!occurrences.length) {
    throw new Error("No future subscription charges found.");
  }

  return occurrences;
}

async function getSubscriptionOccurrences(subscriptionId: string) {
  assertUuid(subscriptionId, "Subscription");
  const { supabase, userId } = await getUserContext();
  const subscription = await loadSubscriptionReference(
    supabase,
    userId,
    subscriptionId,
  );
  const occurrences = await queryFutureSubscriptionOccurrences(
    supabase,
    userId,
    subscription,
  );

  return { occurrences, subscription, supabase, userId };
}

function resolveUpdateSubscriptionInput(
  input: UpdateSubscriptionInput,
  createdAt: string | null,
) {
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

  return { description, amount, categoryId, paymentMethodId, date };
}

async function relabelSubscriptionOccurrences(
  supabase: SupabaseClient,
  userId: string,
  occurrences: SubscriptionOccurrenceRow[],
) {
  const occurrenceIds = occurrences.map((occurrence) => occurrence.id);
  const { error } = await supabase
    .from("transactions")
    .update({ notes: encryptField(`subscription ${occurrences.length}/12`) })
    .in("id", occurrenceIds)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to update subscription: ${error.message}`);
  }
}

async function applySubscriptionOccurrenceUpdates({
  supabase,
  userId,
  occurrences,
  baseDate,
  fields,
}: {
  supabase: SupabaseClient;
  userId: string;
  occurrences: SubscriptionOccurrenceRow[];
  baseDate: Date;
  fields: {
    amount: number;
    categoryId: string | null;
    description: string;
    paymentMethodId: string | null;
  };
}) {
  const encryptedDescription = encryptDescription(fields.description);
  const results = await Promise.all(
    occurrences.map((occurrence, index) =>
      supabase
        .from("transactions")
        .update({
          amount: fields.amount,
          category_id: fields.categoryId,
          date: toDateValue(addMonthsClamped(baseDate, index)),
          description: encryptedDescription,
          payment_method_id: fields.paymentMethodId,
        })
        .eq("id", occurrence.id)
        .eq("user_id", userId),
    ),
  );
  const error = results.find((result) => result.error)?.error;

  if (error) {
    throw new Error(`Unable to update subscription: ${error.message}`);
  }
}

export async function updateSubscription(input: UpdateSubscriptionInput) {
  const { createdAt } = await getUserContext();
  const { description, amount, categoryId, paymentMethodId, date } =
    resolveUpdateSubscriptionInput(input, createdAt);
  const { occurrences, supabase, userId } = await getSubscriptionOccurrences(
    input.id,
  );

  await Promise.all([
    assertUserCategory(supabase, userId, categoryId),
    assertUserPaymentMethod(supabase, userId, paymentMethodId),
  ]);

  const [year, month, day] = date.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  await relabelSubscriptionOccurrences(supabase, userId, occurrences);
  await applySubscriptionOccurrenceUpdates({
    supabase,
    userId,
    occurrences,
    baseDate,
    fields: { amount, categoryId, description, paymentMethodId },
  });
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
        notes: encryptField(
          paused
            ? `subscription paused ${index + 1}/12`
            : `subscription ${index + 1}/12`,
        ),
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

  if (error) {
    throw new Error(`Unable to save payment method: ${error.message}`);
  }
}

function resolveUpdatePaymentMethodInput(input: UpdatePaymentMethodInput) {
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

  return { name, creditLimit, dueDay, closingDay, type: input.type };
}

export async function updatePaymentMethod(input: UpdatePaymentMethodInput) {
  assertUuid(input.id, "Payment method");
  const { name, creditLimit, dueDay, closingDay, type } =
    resolveUpdatePaymentMethodInput(input);
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
      type,
    })
    .eq("id", input.id)
    .eq("user_id", userId);

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

function resolveGoalInput(
  input: CreateGoalInput | UpdateGoalInput,
  createdAt: string | null,
) {
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

  return { name, icon, targetAmount, currentAmount, deadline };
}

export async function createGoal(input: CreateGoalInput) {
  const { createdAt, supabase, userId } = await getUserContext();
  const { name, icon, targetAmount, currentAmount, deadline } =
    resolveGoalInput(input, createdAt);

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
  const { name, icon, targetAmount, currentAmount, deadline } =
    resolveGoalInput(input, createdAt);

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

  const { data, error } = await supabase.rpc("add_goal_funds", {
    p_goal_id: goalId,
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(`Unable to add goal funds: ${error.message}`);
  }

  if (!data) {
    throw new Error("Goal not found.");
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

  const { error } = await supabase.from("categories").insert({
    group_type: input.group,
    icon: toCategoryIcon(input.name, input.icon),
    is_default: false,
    monthly_limit: monthlyLimit,
    name,
    user_id: userId,
  });

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

  const { error } = await supabase
    .from("categories")
    .update({
      group_type: input.group,
      icon: toCategoryIcon(input.name, input.icon),
      monthly_limit: monthlyLimit,
      name,
    })
    .eq("id", input.id)
    .eq("user_id", userId);

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

function resolveUpdateTransactionInput(
  input: UpdateTransactionInput,
  createdAt: string | null,
) {
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

  return {
    amount,
    date,
    description,
    categoryId,
    paymentMethodId,
    kind: input.type,
    goalId: input.goalId,
  };
}

// Only expenses can feed a goal, so any other kind drops the link.
function resolveGoalLinkUpdate(kind: DbTransactionKind, goalId?: string | null) {
  if (kind !== "expense") return { goal_id: null };
  return goalId === undefined ? {} : { goal_id: goalId };
}

export async function updateTransaction(input: UpdateTransactionInput) {
  const { createdAt, supabase, userId } = await getUserContext();
  assertUuid(input.id, "Transaction");
  const { amount, date, description, categoryId, paymentMethodId, kind, goalId } =
    resolveUpdateTransactionInput(input, createdAt);

  await Promise.all([
    assertUserCategory(supabase, userId, categoryId),
    assertUserPaymentMethod(supabase, userId, paymentMethodId),
    assertUserGoal(supabase, userId, kind === "expense" ? (goalId ?? null) : null),
  ]);

  const { error } = await supabase
    .from("transactions")
    .update({
      amount,
      category_id: categoryId,
      date,
      description: encryptDescription(description),
      kind,
      notes: encryptField(input.notes?.trim() || null),
      payment_method_id: paymentMethodId,
      ...resolveGoalLinkUpdate(kind, goalId),
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

async function getUserTransactionById(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
) {
  const { data, error } = await supabase
    .from("transactions")
    .select(transactionSelect)
    .eq("id", transactionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load transaction: ${error.message}`);
  }

  if (!data) {
    throw new Error("Transaction not found.");
  }

  return toTransaction(data as unknown as TransactionRow);
}

async function getInstallmentGroupTransactions(
  supabase: SupabaseClient,
  userId: string,
  installmentGroupId: string,
) {
  const { data, error } = await supabase
    .from("transactions")
    .select(transactionSelect)
    .eq("user_id", userId)
    .eq("installment_group_id", installmentGroupId);

  if (error) {
    throw new Error(`Unable to load installments: ${error.message}`);
  }

  return ((data ?? []) as unknown as TransactionRow[]).map(toTransaction);
}

async function resolveInstallmentIdsToDelete({
  supabase,
  userId,
  input,
  selectedTransaction,
}: {
  supabase: SupabaseClient;
  userId: string;
  input: DeleteInstallmentsInput;
  selectedTransaction: Transaction;
}) {
  const installments = await getInstallmentGroupTransactions(
    supabase,
    userId,
    selectedTransaction.installmentGroupId as string,
  );
  const selectedInstallments = selectInstallmentsForDeletion({
    scope: input.scope,
    selectedTransaction,
    transactions: installments,
  });

  return selectedInstallments.map((transaction) => transaction.id);
}

async function deleteInstallmentsByIds({
  supabase,
  userId,
  installmentGroupId,
  ids,
}: {
  supabase: SupabaseClient;
  userId: string;
  installmentGroupId: string;
  ids: string[];
}) {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .eq("installment_group_id", installmentGroupId)
    .in("id", ids);

  if (error) {
    throw new Error(`Unable to delete installments: ${error.message}`);
  }
}

type FinancingPlanDbRow = {
  operation_type: FinancingPlanRecord["operationType"];
  interest_system: FinancingPlanRecord["interestSystem"];
  rate_input_mode: FinancingPlanRecord["rateInputMode"];
  rate: number | string;
  rate_period: FinancingPlanRecord["ratePeriod"];
  principal: number | string;
  down_payment: number | string;
  fees: number | string;
  installment_count: number;
  savings_funded_amount: number | string;
};

type FinancingDbRow = {
  id: string;
  date: string;
  amount: number | string;
  kind: DbTransactionKind;
  installment_number: number | null;
  principal_portion: number | string | null;
  interest_portion: number | string | null;
  savings_funded_amount: number | string;
  is_amortization: boolean;
};

function toNullableNumber(value: number | string | null) {
  return value == null ? null : Number(value);
}

function toFinancingPlanRecord(plan: FinancingPlanDbRow): FinancingPlanRecord {
  return {
    operationType: plan.operation_type,
    interestSystem: plan.interest_system,
    rateInputMode: plan.rate_input_mode,
    rate: Number(plan.rate),
    ratePeriod: plan.rate_period,
    principal: Number(plan.principal),
    downPayment: Number(plan.down_payment),
    fees: Number(plan.fees),
    installmentCount: plan.installment_count,
    savingsFundedAmount: Number(plan.savings_funded_amount),
  };
}

function toFinancingRowRecord(row: FinancingDbRow) {
  return {
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    kind: row.kind,
    installmentNumber: row.installment_number,
    principalPortion: toNullableNumber(row.principal_portion),
    interestPortion: toNullableNumber(row.interest_portion),
    savingsFundedAmount: Number(row.savings_funded_amount),
    isAmortization: row.is_amortization,
  };
}

export async function getFinancingBreakdown(
  planId: string,
): Promise<FinancingBreakdown | null> {
  assertUuid(planId, "Financing plan");
  const { supabase, userId } = await getUserContext();

  const { data: plan, error: planError } = await supabase
    .from("financing_plans")
    .select(
      "operation_type, interest_system, rate_input_mode, rate, rate_period, principal, down_payment, fees, installment_count, savings_funded_amount",
    )
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (planError) {
    throw new Error(`Unable to load financing plan: ${planError.message}`);
  }

  if (!plan) return null;

  const { data: rows, error } = await supabase
    .from("transactions")
    .select(
      "id, date, amount, kind, installment_number, principal_portion, interest_portion, savings_funded_amount, is_amortization",
    )
    .eq("user_id", userId)
    .eq("financing_plan_id", planId);

  if (error) {
    throw new Error(`Unable to load financing rows: ${error.message}`);
  }

  return buildFinancingBreakdown(
    toFinancingPlanRecord(plan as FinancingPlanDbRow),
    ((rows ?? []) as FinancingDbRow[]).map(toFinancingRowRecord),
    getTodayValue(),
  );
}

type DebtPlanDbRow = FinancingPlanDbRow & { id: string };
type DebtDbRow = FinancingDbRow & {
  financing_plan_id: string;
  description: string;
  payment_method_id: string | null;
};

// Missing table/column: the financing migration (011) is not applied yet.
function isMissingFinancingSchema(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

function toDebtPlanInput(plan: DebtPlanDbRow, rows: DebtDbRow[]) {
  const first = rows.find((row) => row.installment_number === 1) ?? rows[0];

  return {
    id: plan.id,
    description: first ? stripInstallmentSuffix(decryptDescription(first.description) ?? "") : "",
    paymentMethodId: first?.payment_method_id ?? null,
    plan: toFinancingPlanRecord(plan),
    rows: rows.map(toFinancingRowRecord),
  };
}

export async function listDebtOverview(selectedMonth: string): Promise<DebtOverview> {
  const { supabase, userId } = await getUserContext();
  const empty = buildDebtOverview([], selectedMonth, getTodayValue());

  const { data: plans, error: planError } = await supabase
    .from("financing_plans")
    .select(
      "id, operation_type, interest_system, rate_input_mode, rate, rate_period, principal, down_payment, fees, installment_count, savings_funded_amount",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (isMissingFinancingSchema(planError)) return empty;
  if (planError) {
    throw new Error(`Unable to load financing plans: ${planError.message}`);
  }
  if (!plans?.length) return empty;

  const { data: rows, error } = await supabase
    .from("transactions")
    .select(
      "id, date, amount, kind, installment_number, principal_portion, interest_portion, savings_funded_amount, is_amortization, financing_plan_id, description, payment_method_id",
    )
    .eq("user_id", userId)
    .not("financing_plan_id", "is", null);

  if (error) {
    throw new Error(`Unable to load financing rows: ${error.message}`);
  }

  const rowsByPlan = Map.groupBy((rows ?? []) as DebtDbRow[], (row) => row.financing_plan_id);

  return buildDebtOverview(
    (plans as DebtPlanDbRow[]).map((plan) => toDebtPlanInput(plan, rowsByPlan.get(plan.id) ?? [])),
    selectedMonth,
    getTodayValue(),
  );
}

async function deleteFinancingPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
) {
  // transactions.financing_plan_id is ON DELETE CASCADE: this removes the
  // down payment, installments and loan income of the operation too.
  const { error } = await supabase
    .from("financing_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to delete financing plan: ${error.message}`);
  }
}

// Savings held by the plan's rows, released by a replacement. An amortized
// plan cannot be replaced: recreating it would drop the extra payments.
async function getPlanSavingsToRelease(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("savings_funded_amount, is_amortization")
    .eq("user_id", userId)
    .eq("financing_plan_id", planId);

  if (error) {
    throw new Error(`Unable to load financing rows: ${error.message}`);
  }

  const rows = (data ?? []) as {
    savings_funded_amount: number | string;
    is_amortization?: boolean;
  }[];

  if (rows.some((row) => row.is_amortization)) {
    throw new Error("A debt with amortizations cannot be edited as a whole.");
  }

  return toCents(
    rows.reduce((sum, row) => sum + Number(row.savings_funded_amount), 0),
  );
}

// Turns a single transaction or a whole financed operation into a new
// definition. Plans are immutable, so this recreates instead of updating;
// the new rows are written first so a failure never loses the original.
export async function replaceTransaction(
  transactionId: string,
  input: NewTransactionInput,
) {
  assertUuid(transactionId, "Transaction");
  const { supabase, userId } = await getUserContext();
  const current = await getUserTransactionById(supabase, userId, transactionId);
  const planId = current.financingGroupId;

  if (!planId && isInstallmentTransaction(current)) {
    throw new Error("Plain installment groups cannot be replaced.");
  }

  // toTransaction always sets savingsFundedAmount; the fallback only
  // satisfies the optional field type.
  /* c8 ignore next */
  const rowSavings = current.savingsFundedAmount ?? 0;
  const releasedSavings = planId
    ? await getPlanSavingsToRelease(supabase, userId, planId)
    : rowSavings;

  await createTransaction(input, releasedSavings);

  if (planId) {
    await deleteFinancingPlan(supabase, userId, planId);
    return;
  }
  await deleteTransaction(transactionId);
}

export type AmortizeDebtInput = {
  planId: string;
  amount: number;
  source: "savings" | "balance";
  mode: AmortizationMode;
  description: string;
};

type PlanRowDb = FinancingDbRow & {
  goal_id: string | null;
  installment_group_id: string | null;
  installment_total: number | null;
  category_id: string | null;
  payment_method_id: string | null;
  description: string;
  notes: string | null;
};

type FutureInstallment = PlanRowDb & { installment_number: number };

async function loadFinancingPlanRecord(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
) {
  const { data, error } = await supabase
    .from("financing_plans")
    .select(
      "operation_type, interest_system, rate_input_mode, rate, rate_period, principal, down_payment, fees, installment_count, savings_funded_amount",
    )
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load financing plan: ${error.message}`);
  }
  if (!data) throw new Error("Financing plan not found.");

  return toFinancingPlanRecord(data as FinancingPlanDbRow);
}

async function loadPlanRows(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
) {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, date, amount, kind, installment_number, installment_group_id, installment_total, principal_portion, interest_portion, savings_funded_amount, is_amortization, category_id, payment_method_id, goal_id, description, notes",
    )
    .eq("user_id", userId)
    .eq("financing_plan_id", planId);

  if (error) {
    throw new Error(`Unable to load financing rows: ${error.message}`);
  }

  return (data ?? []) as PlanRowDb[];
}

function pickFutureInstallments(rows: PlanRowDb[], today: string) {
  const future = rows
    .filter(
      (row): row is FutureInstallment =>
        row.kind === "expense" && row.installment_number != null && row.date > today,
    )
    .sort((left, right) => left.installment_number - right.installment_number);

  if (!future.length) throw new Error("This debt has no installments left.");

  return future;
}

function sumNumbers(values: number[]) {
  return toCents(values.reduce((sum, value) => sum + value, 0));
}

// Each new installment keeps the share its predecessor had on savings.
function carrySavingsShare(
  future: FutureInstallment[],
  schedule: { payment: number }[],
) {
  return future.map((row, index) => {
    const old = Number(row.amount);
    const share = old > 0 ? Number(row.savings_funded_amount) / old : 0;
    return schedule[index] ? toCents(schedule[index].payment * share) : 0;
  });
}

// The old installments release their savings; the extra payment and the
// reshaped installments take theirs.
async function assertAmortizationSavings(
  ctx: AuthenticatedUserContext,
  { amount, slices, future }: { amount: number; slices: number[]; future: FutureInstallment[] },
) {
  const released = sumNumbers(future.map((row) => Number(row.savings_funded_amount)));
  const available = await getSavingsAvailableToFund(ctx);

  if (sumNumbers([amount, ...slices]) > toCents(available + released)) {
    throw new Error("Savings funded amount exceeds the saved total.");
  }
}

// A reshaped installment keeps the slot (number, date, labels) of the one it replaces.
function pickInstallmentIdentity(old: FutureInstallment) {
  return {
    date: old.date,
    description: old.description,
    notes: old.notes,
    installment_group_id: old.installment_group_id,
    installment_number: old.installment_number,
    installment_total: old.installment_total,
  };
}

function buildAmortizationRows({
  userId,
  input,
  future,
  paid,
  schedule,
  slices,
}: {
  userId: string;
  input: AmortizeDebtInput;
  future: FutureInstallment[];
  paid: { interest: number; principal: number };
  schedule: { payment: number; principal: number; interest: number }[];
  slices: number[];
}) {
  const base = {
    user_id: userId,
    financing_plan_id: input.planId,
    kind: "expense" as DbTransactionKind,
    category_id: future[0].category_id,
    payment_method_id: future[0].payment_method_id,
    // Keeps the goal link of the schedule being replaced.
    goal_id: future[0].goal_id,
  };
  const extraPayment = {
    ...base,
    amount: input.amount,
    date: getTodayValue(),
    description: encryptDescription(input.description.trim()),
    notes: null,
    installment_group_id: null,
    installment_number: null,
    installment_total: null,
    principal_portion: paid.principal,
    interest_portion: paid.interest,
    savings_funded_amount: input.source === "savings" ? input.amount : 0,
    is_amortization: true,
  };

  return [
    extraPayment,
    ...schedule.map((row, index) => ({
      ...base,
      ...pickInstallmentIdentity(future[index]),
      amount: row.payment,
      principal_portion: row.principal,
      interest_portion: row.interest,
      savings_funded_amount: slices[index],
      // A bulk insert fills a column missing from some rows with NULL, which
      // would break the NOT NULL default, so every row names it.
      is_amortization: false,
    })),
  ];
}

async function replaceFutureInstallments(
  supabase: SupabaseClient,
  userId: string,
  { oldIds, rows }: { oldIds: string[]; rows: object[] },
) {
  const { data: inserted, error: insertError } = await supabase
    .from("transactions")
    .insert(rows)
    .select("id");

  if (insertError) {
    throw new Error(`Unable to save amortization: ${insertError.message}`);
  }

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .in("id", oldIds);

  if (!deleteError) return;

  // Compensation: drop the new rows so the original schedule stays intact.
  await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .in("id", (inserted ?? []).map((row: { id: string }) => row.id));
  throw new Error(`Unable to replace installments: ${deleteError.message}`);
}

// Pays part of a financed debt today. The remaining installments are
// regenerated (see buildAmortization); plans are immutable, so the
// future rows are replaced, and the new ones are written first so a failure
// never loses the originals.
export async function amortizeDebt(rawInput: AmortizeDebtInput) {
  assertUuid(rawInput.planId, "Financing plan");
  const ctx = await getUserContext();
  const { supabase, userId } = ctx;
  const today = getTodayValue();
  const input = { ...rawInput, amount: toCents(rawInput.amount) };
  const plan = await loadFinancingPlanRecord(supabase, userId, input.planId);
  const planRows = await loadPlanRows(supabase, userId, input.planId);
  const future = pickFutureInstallments(planRows, today);
  const breakdown = buildFinancingBreakdown(plan, planRows.map(toFinancingRowRecord), today);
  const accrual = getAccrual(breakdown, today);
  const { rows: schedule, ...paid } = buildAmortization({
    plan,
    outstandingPrincipal: breakdown.outstanding.principal,
    accruedInterest: accrual.interest,
    elapsedDays: accrual.days,
    amount: input.amount,
    mode: input.mode,
    installments: {
      count: future.length,
      next: {
        payment: Number(future[0].amount),
        principal: Number(future[0].principal_portion ?? future[0].amount),
      },
    },
  });
  const slices = carrySavingsShare(future, schedule);

  if (input.source === "savings") {
    await assertAmortizationSavings(ctx, { amount: input.amount, slices, future });
  }

  await replaceFutureInstallments(supabase, userId, {
    oldIds: future.map((row) => row.id),
    rows: buildAmortizationRows({ userId, input, future, paid, schedule, slices }),
  });
}

export async function deleteInstallments(input: DeleteInstallmentsInput) {
  assertUuid(input.transactionId, "Transaction");
  const { supabase, userId } = await getUserContext();

  if (input.scope === "single") {
    await deleteTransaction(input.transactionId);
    return;
  }

  const selectedTransaction = await getUserTransactionById(
    supabase,
    userId,
    input.transactionId,
  );

  if (input.scope === "all" && selectedTransaction.financingGroupId) {
    return deleteFinancingPlan(
      supabase,
      userId,
      selectedTransaction.financingGroupId,
    );
  }

  if (!isInstallmentTransaction(selectedTransaction)) {
    await deleteTransaction(input.transactionId);
    return;
  }

  const selectedIds = await resolveInstallmentIdsToDelete({
    supabase,
    userId,
    input,
    selectedTransaction,
  });

  if (!selectedIds.length) {
    return;
  }

  await deleteInstallmentsByIds({
    supabase,
    userId,
    installmentGroupId: selectedTransaction.installmentGroupId as string,
    ids: selectedIds,
  });
}

export async function advanceInstallments(input: AdvanceInstallmentsInput) {
  assertUuid(input.transactionId, "Transaction");

  if (!/^\d{4}-\d{2}$/.exec(input.targetMonth)) {
    throw new Error("Target month is invalid.");
  }

  const { supabase, userId } = await getUserContext();
  const selectedTransaction = await getUserTransactionById(
    supabase,
    userId,
    input.transactionId,
  );

  if (!isInstallmentTransaction(selectedTransaction)) {
    throw new Error("Transaction is not an installment.");
  }

  const installments = await getInstallmentGroupTransactions(
    supabase,
    userId,
    selectedTransaction.installmentGroupId as string,
  );
  const selectedInstallments = selectInstallmentsForPrepayment({
    count: input.count,
    currentMonth: input.targetMonth,
    scope: input.scope ?? "remaining",
    selectedTransaction,
    transactions: installments,
  });
  const selectedIds = selectedInstallments.map((transaction) => transaction.id);

  if (!selectedIds.length) {
    throw new Error("No remaining future installments to advance.");
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      advanced_at: new Date().toISOString(),
      advanced_to_month: input.targetMonth,
    })
    .eq("user_id", userId)
    .eq(
      "installment_group_id",
      selectedTransaction.installmentGroupId as string,
    )
    .in("id", selectedIds);

  if (error) {
    throw new Error(`Unable to advance installments: ${error.message}`);
  }
}

export async function previewInstallmentPrepayment(
  input: AdvanceInstallmentsInput,
): Promise<InstallmentPrepaymentPreview> {
  assertUuid(input.transactionId, "Transaction");

  if (!/^\d{4}-\d{2}$/.exec(input.targetMonth)) {
    throw new Error("Target month is invalid.");
  }

  const { supabase, userId } = await getUserContext();
  const selectedTransaction = await getUserTransactionById(
    supabase,
    userId,
    input.transactionId,
  );

  if (!isInstallmentTransaction(selectedTransaction)) {
    throw new Error("Transaction is not an installment.");
  }

  const installments = await getInstallmentGroupTransactions(
    supabase,
    userId,
    selectedTransaction.installmentGroupId as string,
  );
  const selectedInstallments = selectInstallmentsForPrepayment({
    currentMonth: input.targetMonth,
    scope: input.scope ?? "remaining",
    selectedTransaction,
    transactions: installments,
  });
  const summary = getInstallmentPrepaymentSummary(selectedInstallments);

  return {
    count: summary.count,
    installments: selectedInstallments.map((transaction) => ({
      amount: Math.abs(transaction.amount),
      date: transaction.date,
      id: transaction.id,
    })),
    targetMonth: input.targetMonth,
    totalAmount: summary.totalAmount,
  };
}

function getSubscriptionGroupQuery(
  supabase: SupabaseClient,
  userId: string,
  subscription: SubscriptionReferenceRow,
) {
  let query = supabase
    .from("transactions")
    .select("id, date, notes")
    .eq("user_id", userId)
    .eq("description", subscription.description);

  query = subscription.category_id
    ? query.eq("category_id", subscription.category_id)
    : query.is("category_id", null);

  query = subscription.payment_method_id
    ? query.eq("payment_method_id", subscription.payment_method_id)
    : query.is("payment_method_id", null);

  return query;
}

async function resolveSubscriptionOccurrenceIdsToDelete({
  supabase,
  userId,
  subscription,
  input,
}: {
  supabase: SupabaseClient;
  userId: string;
  subscription: SubscriptionReferenceRow;
  input: DeleteSubscriptionOccurrencesInput;
}) {
  const { data, error } = await getSubscriptionGroupQuery(
    supabase,
    userId,
    subscription,
  ).order("date", { ascending: true });

  if (error) {
    throw new Error(`Unable to load subscription charges: ${error.message}`);
  }

  const rows = (data ?? []) as Array<
    SubscriptionOccurrenceRow & { notes: string | null }
  >;
  const occurrences: SubscriptionOccurrenceRow[] = rows
    .filter((row) => decryptField(row.notes)?.startsWith("subscription"))
    .map(({ id, date }) => ({ id, date }));
  const selectedOccurrence = occurrences.find(
    (occurrence) => occurrence.id === input.transactionId,
  );

  if (!selectedOccurrence) {
    throw new Error("Subscription occurrence not found.");
  }

  return selectSubscriptionOccurrencesForDeletion({
    occurrences,
    scope: input.scope,
    selectedOccurrence,
    today: getTodayValue(),
  }).map((occurrence) => occurrence.id);
}

async function deleteSubscriptionOccurrencesByIds(
  supabase: SupabaseClient,
  userId: string,
  ids: string[],
) {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    throw new Error(`Unable to delete subscription charges: ${error.message}`);
  }
}

export async function deleteSubscriptionOccurrences(
  input: DeleteSubscriptionOccurrencesInput,
) {
  assertUuid(input.transactionId, "Transaction");
  const { supabase, userId } = await getUserContext();
  const subscription = await loadSubscriptionReference(
    supabase,
    userId,
    input.transactionId,
  );

  if (input.scope === "single") {
    await deleteTransaction(input.transactionId);
    return;
  }

  const selectedIds = await resolveSubscriptionOccurrenceIdsToDelete({
    supabase,
    userId,
    subscription,
    input,
  });

  await deleteSubscriptionOccurrencesByIds(supabase, userId, selectedIds);
}

function resolveMonthRange(month: string | undefined, includeFuture: boolean) {
  if (!month) return null;
  return includeFuture ? getMonthRange(month) : getCollectedMonthRange(month);
}

function resolveQueryStart(
  monthRange: ReturnType<typeof getMonthRange> | null,
  useFinancialMonth: boolean,
  includeCreditCardInvoices: boolean,
) {
  if (!monthRange) return null;
  if (useFinancialMonth) {
    return `${getPreviousMonthValue(monthRange.month)}-01`;
  }
  if (includeCreditCardInvoices) {
    return `${getMonthOffsetValue(monthRange.month, -2)}-01`;
  }
  return monthRange.start;
}

function finalizeTransactionRows(
  rows: TransactionRow[],
  params: {
    filterByMonth: typeof filterByFinancialMonth;
    includeCreditCardInvoices: boolean;
    includeFuture: boolean;
    includePausedSubscriptions?: boolean;
    includePrevious: boolean;
    monthRange: ReturnType<typeof getMonthRange> | null;
    preserveCreditCardInvoicePurchases: boolean;
  },
) {
  const transactions = rows.map(toTransaction).filter(
    (transaction) =>
      !transaction.notes?.startsWith("subscription") ||
      shouldShowSubscriptionOccurrenceInTransactionHistory({
        includePausedSubscriptions: params.includePausedSubscriptions,
        occurrence: transaction,
      }),
  );
  const filteredTransactions = params.monthRange
    ? params.filterByMonth(
        transactions,
        params.monthRange.month,
        params.includePrevious,
      )
    : transactions;
  const resultTransactions =
    params.includeCreditCardInvoices && params.monthRange
      ? withCreditCardInvoiceTransactions({
          month: params.monthRange.month,
          preservePurchases: params.preserveCreditCardInvoicePurchases,
          sourceTransactions: transactions,
          visibleTransactions: filteredTransactions,
        })
      : filteredTransactions;

  return params.includeFuture
    ? markPlannedTransactions(resultTransactions)
    : resultTransactions;
}

function applyTransactionDateRange<
  Query extends {
    gte: (column: string, value: string) => Query;
    lte: (column: string, value: string) => Query;
  },
>(
  query: Query,
  params: {
    includeFuture: boolean;
    includePrevious: boolean;
    monthRange: ReturnType<typeof getMonthRange> | null;
    queryStart: string | null;
  },
): Query {
  if (!params.monthRange) {
    return params.includeFuture ? query : query.lte("date", getTodayValue());
  }

  const rangeQuery = query.lte("date", params.monthRange.end);
  return !params.includePrevious && params.queryStart
    ? rangeQuery.gte("date", params.queryStart)
    : rangeQuery;
}

async function fetchAdvancedInstallmentRows(
  supabase: SupabaseClient,
  userId: string,
  targetMonth: string,
) {
  const { data, error } = await supabase
    .from("transactions")
    .select(transactionSelect)
    .eq("user_id", userId)
    .eq("advanced_to_month", targetMonth)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error && error.code !== "42703") {
    throw new Error(`Unable to load advanced installments: ${error.message}`);
  }

  return (data ?? []) as unknown as TransactionRow[];
}

function mergeAdvancedInstallmentRows(
  rows: TransactionRow[],
  advancedRows: TransactionRow[],
) {
  const merged = [...rows];
  const existingIds = new Set(merged.map((row) => row.id));

  for (const row of advancedRows) {
    if (!existingIds.has(row.id)) {
      merged.push(row);
      existingIds.add(row.id);
    }
  }

  return merged;
}

type FetchTransactionRowsParams = {
  includeFuture: boolean;
  includePrevious: boolean;
  limit?: number;
  monthRange: ReturnType<typeof getMonthRange> | null;
  queryStart: string | null;
};

async function resolvePrimaryTransactionRows({
  supabase,
  userId,
  params,
  data,
}: {
  supabase: SupabaseClient;
  userId: string;
  params: FetchTransactionRowsParams;
  data: unknown;
}) {
  const rows = [...((data ?? []) as unknown as TransactionRow[])];

  if (!params.monthRange || !params.includeFuture) {
    return rows;
  }

  const advancedRows = await fetchAdvancedInstallmentRows(
    supabase,
    userId,
    params.monthRange.month,
  );
  return mergeAdvancedInstallmentRows(rows, advancedRows);
}

async function fetchLegacyTransactionRows(
  supabase: SupabaseClient,
  userId: string,
  params: FetchTransactionRowsParams,
) {
  const fallbackQuery = applyTransactionDateRange(
    supabase
      .from("transactions")
      .select(transactionSelectWithoutAdvancedMetadata)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    params,
  );
  const { data, error } = await fallbackQuery;

  if (error) {
    throw new Error(`Unable to load transactions: ${error.message}`);
  }

  return (data ?? []) as unknown as TransactionRow[];
}

async function fetchTransactionRows(
  supabase: SupabaseClient,
  userId: string,
  params: FetchTransactionRowsParams,
) {
  let query = applyTransactionDateRange(
    supabase
      .from("transactions")
      .select(transactionSelect)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    params,
  );

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (!error) {
    return resolvePrimaryTransactionRows({ supabase, userId, params, data });
  }

  if (error.code !== "42703") {
    throw new Error(`Unable to load transactions: ${error.message}`);
  }

  return fetchLegacyTransactionRows(supabase, userId, params);
}

type ListTransactionsOptions = {
  includeCreditCardInvoices?: boolean;
  includePausedSubscriptions?: boolean;
  preserveCreditCardInvoicePurchases?: boolean;
  includePrevious?: boolean;
  includeFuture?: boolean;
  month?: string;
  useFinancialMonth?: boolean;
  limit?: number;
  userContext?: Awaited<ReturnType<typeof getUserContext>>;
};

function resolveListTransactionsRangeFlags(options?: ListTransactionsOptions) {
  return {
    includePrevious: options?.includePrevious ?? false,
    includeFuture: options?.includeFuture ?? false,
  };
}

function resolveListTransactionsInvoiceFlags(
  options?: ListTransactionsOptions,
) {
  return {
    includeCreditCardInvoices: options?.includeCreditCardInvoices ?? false,
    useFinancialMonth: options?.useFinancialMonth ?? true,
    preserveCreditCardInvoicePurchases:
      options?.preserveCreditCardInvoicePurchases ?? false,
  };
}

function resolveListTransactionsFlags(options?: ListTransactionsOptions) {
  return {
    ...resolveListTransactionsRangeFlags(options),
    ...resolveListTransactionsInvoiceFlags(options),
  };
}

function resolveListTransactionsQueryPlan(
  options: ListTransactionsOptions | undefined,
  flags: ReturnType<typeof resolveListTransactionsFlags>,
) {
  const monthRange = resolveMonthRange(options?.month, flags.includeFuture);
  const queryStart = resolveQueryStart(
    monthRange,
    flags.useFinancialMonth,
    flags.includeCreditCardInvoices,
  );
  const filterByMonth = flags.useFinancialMonth
    ? filterByFinancialMonth
    : filterByTransactionMonth;

  return { monthRange, queryStart, filterByMonth };
}

export async function listTransactions(options?: ListTransactionsOptions) {
  const ctx = options?.userContext ?? (await getUserContext());
  const { supabase, userId } = ctx;
  const flags = resolveListTransactionsFlags(options);
  const { monthRange, queryStart, filterByMonth } =
    resolveListTransactionsQueryPlan(options, flags);

  const rows = await fetchTransactionRows(supabase, userId, {
    includeFuture: flags.includeFuture,
    includePrevious: flags.includePrevious,
    limit: options?.limit,
    monthRange,
    queryStart,
  });

  return finalizeTransactionRows(rows, {
    filterByMonth,
    includeCreditCardInvoices: flags.includeCreditCardInvoices,
    includeFuture: flags.includeFuture,
    includePausedSubscriptions: options?.includePausedSubscriptions,
    includePrevious: flags.includePrevious,
    monthRange,
    preserveCreditCardInvoicePurchases:
      flags.preserveCreditCardInvoicePurchases,
  });
}

async function getTotalSavedForMonth(
  selectedMonth: string,
  userContext: Awaited<ReturnType<typeof getUserContext>>,
) {
  const { data, error } = await userContext.supabase.rpc(
    "calculate_total_saved",
    {
      p_selected_month: `${selectedMonth}-01`,
    },
  );

  if (error) {
    throw new Error(`Unable to calculate total saved: ${error.message}`);
  }

  return Number(data ?? 0);
}

// The saved total only subtracts funded slices dated up to the selected
// month; slices already allocated to later months are committed too.
async function getSavingsAvailableToFund(ctx: AuthenticatedUserContext) {
  const { month, end } = getMonthRange(getCurrentMonthValue());
  const [totalSaved, { data, error }] = await Promise.all([
    getTotalSavedForMonth(month, ctx),
    ctx.supabase
      .from("transactions")
      .select("savings_funded_amount")
      .eq("user_id", ctx.userId)
      .gt("date", end)
      .gt("savings_funded_amount", 0),
  ]);

  if (error) {
    throw new Error(`Unable to load committed savings: ${error.message}`);
  }

  const committed = ((data ?? []) as { savings_funded_amount: number | string }[])
    .reduce((sum, row) => sum + Number(row.savings_funded_amount), 0);

  return toCents(totalSaved - committed);
}

function sumTransactionsByType(
  transactions: Transaction[],
  type: TransactionType,
) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
}

function sumSavingsFunded(transactions: Transaction[]) {
  // Synthesized credit-card invoices carry no savingsFundedAmount.
  return transactions.reduce(
    (sum, { savingsFundedAmount = 0 }) => sum + savingsFundedAmount,
    0,
  );
}

// Month balance after spending, where the savings-funded part of an expense
// is paid by the saved total instead of this month's income.
function computeAvailableBalance(transactions: Transaction[]) {
  return (
    sumTransactionsByType(transactions, "income") -
    (sumTransactionsByType(transactions, "expense") -
      sumSavingsFunded(transactions)) -
    sumTransactionsByType(transactions, "saving")
  );
}

export type FundingContext = {
  availableBalance: number;
  totalSaved: number;
};

export async function getFundingContext(): Promise<FundingContext> {
  const ctx = await getUserContext();
  const month = getCurrentMonthValue();
  const [transactions, totalSaved] = await Promise.all([
    listTransactions({ month, userContext: ctx }),
    getSavingsAvailableToFund(ctx),
  ]);

  return {
    availableBalance: computeAvailableBalance(transactions),
    totalSaved,
  };
}

export async function getMonthlySummary(
  month?: string,
  userContext?: Awaited<ReturnType<typeof getUserContext>>,
): Promise<{
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  totalSavingsFunded: number;
}> {
  const selectedMonth = normalizeMonthValue(month);
  const ctx = userContext ?? (await getUserContext());
  const transactions = await listTransactions({
    month: selectedMonth,
    userContext: ctx,
  });

  return {
    totalIncome: sumTransactionsByType(transactions, "income"),
    totalExpenses: sumTransactionsByType(transactions, "expense"),
    totalSavings: sumTransactionsByType(transactions, "saving"),
    totalSavingsFunded: sumSavingsFunded(transactions),
  };
}

function mergeLatestTransactions(
  actualTransactions: Transaction[],
  scheduledTransactions: Transaction[],
  today: string,
) {
  const byId = new Map<string, Transaction>();

  for (const transaction of actualTransactions) {
    byId.set(transaction.id, transaction);
  }

  for (const transaction of scheduledTransactions) {
    if (!byId.has(transaction.id)) {
      byId.set(transaction.id, {
        ...transaction,
        isPlanned: transaction.date > today,
      });
    }
  }

  return [...byId.values()]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 10);
}

function getPercentageChange(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }

  return Number(
    (((currentValue - previousValue) / Math.abs(previousValue)) * 100).toFixed(
      1,
    ),
  );
}

async function fetchDashboardTransactionSets(
  selectedMonth: string,
  previousMonth: string,
  ctx: Awaited<ReturnType<typeof getUserContext>>,
) {
  const [
    transactions,
    previousTransactions,
    scheduledTransactions,
    trendTransactions,
    displayTransactions,
    displayScheduledTransactions,
  ] = await Promise.all([
    listTransactions({ month: selectedMonth, userContext: ctx }),
    listTransactions({ month: previousMonth, userContext: ctx }),
    listTransactions({
      includeFuture: true,
      month: selectedMonth,
      userContext: ctx,
    }),
    listTransactions({
      includePrevious: true,
      month: selectedMonth,
      userContext: ctx,
    }),
    listTransactions({
      includeCreditCardInvoices: true,
      month: selectedMonth,
      userContext: ctx,
    }),
    listTransactions({
      includeCreditCardInvoices: true,
      includeFuture: true,
      month: selectedMonth,
      userContext: ctx,
    }),
  ]);

  return {
    transactions,
    previousTransactions,
    scheduledTransactions,
    trendTransactions,
    displayTransactions,
    displayScheduledTransactions,
  };
}

async function fetchDashboardSourceData(
  selectedMonth: string,
  previousMonth: string,
  ctx: Awaited<ReturnType<typeof getUserContext>>,
) {
  const [transactionSets, totalSaved, previousTotalSaved, formOptions] =
    await Promise.all([
      fetchDashboardTransactionSets(selectedMonth, previousMonth, ctx),
      getTotalSavedForMonth(selectedMonth, ctx),
      getTotalSavedForMonth(previousMonth, ctx),
      getTransactionFormOptions({ userContext: ctx }),
    ]);

  return {
    ...transactionSets,
    totalSaved,
    previousTotalSaved,
    categories: formOptions.categories,
    paymentMethods: formOptions.paymentMethods,
  };
}

function buildDashboardSummaryData({
  transactions,
  previousTransactions,
  scheduledExpenseTransactions,
  totalSaved,
  previousTotalSaved,
}: {
  transactions: Transaction[];
  previousTransactions: Transaction[];
  scheduledExpenseTransactions: Transaction[];
  totalSaved: number;
  previousTotalSaved: number;
}) {
  const totalIncome = sumTransactionsByType(transactions, "income");
  const totalExpenses = sumTransactionsByType(transactions, "expense");
  const previousTotalIncome = sumTransactionsByType(
    previousTransactions,
    "income",
  );
  const previousTotalExpenses = sumTransactionsByType(
    previousTransactions,
    "expense",
  );
  const predictedExpenses = scheduledExpenseTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0,
  );

  return {
    currentBalance: computeAvailableBalance(transactions),
    predictedExpenses,
    totalExpenses,
    totalIncome,
    totalSaved,
    trends: {
      totalExpenses: getPercentageChange(totalExpenses, previousTotalExpenses),
      totalIncome: getPercentageChange(totalIncome, previousTotalIncome),
      totalSaved: getPercentageChange(totalSaved, previousTotalSaved),
    },
  };
}

function buildExpensesOverTimeData(
  monthBuckets: ReturnType<typeof getLastSixMonthKeys>,
  trendExpenseTransactions: Transaction[],
  scheduledExpenseTransactions: Transaction[],
) {
  return monthBuckets.map((monthBucket) => ({
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
}

function buildDailyExpensesOverTime(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .map((transaction) => ({
      amount: Math.abs(transaction.amount),
      date: transaction.date,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildDashboardBudgetContext(
  transactions: Transaction[],
  scheduledTransactions: Transaction[],
  trendTransactions: Transaction[],
) {
  const trendExpenseTransactions = trendTransactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const scheduledExpenseTransactions = scheduledTransactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const budgetData = calculateBudgetData(
    sumTransactionsByType(transactions, "income"),
    sumBudgetUsageByGroup(transactions),
    sumBudgetUsageByGroup(scheduledTransactions),
  );

  return { trendExpenseTransactions, scheduledExpenseTransactions, budgetData };
}

function buildDashboardBudgetSplitData(
  budgetData: ReturnType<typeof calculateBudgetData>,
) {
  return [
    {
      amount: budgetData.needs.spent,
      color: groupColors.needs,
      maxAmount: budgetData.needs.budget,
      nameKey: "data.group.needs",
      spentAmount: budgetData.needs.spent,
      plannedSpentAmount: budgetData.needs.plannedSpent,
      value: 50,
    },
    {
      amount: budgetData.wants.spent,
      color: groupColors.wants,
      maxAmount: budgetData.wants.budget,
      nameKey: "data.group.wants",
      spentAmount: budgetData.wants.spent,
      plannedSpentAmount: budgetData.wants.plannedSpent,
      value: 30,
    },
    {
      amount: budgetData.savings.spent,
      color: groupColors.savings,
      maxAmount: budgetData.savings.budget,
      nameKey: "data.group.savings",
      spentAmount: budgetData.savings.spent,
      plannedSpentAmount: budgetData.savings.plannedSpent,
      value: 20,
    },
  ];
}

function assembleDashboardData({
  monthBuckets,
  sourceData,
  budgetContext,
}: {
  monthBuckets: ReturnType<typeof getLastSixMonthKeys>;
  sourceData: Awaited<ReturnType<typeof fetchDashboardSourceData>>;
  budgetContext: ReturnType<typeof buildDashboardBudgetContext>;
}): DashboardData {
  const {
    transactions,
    previousTransactions,
    scheduledTransactions,
    displayTransactions,
    displayScheduledTransactions,
    totalSaved,
    previousTotalSaved,
    categories,
    paymentMethods,
  } = sourceData;
  const { trendExpenseTransactions, scheduledExpenseTransactions, budgetData } =
    budgetContext;

  return {
    budgetData,
    budgetSplitData: buildDashboardBudgetSplitData(budgetData),
    categories,
    dailyExpensesOverTime: buildDailyExpensesOverTime(transactions),
    expensesByCategory: buildExpensesByCategoryData(scheduledTransactions),
    expensesOverTime: buildExpensesOverTimeData(
      monthBuckets,
      trendExpenseTransactions,
      scheduledExpenseTransactions,
    ),
    latestTransactions: mergeLatestTransactions(
      displayTransactions,
      displayScheduledTransactions,
      getTodayValue(),
    ),
    paymentMethods,
    summaryData: buildDashboardSummaryData({
      transactions,
      previousTransactions,
      scheduledExpenseTransactions,
      totalSaved,
      previousTotalSaved,
    }),
  };
}

export async function getDashboardData(
  month?: string,
  userContext?: Awaited<ReturnType<typeof getUserContext>>,
): Promise<DashboardData> {
  const selectedMonth = normalizeMonthValue(month);
  const previousMonth = getPreviousMonthValue(selectedMonth);
  const monthBuckets = getLastSixMonthKeys(selectedMonth);
  const ctx = userContext ?? (await getUserContext());
  const sourceData = await fetchDashboardSourceData(
    selectedMonth,
    previousMonth,
    ctx,
  );
  const budgetContext = buildDashboardBudgetContext(
    sourceData.transactions,
    sourceData.scheduledTransactions,
    sourceData.trendTransactions,
  );

  return assembleDashboardData({ monthBuckets, sourceData, budgetContext });
}

function buildMonthlyReports({
  periodBuckets,
  transactionMonthPairs,
  baselineNetWorth,
  bucketNetWorths,
}: {
  periodBuckets: ReturnType<typeof getLastMonthKeys>;
  transactionMonthPairs: { financialMonth: string; transaction: Transaction }[];
  baselineNetWorth: number;
  bucketNetWorths: number[];
}) {
  const previousNetWorths = [baselineNetWorth, ...bucketNetWorths.slice(0, -1)];

  return periodBuckets.map((bucket, index) => {
    const monthTransactions = transactionMonthPairs
      .filter((pair) => pair.financialMonth === bucket.key)
      .map((pair) => pair.transaction);
    const summary = getMonthlyFinanceSummary(monthTransactions);
    const netWorth = bucketNetWorths[index];

    return {
      ...summary,
      month: bucket.key,
      monthKey: bucket.monthKey,
      netWorth,
      savings: netWorth - previousNetWorths[index],
      year: bucket.year,
    };
  });
}

function buildReportTransactions(
  transactionMonthPairs: { financialMonth: string; transaction: Transaction }[],
  periodMonthSet: Set<string>,
) {
  return transactionMonthPairs
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
}

export async function getReportsData(
  month?: string,
  periodMonths?: number,
): Promise<ReportsData> {
  const selectedMonth = normalizeMonthValue(month);
  const safePeriodMonths = getSafeReportPeriod(periodMonths);
  const periodBuckets = getLastMonthKeys(selectedMonth, safePeriodMonths);
  const periodMonthSet = new Set(periodBuckets.map((bucket) => bucket.key));
  const ctx = await getUserContext();
  const transactions = await listTransactions({
    includePrevious: true,
    month: selectedMonth,
    userContext: ctx,
  });
  const transactionMonthPairs = transactions.map((transaction) => ({
    financialMonth: getFinancialMonth(transaction),
    transaction,
  }));

  const baselineMonth = getPreviousMonthValue(periodBuckets[0].key);
  const [baselineNetWorth, ...bucketNetWorths] = await Promise.all([
    getTotalSavedForMonth(baselineMonth, ctx),
    ...periodBuckets.map((bucket) => getTotalSavedForMonth(bucket.key, ctx)),
  ]);

  const monthlyReports = buildMonthlyReports({
    periodBuckets,
    transactionMonthPairs,
    baselineNetWorth,
    bucketNetWorths,
  });

  return {
    monthlyReports: monthlyReports.toReversed(),
    periodMonths: safePeriodMonths,
    selectedMonth,
    transactions: buildReportTransactions(
      transactionMonthPairs,
      periodMonthSet,
    ),
  };
}

export async function getBudgetOverviewData(
  month?: string,
  userContext?: Awaited<ReturnType<typeof getUserContext>>,
): Promise<BudgetOverviewData> {
  const ctx = userContext ?? (await getUserContext());
  const [dashboardData, categories] = await Promise.all([
    getDashboardData(month, ctx),
    listCategoryOverview(month, ctx),
  ]);

  return {
    budgetData: dashboardData.budgetData,
    budgetSplitData: dashboardData.budgetSplitData,
    categories,
  };
}
