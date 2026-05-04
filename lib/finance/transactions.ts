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
  id: string;
  is_default: boolean | null;
  name: string;
  type: "pix" | "debit" | "credit" | "cash" | "bank" | "other";
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

export type TransactionFormCategory = {
  group: DbCategoryGroup;
  id: string;
  icon: string;
  label: string;
  monthlyLimit: number;
};

export type TransactionFormPaymentMethod = {
  id: string;
  label: string;
  type: PaymentMethodRow["type"];
};

export type PaymentMethodOverviewItem = TransactionFormPaymentMethod & {
  canModify: boolean;
  isDefault: boolean;
  name: string;
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
  id: string;
  name: string;
  type: Exclude<PaymentMethodRow["type"], "cash" | "pix">;
};

export type SummaryData = {
  totalIncome: number;
  totalExpenses: number;
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
  color: string;
  group: DbCategoryGroup;
  icon: string;
  id: string;
  isDefault: boolean;
  label: string;
  monthlyLimit: number;
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
};

export type DashboardData = TransactionFormOptions & {
  budgetData: BudgetData;
  budgetSplitData: BudgetSplitItem[];
  expensesByCategory: ExpensesByCategoryItem[];
  expensesOverTime: ExpensesOverTimeItem[];
  latestTransactions: Transaction[];
  summaryData: SummaryData;
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
const editablePaymentMethodTypes = ["bank", "credit", "debit"] as const;
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
  // Treat null as true (default to translating if is_default column doesn't exist)
  if (isDefault === false) {
    return paymentMethodName;
  }

  if (paymentMethodType === "pix") return "transaction.paymentMethods.pix";
  if (paymentMethodType === "cash") return "transaction.paymentMethods.cash";
  if (paymentMethodType === "credit")
    return "transaction.paymentMethods.creditCard";
  if (paymentMethodType === "debit")
    return "transaction.paymentMethods.debitCard";

  return (
    paymentMethodTranslationMap[normalizeLabel(paymentMethodName)] ??
    paymentMethodName
  );
}

async function getUserContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/");
  }

  return { supabase, userId: data.claims.sub };
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
    icon: groupIcons[group],
    notes: row.notes,
    paymentMethodId: row.payment_method_id,
    paymentMethodKey,
    type: row.kind,
  };
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

function getLastSixMonthKeys(month?: string) {
  const normalizedMonth = normalizeMonthValue(month);
  const [year, monthNumber] = normalizedMonth.split("-").map(Number);
  const baseDate = new Date(year, monthNumber - 1, 1);

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() - (5 - index),
      1,
    );

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      monthKey: monthKeys[date.getMonth()],
    };
  });
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

export async function listCategoryOverview(): Promise<CategoryOverviewItem[]> {
  const categories = await listCategories();
  const transactions = await listTransactions();

  return categories.map((category) => {
    const label = toCategoryLabelKey(category.name, category.is_default);
    const spent = transactions
      .filter((transaction) => transaction.categoryId === category.id)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    return {
      color: groupColors[category.group_type],
      group: category.group_type,
      icon: toCategoryIcon(category.name, category.icon),
      id: category.id,
      isDefault: Boolean(category.is_default),
      label,
      monthlyLimit: Number(category.monthly_limit ?? 0),
      spent,
    };
  });
}

async function listPaymentMethods() {
  const { supabase, userId } = await getUserContext();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, type, is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (!error) {
    return (data ?? []) as PaymentMethodRow[];
  }

  // Backward-compatible fallback for schemas without is_default in payment_methods.
  if (error.code === "42703") {
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

    return ((fallbackData ?? []) as Omit<PaymentMethodRow, "is_default">[]).map(
      (paymentMethod) => ({ ...paymentMethod, is_default: null }),
    );
  }

  throw new Error(`Unable to load payment methods: ${error.message}`);
}

function isProtectedPaymentMethod(paymentMethod: PaymentMethodRow) {
  return paymentMethod.type === "cash" || paymentMethod.type === "pix";
}

export async function listPaymentMethodOverview(): Promise<
  PaymentMethodOverviewItem[]
> {
  const paymentMethods = await listPaymentMethods();

  return paymentMethods.map((paymentMethod) => ({
    canModify: !isProtectedPaymentMethod(paymentMethod),
    id: paymentMethod.id,
    isDefault: Boolean(paymentMethod.is_default),
    label: toPaymentMethodLabelKey(
      paymentMethod.name,
      paymentMethod.type,
      paymentMethod.is_default,
    ),
    name: paymentMethod.name,
    type: paymentMethod.type,
  }));
}

async function getPaymentMethodForMutation(paymentMethodId: string) {
  assertUuid(paymentMethodId, "Payment method");

  const { supabase, userId } = await getUserContext();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, type, is_default")
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
  const { supabase, userId } = await getUserContext();
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

  // Build notes field: combine installment info with user notes
  let finalNotes = installmentCount > 1 ? `${installmentCount}x` : null;
  const notes = normalizeOptionalString(input.notes);
  if (notes) {
    finalNotes = finalNotes ? `${finalNotes} - ${notes}` : notes;
  }

  const { error } = await supabase.from("transactions").insert({
    amount,
    category_id: categoryId,
    date,
    description,
    kind,
    notes: finalNotes,
    payment_method_id: paymentMethodId,
    user_id: userId,
  });

  if (error) {
    throw new Error(`Unable to save transaction: ${error.message}`);
  }
}

export async function updatePaymentMethod(input: UpdatePaymentMethodInput) {
  assertUuid(input.id, "Payment method");
  const name = assertNonEmptyString(input.name, "Payment method name");

  if (!isEditablePaymentMethodType(input.type)) {
    throw new Error("Payment method type is invalid.");
  }

  const { paymentMethod, supabase, userId } = await getPaymentMethodForMutation(
    input.id,
  );

  if (isProtectedPaymentMethod(paymentMethod)) {
    throw new Error("This payment method cannot be edited.");
  }

  const { error } = await supabase
    .from("payment_methods")
    .update({
      name,
      type: input.type,
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

export async function updateTransaction(input: UpdateTransactionInput) {
  const { supabase, userId } = await getUserContext();
  assertUuid(input.id, "Transaction");
  const amount = Math.abs(input.amount);
  const date = toIsoDate(input.date);
  const description = assertNonEmptyString(input.description, "Description");

  assertPositiveFiniteAmount(amount, "Amount");
  assertValidIsoDate(date);

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

export async function listTransactions() {
  const { supabase, userId } = await getUserContext();

  const { data, error } = await supabase
    .from("transactions")
    .select(transactionSelect)
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!error) {
    return ((data ?? []) as unknown as TransactionRow[]).map(toTransaction);
  }

  if (error.code === "42703") {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("transactions")
      .select(transactionSelectWithoutCategoryIcon)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (fallbackError) {
      throw new Error(`Unable to load transactions: ${fallbackError.message}`);
    }

    return ((fallbackData ?? []) as unknown as TransactionRow[]).map(
      toTransaction,
    );
  }

  throw new Error(`Unable to load transactions: ${error.message}`);
}

export async function getDashboardData(month?: string): Promise<DashboardData> {
  const { supabase, userId } = await getUserContext();
  const selectedMonthRange = getMonthRange(month);
  const monthBuckets = getLastSixMonthKeys(selectedMonthRange.month);
  const trendStart = `${monthBuckets[0]?.key ?? selectedMonthRange.month}-01`;
  const [{ categories, paymentMethods }] = await Promise.all([
    getTransactionFormOptions(),
  ]);

  const loadDashboardTransactions = (selectQuery: string) =>
    Promise.all([
      supabase
        .from("transactions")
        .select(selectQuery)
        .eq("user_id", userId)
        .gte("date", selectedMonthRange.start)
        .lte("date", selectedMonthRange.end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select(selectQuery)
        .eq("user_id", userId)
        .gte("date", trendStart)
        .lte("date", selectedMonthRange.end),
    ]);

  let [{ data, error }, { data: trendData, error: trendError }] =
    await loadDashboardTransactions(transactionSelect);

  if (error?.code === "42703" || trendError?.code === "42703") {
    [{ data, error }, { data: trendData, error: trendError }] =
      await loadDashboardTransactions(transactionSelectWithoutCategoryIcon);
  }

  if (error) {
    throw new Error(`Unable to load dashboard data: ${error.message}`);
  }

  if (trendError) {
    throw new Error(
      `Unable to load dashboard trend data: ${trendError.message}`,
    );
  }

  const transactions = ((data ?? []) as unknown as TransactionRow[]).map(
    toTransaction,
  );
  const trendTransactions = (
    (trendData ?? []) as unknown as TransactionRow[]
  ).map(toTransaction);
  const incomeTransactions = transactions.filter(
    (transaction) => transaction.type === "income",
  );
  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const savingTransactions = transactions.filter(
    (transaction) => transaction.type === "saving",
  );
  const trendExpenseTransactions = trendTransactions.filter(
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
  const totalSaved = savingTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0,
  );

  const budgetData = emptyBudgetData();
  for (const group of Object.keys(groupBudgetRatios) as DbCategoryGroup[]) {
    const categoryLimits = categories
      .filter((category) => category.group === group)
      .reduce((sum, category) => sum + category.monthlyLimit, 0);
    const spent = transactions
      .filter((transaction) => transaction.group === group)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const budget = categoryLimits || totalIncome * groupBudgetRatios[group];

    budgetData[group] = {
      budget,
      percentage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
      spent,
    };
  }

  const expensesByCategory = expenseTransactions.reduce((acc, transaction) => {
    const existing = acc.find(
      (item) => item.nameKey === transaction.categoryKey,
    );

    if (existing) {
      existing.value += Math.abs(transaction.amount);
    } else {
      acc.push({
        color: groupColors[transaction.group as DbCategoryGroup] ?? "#64748B",
        nameKey: transaction.categoryKey,
        value: Math.abs(transaction.amount),
      });
    }

    return acc;
  }, [] as ExpensesByCategoryItem[]);

  const expensesOverTime = monthBuckets.map((monthBucket) => ({
    amount: trendExpenseTransactions
      .filter((transaction) => transaction.date.startsWith(monthBucket.key))
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
    latestTransactions: transactions.slice(0, 5),
    paymentMethods,
    summaryData: {
      currentBalance: totalIncome - totalExpenses,
      totalExpenses,
      totalIncome,
      totalSaved,
    },
  };
}
