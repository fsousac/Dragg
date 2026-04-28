"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { expensesByCategory } from "@/lib/data"

export function ExpensesByCategoryChart() {
  const total = expensesByCategory.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
          Expenses by Category
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          Where your money goes
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="h-[160px] lg:h-[200px] w-full lg:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
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
                            ${data.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {percentage}% of total
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
            {expensesByCategory.map((category) => (
              <div key={category.name} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{category.name}</p>
                  <p className="text-sm font-medium text-foreground">
                    ${category.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
