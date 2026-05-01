export type TransactionType = "income" | "expense" | "saving";
export type TransactionGroup = "needs" | "wants" | "savings" | "income";

export interface Transaction {
  id: string;
  descriptionKey: string;
  amount: number;
  type: TransactionType;
  categoryKey: string;
  categoryId?: string | null;
  group: TransactionGroup;
  date: string;
  icon: string;
  notes?: string | null;
  paymentMethodId?: string | null;
  paymentMethodKey?: string | null;
}

export const transactions: Transaction[] = [
  {
    id: "1",
    descriptionKey: "data.transaction.salaryDeposit",
    amount: 5200,
    type: "income",
    categoryKey: "data.category.receipts",
    group: "income",
    date: "2024-01-15",
    icon: "💼",
  },
  {
    id: "2",
    descriptionKey: "data.transaction.groceryShopping",
    amount: -156.43,
    type: "expense",
    categoryKey: "data.category.food",
    group: "needs",
    date: "2024-01-14",
    icon: "🛒",
  },
  {
    id: "3",
    descriptionKey: "data.transaction.netflixSubscription",
    amount: -15.99,
    type: "expense",
    categoryKey: "data.category.subscriptions",
    group: "wants",
    date: "2024-01-13",
    icon: "📺",
  },
  {
    id: "4",
    descriptionKey: "data.transaction.rentPayment",
    amount: -1800,
    type: "expense",
    categoryKey: "data.category.housing",
    group: "needs",
    date: "2024-01-12",
    icon: "🏠",
  },
  {
    id: "5",
    descriptionKey: "data.transaction.investmentFund",
    amount: -500,
    type: "saving",
    categoryKey: "data.category.investments",
    group: "savings",
    date: "2024-01-11",
    icon: "📈",
  },
  {
    id: "6",
    descriptionKey: "data.transaction.restaurantDinner",
    amount: -87.5,
    type: "expense",
    categoryKey: "data.category.leisure",
    group: "wants",
    date: "2024-01-10",
    icon: "🍽️",
  },
  {
    id: "7",
    descriptionKey: "data.transaction.freelanceProject",
    amount: 850,
    type: "income",
    categoryKey: "data.category.receipts",
    group: "income",
    date: "2024-01-09",
    icon: "💻",
  },
  {
    id: "8",
    descriptionKey: "data.transaction.gasStation",
    amount: -52.3,
    type: "expense",
    categoryKey: "data.category.transportation",
    group: "needs",
    date: "2024-01-08",
    icon: "⛽",
  },
  {
    id: "9",
    descriptionKey: "data.transaction.emergencyFund",
    amount: -300,
    type: "saving",
    categoryKey: "data.category.investments",
    group: "savings",
    date: "2024-01-07",
    icon: "🏦",
  },
  {
    id: "10",
    descriptionKey: "data.transaction.gymMembership",
    amount: -45,
    type: "expense",
    categoryKey: "data.category.health",
    group: "needs",
    date: "2024-01-06",
    icon: "🏋️",
  },
];

export const summaryData = {
  totalIncome: 6050,
  totalExpenses: 2156.22,
  totalSaved: 800,
  currentBalance: 3893.78,
};

export const budgetData = {
  needs: { spent: 2008.73, budget: 3025, percentage: 66 },
  wants: { spent: 148.49, budget: 1815, percentage: 8 },
  savings: { spent: 800, budget: 1210, percentage: 66 },
};

export const expensesByCategory = [
  { nameKey: "data.category.housing", value: 1800, color: "#F97316" },
  { nameKey: "data.category.food", value: 156.43, color: "#EC4899" },
  { nameKey: "data.category.transportation", value: 52.3, color: "#8B5CF6" },
  { nameKey: "data.category.subscriptions", value: 15.99, color: "#22C55E" },
  { nameKey: "data.category.leisure", value: 87.5, color: "#FACC15" },
  { nameKey: "data.category.health", value: 45, color: "#FB7185" },
];

export const expensesOverTime = [
  { monthKey: "data.month.aug", amount: 2100 },
  { monthKey: "data.month.sep", amount: 2450 },
  { monthKey: "data.month.oct", amount: 1980 },
  { monthKey: "data.month.nov", amount: 2680 },
  { monthKey: "data.month.dec", amount: 2340 },
  { monthKey: "data.month.jan", amount: 2156 },
];

export const budgetSplitData = [
  { nameKey: "data.group.needs", value: 50, amount: 2008.73, color: "#F97316" },
  { nameKey: "data.group.wants", value: 30, amount: 148.49, color: "#EC4899" },
  { nameKey: "data.group.savings", value: 20, amount: 800, color: "#8B5CF6" },
];

export const months = [
  { key: "data.month.january2024", value: "2024-01" },
  { key: "data.month.february2024", value: "2024-02" },
  { key: "data.month.march2024", value: "2024-03" },
  { key: "data.month.april2024", value: "2024-04" },
  { key: "data.month.may2024", value: "2024-05" },
  { key: "data.month.june2024", value: "2024-06" },
  { key: "data.month.july2024", value: "2024-07" },
  { key: "data.month.august2024", value: "2024-08" },
  { key: "data.month.september2024", value: "2024-09" },
  { key: "data.month.october2024", value: "2024-10" },
  { key: "data.month.november2024", value: "2024-11" },
  { key: "data.month.december2024", value: "2024-12" },
];

export interface Category {
  id: string;
  nameKey: string;
  icon: string;
  color: string;
  group: TransactionGroup;
  budget: number;
  spent: number;
}

export const categories: Category[] = [
  {
    id: "1",
    nameKey: "data.category.housing",
    icon: "🏠",
    color: "#F97316",
    group: "needs",
    budget: 2000,
    spent: 1800,
  },
  {
    id: "2",
    nameKey: "data.category.food",
    icon: "🛒",
    color: "#22C55E",
    group: "needs",
    budget: 400,
    spent: 156.43,
  },
  {
    id: "3",
    nameKey: "data.category.transportation",
    icon: "🚗",
    color: "#8B5CF6",
    group: "needs",
    budget: 300,
    spent: 52.3,
  },
  {
    id: "4",
    nameKey: "data.category.health",
    icon: "💡",
    color: "#FACC15",
    group: "needs",
    budget: 200,
    spent: 145,
  },
  {
    id: "5",
    nameKey: "data.category.education",
    icon: "📚",
    color: "#6366F1",
    group: "needs",
    budget: 160,
    spent: 0,
  },
  {
    id: "6",
    nameKey: "data.category.important",
    icon: "⚡",
    color: "#F59E0B",
    group: "needs",
    budget: 180,
    spent: 0,
  },
  {
    id: "7",
    nameKey: "data.category.leisure",
    icon: "📺",
    color: "#EC4899",
    group: "wants",
    budget: 150,
    spent: 15.99,
  },
  {
    id: "8",
    nameKey: "data.category.subscriptions",
    icon: "🎬",
    color: "#FB7185",
    group: "wants",
    budget: 200,
    spent: 87.5,
  },
  {
    id: "9",
    nameKey: "data.category.shopping",
    icon: "🛍️",
    color: "#14B8A6",
    group: "wants",
    budget: 300,
    spent: 45,
  },
  {
    id: "10",
    nameKey: "data.category.debts",
    icon: "🧾",
    color: "#A855F7",
    group: "needs",
    budget: 250,
    spent: 0,
  },
  {
    id: "11",
    nameKey: "data.category.investments",
    icon: "📈",
    color: "#22C55E",
    group: "savings",
    budget: 500,
    spent: 500,
  },
  {
    id: "12",
    nameKey: "data.category.other",
    icon: "🏷️",
    color: "#64748B",
    group: "wants",
    budget: 120,
    spent: 0,
  },
  {
    id: "13",
    nameKey: "data.category.receipts",
    icon: "💼",
    color: "#22C55E",
    group: "income",
    budget: 0,
    spent: 0,
  },
];

export interface Goal {
  id: string;
  nameKey: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

export const goals: Goal[] = [
  {
    id: "1",
    nameKey: "data.goal.emergencyFund",
    icon: "🏦",
    targetAmount: 10000,
    currentAmount: 6500,
    deadline: "2026-12-31",
    color: "#22C55E",
  },
  {
    id: "2",
    nameKey: "data.goal.vacationTrip",
    icon: "✈️",
    targetAmount: 3000,
    currentAmount: 1200,
    deadline: "2026-08-01",
    color: "#8B5CF6",
  },
  {
    id: "3",
    nameKey: "data.goal.newCar",
    icon: "🚗",
    targetAmount: 25000,
    currentAmount: 8500,
    deadline: "2027-06-01",
    color: "#F97316",
  },
  {
    id: "4",
    nameKey: "data.goal.homeDownPayment",
    icon: "🏠",
    targetAmount: 50000,
    currentAmount: 12000,
    deadline: "2028-01-01",
    color: "#EC4899",
  },
];

export interface Payment {
  id: string;
  name: string;
  icon: string;
  amount: number;
  frequency: "monthly" | "yearly" | "weekly";
  nextDate: string;
  categoryKey: string;
  status: "active" | "paused" | "cancelled";
}

export const payments: Payment[] = [
  {
    id: "1",
    name: "Netflix",
    icon: "📺",
    amount: 15.99,
    frequency: "monthly",
    nextDate: "2026-05-13",
    categoryKey: "data.category.subscriptions",
    status: "active",
  },
  {
    id: "2",
    name: "Spotify",
    icon: "🎵",
    amount: 9.99,
    frequency: "monthly",
    nextDate: "2026-05-15",
    categoryKey: "data.category.subscriptions",
    status: "active",
  },
  {
    id: "3",
    name: "Gym Membership",
    icon: "🏋️",
    amount: 45,
    frequency: "monthly",
    nextDate: "2026-05-06",
    categoryKey: "data.category.health",
    status: "active",
  },
  {
    id: "4",
    name: "Amazon Prime",
    icon: "📦",
    amount: 139,
    frequency: "yearly",
    nextDate: "2026-06-20",
    categoryKey: "data.category.subscriptions",
    status: "active",
  },
  {
    id: "5",
    name: "iCloud Storage",
    icon: "☁️",
    amount: 2.99,
    frequency: "monthly",
    nextDate: "2026-05-01",
    categoryKey: "data.category.subscriptions",
    status: "active",
  },
  {
    id: "6",
    name: "Adobe Creative",
    icon: "🎨",
    amount: 54.99,
    frequency: "monthly",
    nextDate: "2026-05-10",
    categoryKey: "data.category.subscriptions",
    status: "paused",
  },
];

export const monthlyReports = [
  {
    monthKey: "data.month.jan",
    year: "2026",
    income: 6050,
    expenses: 2156.22,
    savings: 800,
    netWorth: 45000,
  },
  {
    monthKey: "data.month.dec",
    year: "2025",
    income: 5800,
    expenses: 2340,
    savings: 600,
    netWorth: 41356,
  },
  {
    monthKey: "data.month.nov",
    year: "2025",
    income: 5950,
    expenses: 2680,
    savings: 500,
    netWorth: 37296,
  },
  {
    monthKey: "data.month.oct",
    year: "2025",
    income: 5700,
    expenses: 1980,
    savings: 700,
    netWorth: 33526,
  },
  {
    monthKey: "data.month.sep",
    year: "2025",
    income: 5650,
    expenses: 2450,
    savings: 550,
    netWorth: 30106,
  },
  {
    monthKey: "data.month.aug",
    year: "2025",
    income: 5500,
    expenses: 2100,
    savings: 600,
    netWorth: 26506,
  },
];
