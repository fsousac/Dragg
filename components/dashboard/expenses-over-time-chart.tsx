"use client";

import { useMemo } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

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
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/lib/i18n";

type ExpensesOverTimeChartProps = {
  expensesOverTime: ExpensesOverTimeItem[];
};

export function ExpensesOverTimeChart({
  expensesOverTime,
}: ExpensesOverTimeChartProps) {
  const { formatCurrency, t } = useI18n();
  const chartData = useMemo(
    () =>
      expensesOverTime.map((item) => ({ ...item, month: t(item.monthKey) })),
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
        <div className="h-50 min-h-0 min-w-0 lg:h-60">
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

type DailyExpenseInput = {
  amount: number;
  date: string;
};

type DailyExpensesSplineChartProps = {
  dailyExpensesOverTime: DailyExpenseInput[];
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

function formatCurrency(
  value: number,
  locale: string,
  currency: string,
  precision: number = 0,
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: precision,
  }).format(value);
}

export function DailyExpensesSplineChart({
  dailyExpensesOverTime,
  selectedMonth,
  currency = "BRL",
  locale = "pt-BR",
}: DailyExpensesSplineChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const fallbackMonth = getMonthKey(new Date());
  const monthKey = selectedMonth ?? fallbackMonth;
  const endDay = getChartEndDay(monthKey);

  const expensesByDay = dailyExpensesOverTime.reduce<Record<number, number>>(
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
  const hasData = chartData.some((item) => item.amount > 0);
  const xTickStep = isMobile ? 5 : 2;
  const xTicks = useMemo(() => {
    if (endDay < 1) {
      return [] as number[];
    }

    const ticks: number[] = [];
    for (let day = 1; day <= endDay; day += xTickStep) {
      ticks.push(day);
    }

    return ticks;
  }, [endDay, xTickStep]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">
              {t("dashboard.dailyExpenses.title")}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("dashboard.dailyExpenses.description")}
            </CardDescription>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">
              {t("dashboard.dailyExpenses.averagePerDay")}
            </p>
            <p className="text-sm font-semibold">
              {formatCurrency(averagePerDay, locale, currency, 2)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-60 min-h-0 min-w-0 sm:h-72">
          {hasData ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              initialDimension={{ width: 1, height: 200 }}
            >
              <AreaChart
                data={chartData}
                margin={{
                  top: 8,
                  right: isMobile ? 4 : 12,
                  left: isMobile ? -8 : 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="dailyExpensesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="currentColor"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="currentColor"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-border"
                />

                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, endDay || 1]}
                  ticks={xTicks}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  className="text-xs"
                  tickFormatter={(value) =>
                    String(Number(value)).padStart(2, "0")
                  }
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  width={isMobile ? 56 : 72}
                  tickCount={isMobile ? 4 : 5}
                  className="text-xs"
                  tickFormatter={(value) =>
                    formatCurrency(Number(value), locale, currency)
                  }
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const data = payload[0].payload as {
                      amount?: number;
                      day?: number;
                    };
                    const day = Number(data.day ?? 0);
                    const amount = Number(data.amount ?? 0);

                    return (
                      <div className="bg-card border border-border rounded-lg p-2.5 shadow-xl sm:p-3">
                        <p className="text-sm font-medium text-foreground">
                          {t("dashboard.dailyExpenses.day")} {day}
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex min-w-32 items-center justify-between gap-3 text-sm sm:min-w-40">
                            <span className="text-muted-foreground">
                              {t("common.spent")}
                            </span>
                            <span className="font-semibold text-primary">
                              {formatCurrency(amount, locale, currency, 2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  fill="url(#dailyExpensesGradient)"
                  dot={false}
                  activeDot={{
                    r: 5,
                  }}
                  className="text-primary"
                />
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
