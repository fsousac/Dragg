"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart } from "recharts"
import { expensesOverTime } from "@/lib/data"
import { useI18n } from "@/lib/i18n"

export function ExpensesOverTimeChart() {
  const { formatCurrency, t } = useI18n()
  const chartData = expensesOverTime.map((item) => ({
    ...item,
    month: t(item.monthKey),
  }))

  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
          {t("dashboard.expensesOverTime.title")}
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          {t("dashboard.expensesOverTime.description")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] lg:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#A1A1AA', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#A1A1AA', fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(Number(value)).replace(/([,.]00|,00)$/, "")}
                width={60}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {formatCurrency(Number(payload[0].value))}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#expenseGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
