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

// Categories data
export interface Category {
  id: string
  name: string
  icon: string
  color: string
  group: TransactionGroup
  budget: number
  spent: number
}

export const categories: Category[] = [
  { id: "1", name: "Housing", icon: "🏠", color: "#F97316", group: "needs", budget: 2000, spent: 1800 },
  { id: "2", name: "Groceries", icon: "🛒", color: "#22C55E", group: "needs", budget: 400, spent: 156.43 },
  { id: "3", name: "Transportation", icon: "🚗", color: "#8B5CF6", group: "needs", budget: 300, spent: 52.30 },
  { id: "4", name: "Utilities", icon: "💡", color: "#FACC15", group: "needs", budget: 200, spent: 145 },
  { id: "5", name: "Entertainment", icon: "📺", color: "#EC4899", group: "wants", budget: 150, spent: 15.99 },
  { id: "6", name: "Dining", icon: "🍽️", color: "#FB7185", group: "wants", budget: 200, spent: 87.50 },
  { id: "7", name: "Shopping", icon: "🛍️", color: "#14B8A6", group: "wants", budget: 300, spent: 45 },
  { id: "8", name: "Health", icon: "🏋️", color: "#6366F1", group: "needs", budget: 100, spent: 45 },
  { id: "9", name: "Investments", icon: "📈", color: "#22C55E", group: "savings", budget: 500, spent: 500 },
  { id: "10", name: "Emergency Fund", icon: "🏦", color: "#F59E0B", group: "savings", budget: 300, spent: 300 },
  { id: "11", name: "Salary", icon: "💼", color: "#22C55E", group: "needs", budget: 0, spent: 0 },
  { id: "12", name: "Freelance", icon: "💻", color: "#8B5CF6", group: "needs", budget: 0, spent: 0 }
]

// Goals data
export interface Goal {
  id: string
  name: string
  icon: string
  targetAmount: number
  currentAmount: number
  deadline: string
  color: string
}

export const goals: Goal[] = [
  { id: "1", name: "Emergency Fund", icon: "🏦", targetAmount: 10000, currentAmount: 6500, deadline: "2024-12-31", color: "#22C55E" },
  { id: "2", name: "Vacation Trip", icon: "✈️", targetAmount: 3000, currentAmount: 1200, deadline: "2024-08-01", color: "#8B5CF6" },
  { id: "3", name: "New Car", icon: "🚗", targetAmount: 25000, currentAmount: 8500, deadline: "2025-06-01", color: "#F97316" },
  { id: "4", name: "Home Down Payment", icon: "🏠", targetAmount: 50000, currentAmount: 12000, deadline: "2026-01-01", color: "#EC4899" }
]

// Payments/Subscriptions data
export interface Payment {
  id: string
  name: string
  icon: string
  amount: number
  frequency: "monthly" | "yearly" | "weekly"
  nextDate: string
  category: string
  status: "active" | "paused" | "cancelled"
}

export const payments: Payment[] = [
  { id: "1", name: "Netflix", icon: "📺", amount: 15.99, frequency: "monthly", nextDate: "2024-02-13", category: "Entertainment", status: "active" },
  { id: "2", name: "Spotify", icon: "🎵", amount: 9.99, frequency: "monthly", nextDate: "2024-02-15", category: "Entertainment", status: "active" },
  { id: "3", name: "Gym Membership", icon: "🏋️", amount: 45, frequency: "monthly", nextDate: "2024-02-06", category: "Health", status: "active" },
  { id: "4", name: "Amazon Prime", icon: "📦", amount: 139, frequency: "yearly", nextDate: "2024-06-20", category: "Shopping", status: "active" },
  { id: "5", name: "iCloud Storage", icon: "☁️", amount: 2.99, frequency: "monthly", nextDate: "2024-02-01", category: "Technology", status: "active" },
  { id: "6", name: "Adobe Creative", icon: "🎨", amount: 54.99, frequency: "monthly", nextDate: "2024-02-10", category: "Work", status: "paused" }
]

// Reports data
export const monthlyReports = [
  { month: "Jan 2024", income: 6050, expenses: 2156.22, savings: 800, netWorth: 45000 },
  { month: "Dec 2023", income: 5800, expenses: 2340, savings: 600, netWorth: 41356 },
  { month: "Nov 2023", income: 5950, expenses: 2680, savings: 500, netWorth: 37296 },
  { month: "Oct 2023", income: 5700, expenses: 1980, savings: 700, netWorth: 33526 },
  { month: "Sep 2023", income: 5650, expenses: 2450, savings: 550, netWorth: 30106 },
  { month: "Aug 2023", income: 5500, expenses: 2100, savings: 600, netWorth: 26506 }
]

// Format date helper
export function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(amount)
}
