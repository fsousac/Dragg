"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { budgetSplitData } from "@/lib/data"

export function BudgetSplitChart() {
  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
          50/30/20 Budget Split
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          Monthly allocation by category
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] lg:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={budgetSplitData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {budgetSplitData.map((entry, index) => (
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
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                        <p className="text-sm font-medium text-foreground">{data.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${data.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.value}% of budget
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                content={({ payload }) => (
                  <div className="flex justify-center gap-4 mt-4">
                    {payload?.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-muted-foreground">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
