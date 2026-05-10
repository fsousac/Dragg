"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { type ExpensesOverTimeItem } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

type ExpensesOverTimeChartProps = {
  expensesOverTime: ExpensesOverTimeItem[];
};

export function ExpensesOverTimeChart({
  expensesOverTime,
}: ExpensesOverTimeChartProps) {
  const { formatCurrency, t } = useI18n();
  const chartData = useMemo(
    () => expensesOverTime.map((item) => ({ ...item, month: t(item.monthKey) })),
    [expensesOverTime, t],
  );
  const hasData = useMemo(
    () => chartData.some((item) => item.amount > 0),
    [chartData],
  );

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
        <div className="h-[200px] min-h-0 min-w-0 lg:h-[240px]">
          {hasData ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              initialDimension={{ width: 1, height: 200 }}
            >
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="expenseGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
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
                  tick={{ fill: "#A1A1AA", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#A1A1AA", fontSize: 12 }}
                  tickFormatter={(value) =>
                    formatCurrency(Number(value)).replace(/([,.]00|,00)$/, "")
                  }
                  width={60}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as {
                        amount?: number;
                        plannedAmount?: number;
                      };
                      const spentAmount = Number(data.amount ?? 0);
                      const plannedAmount = Number(data.plannedAmount ?? 0);

                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                          <p className="text-sm font-medium text-foreground">
                            {label}
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex min-w-40 items-center justify-between gap-4 text-sm">
                              <span className="text-muted-foreground">
                                {t("common.spent")}
                              </span>
                              <span className="font-semibold text-primary">
                                {formatCurrency(spentAmount)}
                              </span>
                            </div>
                            <div className="flex min-w-40 items-center justify-between gap-4 text-sm">
                              <span className="text-muted-foreground">
                                {t("common.planned")}
                              </span>
                              <span className="font-semibold text-rose-400">
                                {formatCurrency(plannedAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#expenseGradient)"
                />
                {chartData.some(
                  (d) => d.plannedAmount && d.plannedAmount > 0,
                ) ? (
                  <Area
                    type="monotone"
                    dataKey="plannedAmount"
                    stroke="#FB7185"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={0}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
              {t("common.noDataForPeriod")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
