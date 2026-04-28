"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { budgetData } from "@/lib/data"

const budgets = [
  {
    name: "Needs",
    ...budgetData.needs,
    color: "#F97316",
    bgColor: "bg-[#F97316]"
  },
  {
    name: "Wants",
    ...budgetData.wants,
    color: "#EC4899",
    bgColor: "bg-[#EC4899]"
  },
  {
    name: "Savings",
    ...budgetData.savings,
    color: "#8B5CF6",
    bgColor: "bg-[#8B5CF6]"
  }
]

export function BudgetProgress() {
  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
          Budget Progress
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          Monthly spending by category
        </p>
      </CardHeader>
      <CardContent className="space-y-4 lg:space-y-6">
        {budgets.map((budget) => (
          <div key={budget.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: budget.color }}
                />
                <span className="text-sm font-medium text-foreground">{budget.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-foreground">
                  ${budget.spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  / ${budget.budget.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress
                value={budget.percentage}
                className="h-2 lg:h-3 bg-accent"
                style={{
                  // @ts-expect-error CSS variable
                  "--progress-foreground": budget.color
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {budget.percentage}% used
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
