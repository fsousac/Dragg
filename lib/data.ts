export type TransactionType = "income" | "expense" | "saving"
export type TransactionGroup = "needs" | "wants" | "savings"

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  group: TransactionGroup
  date: string
  icon: string
}

export const transactions: Transaction[] = [
  {
    id: "1",
    description: "Salary Deposit",
    amount: 5200,
    type: "income",
    category: "Salary",
    group: "needs",
    date: "2024-01-15",
    icon: "💼"
  },
  {
    id: "2",
    description: "Grocery Shopping",
    amount: -156.43,
    type: "expense",
    category: "Groceries",
    group: "needs",
    date: "2024-01-14",
    icon: "🛒"
  },
  {
    id: "3",
    description: "Netflix Subscription",
    amount: -15.99,
    type: "expense",
    category: "Entertainment",
    group: "wants",
    date: "2024-01-13",
    icon: "📺"
  },
  {
    id: "4",
    description: "Rent Payment",
    amount: -1800,
    type: "expense",
    category: "Housing",
    group: "needs",
    date: "2024-01-12",
    icon: "🏠"
  },
  {
    id: "5",
    description: "Investment Fund",
    amount: -500,
    type: "saving",
    category: "Investments",
    group: "savings",
    date: "2024-01-11",
    icon: "📈"
  },
  {
    id: "6",
    description: "Restaurant Dinner",
    amount: -87.50,
    type: "expense",
    category: "Dining",
    group: "wants",
    date: "2024-01-10",
    icon: "🍽️"
  },
  {
    id: "7",
    description: "Freelance Project",
    amount: 850,
    type: "income",
    category: "Freelance",
    group: "needs",
    date: "2024-01-09",
    icon: "💻"
  },
  {
    id: "8",
    description: "Gas Station",
    amount: -52.30,
    type: "expense",
    category: "Transportation",
    group: "needs",
    date: "2024-01-08",
    icon: "⛽"
  },
  {
    id: "9",
    description: "Emergency Fund",
    amount: -300,
    type: "saving",
    category: "Savings",
    group: "savings",
    date: "2024-01-07",
    icon: "🏦"
  },
  {
    id: "10",
    description: "Gym Membership",
    amount: -45,
    type: "expense",
    category: "Health",
    group: "wants",
    date: "2024-01-06",
    icon: "🏋️"
  }
]

export const summaryData = {
  totalIncome: 6050,
  totalExpenses: 2156.22,
  totalSaved: 800,
  currentBalance: 3893.78
}

export const budgetData = {
  needs: { spent: 2008.73, budget: 3025, percentage: 66 },
  wants: { spent: 148.49, budget: 1815, percentage: 8 },
  savings: { spent: 800, budget: 1210, percentage: 66 }
}

export const expensesByCategory = [
  { name: "Housing", value: 1800, color: "#F97316" },
  { name: "Groceries", value: 156.43, color: "#EC4899" },
  { name: "Transportation", value: 52.30, color: "#8B5CF6" },
  { name: "Entertainment", value: 15.99, color: "#22C55E" },
  { name: "Dining", value: 87.50, color: "#FACC15" },
  { name: "Health", value: 45, color: "#FB7185" }
]

export const expensesOverTime = [
  { month: "Aug", amount: 2100 },
  { month: "Sep", amount: 2450 },
  { month: "Oct", amount: 1980 },
  { month: "Nov", amount: 2680 },
  { month: "Dec", amount: 2340 },
  { month: "Jan", amount: 2156 }
]

export const budgetSplitData = [
  { name: "Needs", value: 50, amount: 2008.73, color: "#F97316" },
  { name: "Wants", value: 30, amount: 148.49, color: "#EC4899" },
  { name: "Savings", value: 20, amount: 800, color: "#8B5CF6" }
]

export const months = [
  "January 2024",
  "February 2024",
  "March 2024",
  "April 2024",
  "May 2024",
  "June 2024",
  "July 2024",
  "August 2024",
  "September 2024",
  "October 2024",
  "November 2024",
  "December 2024"
]

export const navigationItems = [
  { name: "Overview", icon: "LayoutDashboard", href: "/" },
  { name: "Transactions", icon: "ArrowLeftRight", href: "/transactions" },
  { name: "Categories", icon: "Folder", href: "/categories" },
  { name: "Budgets", icon: "PieChart", href: "/budgets" },
  { name: "Payments", icon: "CreditCard", href: "/payments" },
  { name: "Reports", icon: "BarChart3", href: "/reports" },
  { name: "Goals", icon: "Target", href: "/goals" },
  { name: "Settings", icon: "Settings", href: "/settings" }
]

export const mobileNavItems = [
  { name: "Overview", icon: "LayoutDashboard", href: "/" },
  { name: "Transactions", icon: "ArrowLeftRight", href: "/transactions" },
  { name: "Budgets", icon: "PieChart", href: "/budgets" },
  { name: "Reports", icon: "BarChart3", href: "/reports" },
  { name: "More", icon: "MoreHorizontal", href: "/more" }
]
