"use client"

import { Calendar, Plus, TrendingUp } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { goals, type Goal } from "@/lib/data"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function GoalsScreen() {
  const { formatCurrency, t } = useI18n()
  const totalTarget = goals.reduce((acc, goal) => acc + goal.targetAmount, 0)
  const totalCurrent = goals.reduce((acc, goal) => acc + goal.currentAmount, 0)
  const overallProgress = Math.round((totalCurrent / totalTarget) * 100)

  const getDaysRemaining = (deadline: string) => {
    const diffTime = new Date(deadline).getTime() - Date.now()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getMonthlyNeeded = (goal: Goal) => {
    const remaining = goal.targetAmount - goal.currentAmount
    const monthsRemaining = Math.max(1, Math.ceil(getDaysRemaining(goal.deadline) / 30))
    return remaining / monthsRemaining
  }

  return (
    <>
      <PageHeader
        title={t("screen.goals.title")}
        description={t("screen.goals.description")}
        actions={
          <Button className="gap-2">
            <Plus className="size-4" />
            {t("screen.goals.newGoal")}
          </Button>
        }
      />

      <Card className="mb-6 border-border bg-card card-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-muted-foreground">{t("screen.goals.overallProgress")}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {formatCurrency(totalCurrent)}{" "}
                <span className="text-lg font-normal text-muted-foreground">/ {formatCurrency(totalTarget)}</span>
              </p>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
                <p className="text-sm text-muted-foreground">{t("common.complete")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{goals.length}</p>
                <p className="text-sm text-muted-foreground">{t("screen.goals.activeGoals")}</p>
              </div>
            </div>
          </div>
          <Progress value={overallProgress} className="mt-4 h-3" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {goals.map((goal) => {
          const percentage = Math.round((goal.currentAmount / goal.targetAmount) * 100)
          const daysRemaining = getDaysRemaining(goal.deadline)
          const monthlyNeeded = getMonthlyNeeded(goal)
          const isCloseToDeadline = daysRemaining < 90
          const isOnTrack = percentage >= 100 - (daysRemaining / 365) * 100

          return (
            <Card key={goal.id} className="overflow-hidden border-border bg-card card-shadow">
              <div className="h-2" style={{ backgroundColor: goal.color }} />
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-14 items-center justify-center rounded-lg text-3xl"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      {goal.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{t(goal.nameKey)}</h3>
                      <Badge variant="secondary" className={cn("mt-1 text-xs", isOnTrack ? "bg-income/20 text-income" : "bg-yellow/20 text-yellow")}>
                        {isOnTrack ? t("common.onTrack") : t("common.behind")}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">{percentage}%</p>
                    <p className="text-xs text-muted-foreground">{t("common.complete")}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("screen.goals.progress")}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <div
                      className="overflow-hidden rounded-full bg-secondary"
                      style={{
                        // @ts-expect-error CSS variable
                        "--progress-foreground": goal.color,
                      }}
                    >
                      <Progress value={percentage} className="h-3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t("screen.goals.deadline")}</p>
                        <p className={cn("text-sm font-medium", isCloseToDeadline ? "text-yellow" : "text-foreground")}>
                          {daysRemaining > 0 ? `${daysRemaining}d ${t("common.left")}` : t("common.overdue")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t("screen.goals.monthlyNeeded")}</p>
                        <p className="text-sm font-medium text-foreground">{formatCurrency(monthlyNeeded)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" size="sm">
                      {t("screen.goals.editGoal")}
                    </Button>
                    <Button className="flex-1" size="sm" style={{ backgroundColor: goal.color }}>
                      {t("common.addFunds")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

