"use client"

import { useMemo } from "react"

import { Download, FileSpreadsheet, FileText, TrendingDown, TrendingUp } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ReportsData } from "@/lib/finance/transactions"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type ReportsScreenProps = {
  reportsData: ReportsData
}

function getPercentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

function csvEscape(value: string | number | null) {
  const text = value == null ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function ReportsScreen({ reportsData }: ReportsScreenProps) {
  const { formatCurrency, formatDate, t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const monthlyReports = reportsData.monthlyReports
  const currentMonth = monthlyReports[0] ?? {
    excessExpenses: 0,
    expenses: 0,
    grossSavings: 0,
    income: 0,
    month: reportsData.selectedMonth,
    monthKey: "screen.reports.month",
    netWorth: 0,
    savings: 0,
    year: "",
  }
  const previousMonth = monthlyReports[1] ?? currentMonth
  const incomeChange = getPercentageChange(currentMonth.income, previousMonth.income)
  const expenseChange = getPercentageChange(currentMonth.expenses, previousMonth.expenses)
  const savingsChange = getPercentageChange(currentMonth.savings, previousMonth.savings)

  const incomeVsExpensesData = useMemo(
    () =>
      monthlyReports
        .map((report) => ({
          expenses: report.expenses,
          income: report.income,
          month: t(report.monthKey),
          savings: report.savings,
        }))
        .reverse(),
    [monthlyReports, t],
  )

  const netWorthData = useMemo(
    () =>
      monthlyReports
        .map((report) => ({
          month: t(report.monthKey),
          netWorth: report.netWorth,
        }))
        .reverse(),
    [monthlyReports, t],
  )

  function handlePeriodChange(period: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", period)
    router.push(`${pathname}?${params.toString()}`)
  }

  function downloadCsv() {
    const rows = [
      [
        "Data",
        "Mes financeiro",
        "Tipo",
        "Descricao",
        "Categoria",
        "Forma de pagamento",
        "Valor",
      ],
      ...reportsData.transactions.map((transaction) => [
        transaction.date,
        transaction.financialMonth,
        transaction.type,
        t(transaction.description),
        t(transaction.category),
        transaction.paymentMethod ? t(transaction.paymentMethod) : "",
        transaction.amount.toFixed(2),
      ]),
    ]
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n")
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `dragg-relatorio-${reportsData.selectedMonth}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function printPdfReport() {
    const expenseLines = reportsData.transactions
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) =>
        [
          formatDate(transaction.date),
          transaction.financialMonth,
          t(transaction.description),
          t(transaction.category),
          transaction.paymentMethod ? t(transaction.paymentMethod) : "-",
          formatCurrency(transaction.amount),
        ].join(" | "),
      )
    const summaryLines = monthlyReports.map((report) =>
      [
        `${t(report.monthKey)} ${report.year}`,
        `${t("common.income")}: ${formatCurrency(report.income)}`,
        `${t("common.expense")}: ${formatCurrency(report.expenses)}`,
        `${t("common.saving")}: ${formatCurrency(report.savings)}`,
        `${t("screen.reports.netWorth")}: ${formatCurrency(report.netWorth)}`,
      ].join(" | "),
    )
    const reportText = [
      `Dragg - ${t("screen.reports.title")}`,
      "",
      t("screen.reports.breakdown"),
      ...summaryLines,
      "",
      t("screen.reports.allExpenses"),
      ...(expenseLines.length ? expenseLines : [t("screen.reports.noExpenses")]),
    ].join("\n")
    const printWindow = window.open("", "_blank")

    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Dragg - ${escapeHtml(t("screen.reports.title"))}</title>
          <style>
            body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 32px; color: #111; }
            pre { white-space: pre-wrap; line-height: 1.5; font-size: 12px; }
          </style>
        </head>
        <body>
          <pre>${escapeHtml(reportText)}</pre>
          <script>window.onload = () => window.print()</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <>
      <PageHeader
        title={t("screen.reports.title")}
        description={t("screen.reports.description")}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={String(reportsData.periodMonths)}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("screen.reports.period")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("screen.reports.lastMonth")}</SelectItem>
                <SelectItem value="3">{t("screen.reports.lastThreeMonths")}</SelectItem>
                <SelectItem value="6">{t("screen.reports.lastSixMonths")}</SelectItem>
                <SelectItem value="12">{t("screen.reports.lastYear")}</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="size-4" />
                  {t("screen.reports.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={printPdfReport}>
                  <FileText className="size-4" />
                  {t("screen.reports.exportPdf")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={downloadCsv}>
                  <FileSpreadsheet className="size-4" />
                  {t("screen.reports.exportCsv")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              {formatCurrency(currentMonth.netWorth - previousMonth.netWorth)} {t("screen.reports.thisMonth")}
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
                  <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), ""]} />
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
                  <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), t("screen.reports.netWorth")]} />
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
                  {[
                    t("screen.reports.month"),
                    t("common.income"),
                    t("common.expense"),
                    t("common.saving"),
                    t("screen.reports.excessExpenses"),
                    t("screen.reports.netWorth"),
                  ].map((heading, index) => (
                    <th key={heading} className={cn("p-4 text-sm font-medium text-muted-foreground", index === 0 ? "text-left" : "text-right")}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyReports.map((report) => (
                  <tr key={report.month} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="p-4 font-medium text-foreground">{t(report.monthKey)} {report.year}</td>
                    <td className="p-4 text-right text-income">{formatCurrency(report.income)}</td>
                    <td className="p-4 text-right text-expense">{formatCurrency(report.expenses)}</td>
                    <td className="p-4 text-right text-savings">{formatCurrency(report.savings)}</td>
                    <td className="p-4 text-right text-destructive">{formatCurrency(report.excessExpenses)}</td>
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
