"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DailyExpenseInput = {
  date: string;
  amount: number;
};

type DailyExpensesSplineChartProps = {
  expensesOverTime: DailyExpenseInput[];
  selectedMonth?: string;
  currency?: string;
  locale?: string;
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month, 0).getDate();
}

function getChartEndDay(selectedMonth: string) {
  const today = new Date();
  const currentMonth = getMonthKey(today);

  if (selectedMonth === currentMonth) {
    return today.getDate();
  }

  if (selectedMonth < currentMonth) {
    return getDaysInMonth(selectedMonth);
  }

  return 0;
}

function formatCurrency(value: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DailyExpensesSplineChart({
  expensesOverTime,
  selectedMonth,
  currency = "BRL",
  locale = "pt-BR",
}: DailyExpensesSplineChartProps) {
  const fallbackMonth = getMonthKey(new Date());
  const monthKey = selectedMonth ?? fallbackMonth;
  const endDay = getChartEndDay(monthKey);

  const expensesByDay = expensesOverTime.reduce<Record<number, number>>(
    (accumulator, expense) => {
      if (!expense.date.startsWith(monthKey)) {
        return accumulator;
      }

      const day = new Date(`${expense.date}T00:00:00`).getDate();

      accumulator[day] = (accumulator[day] ?? 0) + expense.amount;

      return accumulator;
    },
    {},
  );

  const chartData = Array.from({ length: endDay }, (_, index) => {
    const day = index + 1;
    const amount = expensesByDay[day] ?? 0;

    return {
      day,
      label: String(day).padStart(2, "0"),
      amount,
    };
  });

  const totalSpent = chartData.reduce((total, item) => total + item.amount, 0);
  const averagePerDay = endDay > 0 ? totalSpent / endDay : 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Daily spending</CardTitle>
            <CardDescription>
              Actual expenses by day in the selected month.
            </CardDescription>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Average/day</p>
            <p className="text-sm font-semibold">
              {formatCurrency(averagePerDay, locale, currency)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 8,
                right: 12,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="dailyExpensesFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="currentColor"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="95%"
                    stopColor="currentColor"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={72}
                className="text-xs"
                tickFormatter={(value) =>
                  formatCurrency(Number(value), locale, currency)
                }
              />

              <Tooltip
                cursor={{
                  strokeDasharray: "3 3",
                }}
                formatter={(value) => [
                  formatCurrency(Number(value), locale, currency),
                  "Spent",
                ]}
                labelFormatter={(label) => `Day ${label}`}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                }}
              />

              <Area
                type="monotone"
                dataKey="amount"
                stroke="currentColor"
                strokeWidth={2.5}
                fill="url(#dailyExpensesFill)"
                dot={false}
                activeDot={{
                  r: 5,
                }}
                className="text-primary"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Spent so far</p>
            <p className="font-semibold">
              {formatCurrency(totalSpent, locale, currency)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Days shown</p>
            <p className="font-semibold">{endDay}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
