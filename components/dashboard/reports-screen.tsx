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

function getFallbackMonth(reportsData: ReportsData) {
  return {
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
}

function useReportsScreenData(reportsData: ReportsData, t: (key: string) => string) {
  const monthlyReports = reportsData.monthlyReports
  const currentMonth = monthlyReports[0] ?? getFallbackMonth(reportsData)
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

  return {
    monthlyReports,
    currentMonth,
    previousMonth,
    incomeChange,
    expenseChange,
    savingsChange,
    incomeVsExpensesData,
    netWorthData,
  }
}

function buildTransactionsCsvRows(
  reportsData: ReportsData,
  t: (key: string) => string,
) {
  return [
    ["Data", "Mes financeiro", "Tipo", "Descricao", "Categoria", "Forma de pagamento", "Valor"],
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
}

function downloadTransactionsCsv(reportsData: ReportsData, t: (key: string) => string) {
  const rows = buildTransactionsCsvRows(reportsData, t)
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n")
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `dragg-relatorio-${reportsData.selectedMonth}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function buildPdfReportText({
  reportsData,
  monthlyReports,
  formatCurrency,
  formatDate,
  t,
}: {
  reportsData: ReportsData
  monthlyReports: ReportsData["monthlyReports"]
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  t: (key: string) => string
}) {
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

  return [
    `Dragg - ${t("screen.reports.title")}`,
    "",
    t("screen.reports.breakdown"),
    ...summaryLines,
    "",
    t("screen.reports.allExpenses"),
    ...(expenseLines.length ? expenseLines : [t("screen.reports.noExpenses")]),
  ].join("\n")
}

function printPdfReport({
  reportsData,
  monthlyReports,
  formatCurrency,
  formatDate,
  t,
}: {
  reportsData: ReportsData
  monthlyReports: ReportsData["monthlyReports"]
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  t: (key: string) => string
}) {
  const reportText = buildPdfReportText({ reportsData, monthlyReports, formatCurrency, formatDate, t })
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

function useReportsScreenActions({
  reportsData,
  monthlyReports,
  formatCurrency,
  formatDate,
  t,
}: {
  reportsData: ReportsData
  monthlyReports: ReportsData["monthlyReports"]
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  t: (key: string) => string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handlePeriodChange(period: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", period)
    router.push(`${pathname}?${params.toString()}`)
  }

  return {
    handlePeriodChange,
    downloadCsv: () => downloadTransactionsCsv(reportsData, t),
    printPdfReport: () =>
      printPdfReport({ reportsData, monthlyReports, formatCurrency, formatDate, t }),
  }
}

function ReportsToolbarActions({
  periodMonths,
  onPeriodChange,
  onExportPdf,
  onExportCsv,
  t,
}: {
  periodMonths: number
  onPeriodChange: (period: string) => void
  onExportPdf: () => void
  onExportCsv: () => void
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={String(periodMonths)} onValueChange={onPeriodChange}>
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
          <DropdownMenuItem onSelect={onExportPdf}>
            <FileText className="size-4" />
            {t("screen.reports.exportPdf")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onExportCsv}>
            <FileSpreadsheet className="size-4" />
            {t("screen.reports.exportCsv")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function buildReportsSummaryCards({
  currentMonth,
  incomeChange,
  expenseChange,
  savingsChange,
  t,
}: {
  currentMonth: ReportsData["monthlyReports"][number]
  incomeChange: number
  expenseChange: number
  savingsChange: number
  t: (key: string) => string
}) {
  return [
    [t("dashboard.summary.totalIncome"), currentMonth.income, incomeChange, incomeChange >= 0] as const,
    [t("dashboard.summary.totalExpenses"), currentMonth.expenses, expenseChange, expenseChange <= 0] as const,
    [t("dashboard.summary.totalSaved"), currentMonth.savings, savingsChange, savingsChange >= 0] as const,
  ]
}

function ReportsChangeCards({
  currentMonth,
  incomeChange,
  expenseChange,
  savingsChange,
  formatCurrency,
  t,
}: {
  currentMonth: ReportsData["monthlyReports"][number]
  incomeChange: number
  expenseChange: number
  savingsChange: number
  formatCurrency: (value: number) => string
  t: (key: string) => string
}) {
  const cards = buildReportsSummaryCards({ currentMonth, incomeChange, expenseChange, savingsChange, t })

  return (
    <>
      {cards.map(([label, value, change, positive]) => (
        <Card key={label} className="border-border bg-card card-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(value)}</p>
            <div className={cn("mt-1 flex items-center gap-1 text-xs", positive ? "text-income" : "text-destructive")}>
              {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(change).toFixed(1)}% {t("screen.reports.vsLastMonth")}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function NetWorthCard({
  currentMonth,
  previousMonth,
  formatCurrency,
  t,
}: {
  currentMonth: ReportsData["monthlyReports"][number]
  previousMonth: ReportsData["monthlyReports"][number]
  formatCurrency: (value: number) => string
  t: (key: string) => string
}) {
  return (
    <Card className="border-border bg-card card-shadow">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{t("screen.reports.netWorth")}</p>
        <p className="mt-1 text-2xl font-bold text-income">{formatCurrency(currentMonth.netWorth)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatCurrency(currentMonth.netWorth - previousMonth.netWorth)} {t("screen.reports.thisMonth")}
        </p>
      </CardContent>
    </Card>
  )
}

function ReportsSummaryCards(props: {
  currentMonth: ReportsData["monthlyReports"][number]
  previousMonth: ReportsData["monthlyReports"][number]
  incomeChange: number
  expenseChange: number
  savingsChange: number
  formatCurrency: (value: number) => string
  t: (key: string) => string
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      <ReportsChangeCards {...props} />
      <NetWorthCard {...props} />
    </div>
  )
}

function IncomeVsExpensesChartCard({
  data,
  formatCurrency,
  t,
}: {
  data: ReturnType<typeof useReportsScreenData>["incomeVsExpensesData"]
  formatCurrency: (value: number) => string
  t: (key: string) => string
}) {
  return (
    <Card className="border-border bg-card card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{t("screen.reports.incomeVsExpenses")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 min-h-0 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 1, height: 288 }}
          >
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value) => formatCurrency(Number(value)).replace(/([,.]00|,00)$/, "")} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), ""]} />
              <Legend />
              <Bar dataKey="income" name={t("common.income")} fill="var(--income)" radius={[4, 4, 0, 0]} isAnimationActive animationBegin={0} animationDuration={500} animationEasing="ease-out" />
              <Bar dataKey="expenses" name={t("common.expense")} fill="var(--expense)" radius={[4, 4, 0, 0]} isAnimationActive animationBegin={100} animationDuration={500} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function NetWorthChartCard({
  data,
  formatCurrency,
  t,
}: {
  data: ReturnType<typeof useReportsScreenData>["netWorthData"]
  formatCurrency: (value: number) => string
  t: (key: string) => string
}) {
  return (
    <Card className="border-border bg-card card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{t("screen.reports.netWorthTrend")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 min-h-0 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 1, height: 288 }}
          >
            <AreaChart data={data}>
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
              <Area type="monotone" dataKey="netWorth" stroke="var(--primary)" strokeWidth={2} fill="url(#colorNetWorth)" isAnimationActive animationBegin={0} animationDuration={800} animationEasing="ease-in-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function MonthlyBreakdownRow({
  report,
  formatCurrency,
  t,
}: {
  report: ReportsData["monthlyReports"][number]
  formatCurrency: (value: number) => string
  t: (key: string) => string
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-accent/50">
      <td className="p-4 font-medium text-foreground">{t(report.monthKey)} {report.year}</td>
      <td className="p-4 text-right text-income">{formatCurrency(report.income)}</td>
      <td className="p-4 text-right text-expense">{formatCurrency(report.expenses)}</td>
      <td className="p-4 text-right text-savings">{formatCurrency(report.savings)}</td>
      <td className="p-4 text-right text-destructive">{formatCurrency(report.excessExpenses)}</td>
      <td className="p-4 text-right font-semibold text-foreground">{formatCurrency(report.netWorth)}</td>
    </tr>
  )
}

function MonthlyBreakdownTable({
  monthlyReports,
  formatCurrency,
  t,
}: {
  monthlyReports: ReportsData["monthlyReports"]
  formatCurrency: (value: number) => string
  t: (key: string) => string
}) {
  const headings = [
    t("screen.reports.month"),
    t("common.income"),
    t("common.expense"),
    t("common.saving"),
    t("screen.reports.excessExpenses"),
    t("screen.reports.netWorth"),
  ]

  return (
    <Card className="border-border bg-card card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{t("screen.reports.breakdown")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {headings.map((heading, index) => (
                  <th key={heading} className={cn("p-4 text-sm font-medium text-muted-foreground", index === 0 ? "text-left" : "text-right")}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyReports.map((report) => (
                <MonthlyBreakdownRow key={report.month} report={report} formatCurrency={formatCurrency} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReportsScreen({ reportsData }: ReportsScreenProps) {
  const { formatCurrency, formatDate, t } = useI18n()
  const {
    monthlyReports,
    currentMonth,
    previousMonth,
    incomeChange,
    expenseChange,
    savingsChange,
    incomeVsExpensesData,
    netWorthData,
  } = useReportsScreenData(reportsData, t)
  const { handlePeriodChange, downloadCsv, printPdfReport: onPrintPdfReport } =
    useReportsScreenActions({ reportsData, monthlyReports, formatCurrency, formatDate, t })

  return (
    <>
      <PageHeader
        title={t("screen.reports.title")}
        description={t("screen.reports.description")}
        actions={
          <ReportsToolbarActions
            periodMonths={reportsData.periodMonths}
            onPeriodChange={handlePeriodChange}
            onExportPdf={onPrintPdfReport}
            onExportCsv={downloadCsv}
            t={t}
          />
        }
      />

      <ReportsSummaryCards
        currentMonth={currentMonth}
        previousMonth={previousMonth}
        incomeChange={incomeChange}
        expenseChange={expenseChange}
        savingsChange={savingsChange}
        formatCurrency={formatCurrency}
        t={t}
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IncomeVsExpensesChartCard data={incomeVsExpensesData} formatCurrency={formatCurrency} t={t} />
        <NetWorthChartCard data={netWorthData} formatCurrency={formatCurrency} t={t} />
      </div>

      <MonthlyBreakdownTable monthlyReports={monthlyReports} formatCurrency={formatCurrency} t={t} />
    </>
  )
}
