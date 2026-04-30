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
  type: "pix" | "debit" | "credit" | "cash" | "bank";
};

type TransactionRow = {
  id: string;
  amount: number | string;
  date: string;
  description: string;
  kind: DbTransactionKind;
  notes: string | null;
  categories: CategoryRow | null;
};

export type TransactionFormCategory = {
  group: DbCategoryGroup;
  id: string;
  label: string;
  monthlyLimit: number;
};

export type TransactionFormPaymentMethod = {
  id: string;
  label: string;
  type: PaymentMethodRow["type"];
};

export type TransactionFormOptions = {
  categories: TransactionFormCategory[];
  paymentMethods: TransactionFormPaymentMethod[];
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
  nameKey: string;
  value: number;
  amount: number;
  color: string;
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

const transactionSelect = `
  id,
  date,
  description,
  amount,
  kind,
  notes,
  categories (
    id,
    name,
    group_type,
    is_default,
    monthly_limit
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

function toCategoryLabelKey(categoryName: string, isDefault: boolean | null) {
  // Treat null as true (default to translating if is_default column doesn't exist)
  if (isDefault === false) {
    return categoryName;
  }

  return categoryTranslationMap[normalizeLabel(categoryName)] ?? categoryName;
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

  return {
    id: row.id,
    amount: signedAmount,
    categoryKey: categoryName,
    date: row.date,
    descriptionKey: row.description || row.notes || categoryName,
    group,
    icon: groupIcons[group],
    type: row.kind,
  };
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    end: end.toISOString().slice(0, 10),
    start: start.toISOString().slice(0, 10),
  };
}

function getLastSixMonthKeys() {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

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
    .select("id, name, group_type, is_default, monthly_limit")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load categories: ${error.message}`);
  }

  return (data ?? []) as CategoryRow[];
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

export async function getTransactionFormOptions(): Promise<TransactionFormOptions> {
  const [categories, paymentMethods] = await Promise.all([
    listCategories(),
    listPaymentMethods(),
  ]);

  const mappedCategories = categories.map((category) => ({
    group: category.group_type,
    id: category.id,
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
  const categoryId =
    input.type === "income" || input.category === "none"
      ? null
      : input.category;
  const paymentMethodId =
    input.paymentMethod === "none" ? null : input.paymentMethod;
  const kind: DbTransactionKind =
    input.type === "income" ? "income" : categoryId ? "expense" : input.type;

  // Build notes field: combine installment info with user notes
  let finalNotes =
    input.installmentCount > 1 ? `${input.installmentCount}x` : null;
  if (input.notes?.trim()) {
    finalNotes = finalNotes
      ? `${finalNotes} - ${input.notes.trim()}`
      : input.notes.trim();
  }

  const { error } = await supabase.from("transactions").insert({
    amount: Math.abs(input.amount),
    category_id: categoryId,
    date: toIsoDate(input.date),
    description: input.description.trim(),
    kind,
    notes: finalNotes,
    payment_method_id: paymentMethodId,
    user_id: userId,
  });

  if (error) {
    throw new Error(`Unable to save transaction: ${error.message}`);
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

  if (error) {
    throw new Error(`Unable to load transactions: ${error.message}`);
  }

  return ((data ?? []) as unknown as TransactionRow[]).map(toTransaction);
}

export async function getDashboardData(): Promise<DashboardData> {
  const { supabase, userId } = await getUserContext();
  const [{ categories, paymentMethods }, { start, end }] = await Promise.all([
    getTransactionFormOptions(),
    Promise.resolve(getCurrentMonthRange()),
  ]);

  const { data, error } = await supabase
    .from("transactions")
    .select(transactionSelect)
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load dashboard data: ${error.message}`);
  }

  const transactions = ((data ?? []) as unknown as TransactionRow[]).map(
    toTransaction,
  );
  const incomeTransactions = transactions.filter(
    (transaction) => transaction.type === "income",
  );
  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const savingTransactions = transactions.filter(
    (transaction) => transaction.type === "saving",
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

  const monthBuckets = getLastSixMonthKeys();
  const expensesOverTime = monthBuckets.map((month) => ({
    amount: expenseTransactions
      .filter((transaction) => transaction.date.startsWith(month.key))
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    monthKey: month.monthKey,
  }));

  const budgetSplitData = [
    {
      amount: budgetData.needs.spent,
      color: groupColors.needs,
      nameKey: "data.group.needs",
      value: 50,
    },
    {
      amount: budgetData.wants.spent,
      color: groupColors.wants,
      nameKey: "data.group.wants",
      value: 30,
    },
    {
      amount: budgetData.savings.spent,
      color: groupColors.savings,
      nameKey: "data.group.savings",
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
