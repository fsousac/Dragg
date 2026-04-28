"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { expensesByCategory } from "@/lib/data"
import { useI18n } from "@/lib/i18n"

export function ExpensesByCategoryChart() {
  const { formatCurrency, t } = useI18n()
  const chartData = expensesByCategory.map((item) => ({
    ...item,
    name: t(item.nameKey),
  }))
  const total = expensesByCategory.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
          {t("dashboard.expensesByCategory.title")}
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          {t("dashboard.expensesByCategory.description")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="h-[160px] lg:h-[200px] w-full lg:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="stroke-card stroke-2"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      const percentage = ((data.value / total) * 100).toFixed(1)
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                          <p className="text-sm font-medium text-foreground">{data.name}</p>
                          <p className="text-lg font-bold text-foreground mt-1">
                            {formatCurrency(data.value)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {percentage}% {t("common.ofTotal")}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full lg:w-1/2">
            {chartData.map((category) => (
              <div key={category.nameKey} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{category.name}</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(category.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
