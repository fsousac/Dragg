"use client"

import { Download, TrendingDown, TrendingUp } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { monthlyReports } from "@/lib/data"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function ReportsScreen() {
  const { formatCurrency, t } = useI18n()
  const currentMonth = monthlyReports[0]
  const previousMonth = monthlyReports[1]
  const incomeChange = ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100
  const expenseChange = ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100
  const savingsChange = ((currentMonth.savings - previousMonth.savings) / previousMonth.savings) * 100

  const incomeVsExpensesData = monthlyReports
    .map((report) => ({
      expenses: report.expenses,
      income: report.income,
      month: t(report.monthKey),
      savings: report.savings,
    }))
    .reverse()

  const netWorthData = monthlyReports
    .map((report) => ({
      month: t(report.monthKey),
      netWorth: report.netWorth,
    }))
    .reverse()

  return (
    <>
      <PageHeader
        title={t("screen.reports.title")}
        description={t("screen.reports.description")}
        actions={
          <div className="flex items-center gap-3">
            <Select defaultValue="6months">
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("screen.reports.period")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">{t("screen.reports.lastMonth")}</SelectItem>
                <SelectItem value="3months">{t("screen.reports.lastThreeMonths")}</SelectItem>
                <SelectItem value="6months">{t("screen.reports.lastSixMonths")}</SelectItem>
                <SelectItem value="1year">{t("screen.reports.lastYear")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="size-4" />
              {t("screen.reports.export")}
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          [t("dashboard.summary.totalIncome"), currentMonth.income, incomeChange, incomeChange >= 0],
          [t("dashboard.summary.totalExpenses"), currentMonth.expenses, expenseChange, expenseChange <= 0],
          [t("dashboard.summary.totalSaved"), currentMonth.savings, savingsChange, savingsChange >= 0],
        ].map(([label, value, change, positive]) => (
          <Card key={String(label)} className="border-border bg-card card-shadow">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(Number(value))}</p>
              <div className={cn("mt-1 flex items-center gap-1 text-xs", positive ? "text-income" : "text-destructive")}>
                {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {Math.abs(Number(change)).toFixed(1)}% {t("screen.reports.vsLastMonth")}
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="border-border bg-card card-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("screen.reports.netWorth")}</p>
            <p className="mt-1 text-2xl font-bold text-income">{formatCurrency(currentMonth.netWorth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              +{formatCurrency(currentMonth.netWorth - previousMonth.netWorth)} {t("screen.reports.thisMonth")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("screen.reports.incomeVsExpenses")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpensesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value) => formatCurrency(Number(value)).replace(/([,.]00|,00)$/, "")} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), ""]} />
                  <Legend />
                  <Bar dataKey="income" name={t("common.income")} fill="var(--income)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name={t("common.expense")} fill="var(--expense)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("screen.reports.netWorthTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value) => formatCurrency(Number(value)).replace(/([,.]00|,00)$/, "")} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), t("screen.reports.netWorth")]} />
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="netWorth" stroke="var(--primary)" strokeWidth={2} fill="url(#colorNetWorth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">{t("screen.reports.breakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[t("screen.reports.month"), t("common.income"), t("common.expense"), t("common.saving"), t("screen.reports.netWorth")].map((heading, index) => (
                    <th key={heading} className={cn("p-4 text-sm font-medium text-muted-foreground", index === 0 ? "text-left" : "text-right")}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyReports.map((report) => (
                  <tr key={`${report.monthKey}-${report.year}`} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="p-4 font-medium text-foreground">{t(report.monthKey)} {report.year}</td>
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
    </>
  )
}

