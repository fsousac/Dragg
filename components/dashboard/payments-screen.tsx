"use client"

import { Calendar, MoreVertical, Pause, Play, Plus, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { payments } from "@/lib/data"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function PaymentsScreen() {
  const { formatCurrency, formatDate, t } = useI18n()
  const activePayments = payments.filter((payment) => payment.status === "active")
  const pausedPayments = payments.filter((payment) => payment.status === "paused")
  const monthlyTotal = activePayments
    .filter((payment) => payment.frequency === "monthly")
    .reduce((acc, payment) => acc + payment.amount, 0)
  const yearlyTotal = activePayments
    .filter((payment) => payment.frequency === "yearly")
    .reduce((acc, payment) => acc + payment.amount, 0)

  const statusColor = {
    active: "bg-income text-white",
    cancelled: "bg-destructive text-white",
    paused: "bg-yellow text-black",
  }

  return (
    <>
      <PageHeader
        title={t("screen.payments.title")}
        description={t("screen.payments.description")}
        actions={
          <Button className="gap-2">
            <Plus className="size-4" />
            {t("screen.payments.addSubscription")}
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          [t("screen.payments.monthlySubscriptions"), formatCurrency(monthlyTotal), `${activePayments.filter((payment) => payment.frequency === "monthly").length} ${t("common.active")}`],
          [t("screen.payments.yearlySubscriptions"), formatCurrency(yearlyTotal), `${formatCurrency(yearlyTotal / 12)}/${t("screen.payments.monthlyAverage")}`],
          [t("screen.payments.annualCost"), formatCurrency(monthlyTotal * 12 + yearlyTotal), t("screen.payments.combined")],
        ].map(([label, value, note]) => (
          <Card key={label} className="border-border bg-card card-shadow">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6 border-border bg-card card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">{t("screen.payments.activeSubscriptions")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {activePayments.map((payment) => (
              <div key={payment.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
                <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-2xl">
                  {payment.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{payment.name}</p>
                    <Badge variant="secondary" className={cn("text-xs", statusColor[payment.status])}>
                      {t(`common.${payment.status}`)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{t(payment.categoryKey)}</span>
                    <span>·</span>
                    <span>{t(`data.frequency.${payment.frequency}`)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                  <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    {t("common.next")}: {formatDate(payment.nextDate, { day: "numeric", month: "short" })}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pause className="mr-2 size-4" />
                      {t("common.pause")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 size-4" />
                      {t("common.cancel")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pausedPayments.length > 0 && (
        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("screen.payments.pausedSubscriptions")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {pausedPayments.map((payment) => (
                <div key={payment.id} className="flex items-center gap-4 p-4 opacity-70 transition-opacity hover:opacity-100">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-2xl">
                    {payment.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{payment.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t(payment.categoryKey)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">{t(`data.frequency.${payment.frequency}`)}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Play className="size-3" />
                    {t("common.resume")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

