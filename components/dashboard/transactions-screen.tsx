"use client"

import { useMemo, useState } from "react"
import { ArrowDownRight, ArrowUpRight, Plus, Search, Wallet } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Transaction } from "@/lib/data"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type TransactionsScreenProps = {
  transactions: Transaction[]
}

export function TransactionsScreen({ transactions }: TransactionsScreenProps) {
  const { formatCurrency, formatDate, t } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const uniqueCategories = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.categoryKey))],
    [transactions],
  )

  const filteredTransactions = transactions.filter((transaction) => {
    const description = t(transaction.descriptionKey).toLowerCase()
    const category = t(transaction.categoryKey).toLowerCase()
    const query = searchQuery.toLowerCase()

    return (
      (description.includes(query) || category.includes(query)) &&
      (typeFilter === "all" || transaction.type === typeFilter) &&
      (categoryFilter === "all" || transaction.categoryKey === categoryFilter)
    )
  })

  return (
    <>
      <PageHeader
        title={t("screen.transactions.title")}
        description={t("screen.transactions.description")}
        actions={
          <Button className="gap-2">
            <Plus className="size-4" />
            {t("screen.transactions.add")}
          </Button>
        }
      />

      <Card className="mb-6 border-border bg-card card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder={t("screen.transactions.search")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("common.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allTypes")}</SelectItem>
                <SelectItem value="income">{t("common.income")}</SelectItem>
                <SelectItem value="expense">{t("common.expense")}</SelectItem>
                <SelectItem value="saving">{t("common.saving")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("common.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allCategories")}</SelectItem>
                {uniqueCategories.map((categoryKey) => (
                  <SelectItem key={categoryKey} value={categoryKey}>
                    {t(categoryKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {filteredTransactions.length} {t("screen.transactions.count")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-2xl">
                  {transaction.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {t(transaction.descriptionKey)}
                    </p>
                    {transaction.type === "income" && <ArrowUpRight className="size-4 shrink-0 text-income" />}
                    {transaction.type === "expense" && <ArrowDownRight className="size-4 shrink-0 text-expense" />}
                    {transaction.type === "saving" && <Wallet className="size-4 shrink-0 text-savings" />}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {t(transaction.categoryKey)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transaction.date, { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
                <p
                  className={cn(
                    "tabular-nums font-semibold",
                    transaction.amount > 0 ? "text-income" : "text-foreground",
                  )}
                >
                  {transaction.amount > 0 ? "+" : ""}
                  {formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
