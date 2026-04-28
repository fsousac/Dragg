"use client"

import { Download, TrendingUp, TrendingDown } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from "recharts"
import { monthlyReports, expensesByCategory, formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function ReportsPage() {
  const currentMonth = monthlyReports[0]
  const previousMonth = monthlyReports[1]

  const incomeChange = ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100
  const expenseChange = ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100
  const savingsChange = ((currentMonth.savings - previousMonth.savings) / previousMonth.savings) * 100

  const incomeVsExpensesData = monthlyReports.map(m => ({
    month: m.month.split(" ")[0],
    income: m.income,
    expenses: m.expenses,
    savings: m.savings
  })).reverse()

  const netWorthData = monthlyReports.map(m => ({
    month: m.month.split(" ")[0],
    netWorth: m.netWorth
  })).reverse()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col pb-20 lg:pb-0">
        <Header />
        
        <main className="flex-1 px-4 lg:px-8 py-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Reports</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Analyze your financial performance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select defaultValue="6months">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(currentMonth.income)}
                </p>
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  incomeChange >= 0 ? "text-income" : "text-destructive"
                )}>
                  {incomeChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(incomeChange).toFixed(1)}% vs last month
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(currentMonth.expenses)}
                </p>
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  expenseChange <= 0 ? "text-income" : "text-destructive"
                )}>
                  {expenseChange <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {Math.abs(expenseChange).toFixed(1)}% vs last month
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Savings</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(currentMonth.savings)}
                </p>
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  savingsChange >= 0 ? "text-income" : "text-destructive"
                )}>
                  {savingsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(savingsChange).toFixed(1)}% vs last month
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Net Worth</p>
                <p className="text-2xl font-bold text-income mt-1">
                  {formatCurrency(currentMonth.netWorth)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  +{formatCurrency(currentMonth.netWorth - previousMonth.netWorth)} this month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Income vs Expenses Chart */}
            <Card className="bg-card border-border card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeVsExpensesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="month" 
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickFormatter={(v) => `$${v/1000}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), ""]}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="var(--income)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="var(--expense)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Net Worth Trend */}
            <Card className="bg-card border-border card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Net Worth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={netWorthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="month" 
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickFormatter={(v) => `$${v/1000}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Net Worth"]}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <defs>
                        <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="netWorth" 
                        stroke="var(--primary)" 
                        strokeWidth={2}
                        fill="url(#colorNetWorth)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown Table */}
          <Card className="bg-card border-border card-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Month</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Income</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Expenses</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Savings</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReports.map((report, index) => (
                      <tr key={report.month} className="border-b border-border last:border-0 hover:bg-accent/50">
                        <td className="p-4 font-medium text-foreground">{report.month}</td>
                        <td className="p-4 text-right text-income">{formatCurrency(report.income)}</td>
                        <td className="p-4 text-right text-expense">{formatCurrency(report.expenses)}</td>
                        <td className="p-4 text-right text-savings">{formatCurrency(report.savings)}</td>
                        <td className="p-4 text-right font-semibold text-foreground">{formatCurrency(report.netWorth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>

        <MobileNav />
      </div>
    </div>
  )
}
