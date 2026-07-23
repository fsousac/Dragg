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
  readonly expensesOverTime: ExpensesOverTimeItem[];
};

type MonthlyChartItem = ExpensesOverTimeItem & { month: string };

function NoDataMessage({ t }: { readonly t: (key: string) => string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
      {t("common.noDataForPeriod")}
    </div>
  );
}

type ExpensesOverTimeTooltipProps = {
  readonly active?: boolean;
  readonly formatCurrency: (value: number) => string;
  readonly label?: string;
  readonly payload?: Array<{
    payload: { amount?: number; plannedAmount?: number };
  }>;
  readonly t: (key: string) => string;
};

function ExpensesOverTimeTooltip({
  active,
  formatCurrency,
  label,
  payload,
  t,
}: ExpensesOverTimeTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;
  const spentAmount = Number(data.amount ?? 0);
  const plannedAmount = Number(data.plannedAmount ?? 0);

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="mt-2 space-y-1">
        <div className="flex min-w-40 items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{t("common.spent")}</span>
          <span className="font-semibold text-primary">
            {formatCurrency(spentAmount)}
          </span>
        </div>
        <div className="flex min-w-40 items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{t("common.planned")}</span>
          <span className="font-semibold text-muted-foreground">
            {formatCurrency(plannedAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}

type ExpensesOverTimeAreaChartProps = {
  readonly chartData: MonthlyChartItem[];
  readonly formatCurrency: (value: number) => string;
  readonly plannedColor: string;
  readonly t: (key: string) => string;
  readonly usedColor: string;
};

function ExpenseAreaGradientDef() {
  return (
    <defs>
      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

const EXPENSES_OVER_TIME_RESPONSIVE_PROPS = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  initialDimension: { width: 1, height: 200 },
} as const;
const EXPENSES_OVER_TIME_AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
const EXPENSES_OVER_TIME_AREA_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: "ease-in-out" as const,
};

function formatExpensesOverTimeTick(value: number | string, formatCurrency: (value: number) => string) {
  return formatCurrency(Number(value)).replace(/([,.]00|,00)$/, "");
}

function ExpensesOverTimeAreaChart({
  chartData,
  formatCurrency,
  plannedColor,
  t,
  usedColor,
}: ExpensesOverTimeAreaChartProps) {
  const hasPlannedAmount = chartData.some(
    (d) => d.plannedAmount && d.plannedAmount > 0,
  );

  return (
    <ResponsiveContainer {...EXPENSES_OVER_TIME_RESPONSIVE_PROPS}>
      <AreaChart data={chartData}>
        <ExpenseAreaGradientDef />
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={EXPENSES_OVER_TIME_AXIS_TICK} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={EXPENSES_OVER_TIME_AXIS_TICK}
          tickFormatter={(value) => formatExpensesOverTimeTick(value, formatCurrency)}
          width={60}
        />
        <Tooltip content={<ExpensesOverTimeTooltip formatCurrency={formatCurrency} t={t} />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={usedColor}
          strokeWidth={2}
          fill="url(#expenseGradient)"
          animationBegin={0}
          {...EXPENSES_OVER_TIME_AREA_ANIMATION}
        />
        {hasPlannedAmount ? (
          <Area
            type="monotone"
            dataKey="plannedAmount"
            stroke={plannedColor}
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={0}
            animationBegin={200}
            {...EXPENSES_OVER_TIME_AREA_ANIMATION}
          />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  );
}

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
        <CardTitle className="text-base lg:text-lg font-semibold">
          {t("dashboard.expensesOverTime.title")}
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          {t("dashboard.expensesOverTime.description")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-50 min-h-0 min-w-0 lg:h-60">
          {hasData ? (
            <ExpensesOverTimeAreaChart
              chartData={chartData}
              formatCurrency={formatCurrency}
              plannedColor="var(--muted-foreground)"
              t={t}
              usedColor="var(--chart-1)"
            />
          ) : (
            <NoDataMessage t={t} />
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
  readonly dailyExpensesOverTime: DailyExpenseInput[];
  readonly selectedMonth?: string;
  readonly currency?: string;
  readonly locale?: string;
};

type DailyChartItem = {
  day: number;
  label: string;
  amount: number;
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

type FormatCurrencyOptions = {
  currency: string;
  locale: string;
  precision?: number;
};

function formatCurrency(
  value: number,
  { currency, locale, precision = 0 }: FormatCurrencyOptions,
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: precision,
  }).format(value);
}

function buildDailyChartData(
  dailyExpensesOverTime: DailyExpenseInput[],
  monthKey: string,
  endDay: number,
): DailyChartItem[] {
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

  return Array.from({ length: endDay }, (_, index) => {
    const day = index + 1;
    const amount = expensesByDay[day] ?? 0;

    return {
      day,
      label: String(day).padStart(2, "0"),
      amount,
    };
  });
}

function buildXTicks(endDay: number, step: number) {
  if (endDay < 1) {
    return [] as number[];
  }

  const ticks: number[] = [];
  for (let day = 1; day <= endDay; day += step) {
    ticks.push(day);
  }

  return ticks;
}

type DailyExpensesTooltipProps = {
  readonly active?: boolean;
  readonly currency: string;
  readonly locale: string;
  readonly payload?: Array<{
    payload: { amount?: number; day?: number };
  }>;
  readonly t: (key: string) => string;
};

function DailyExpensesTooltip({
  active,
  currency,
  locale,
  payload,
  t,
}: DailyExpensesTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;
  const day = Number(data.day ?? 0);
  const amount = Number(data.amount ?? 0);

  return (
    <div className="bg-card border border-border rounded-lg p-2.5 shadow-xl sm:p-3">
      <p className="text-sm font-medium text-foreground">
        {t("dashboard.dailyExpenses.day")} {day}
      </p>
      <div className="mt-2 space-y-1">
        <div className="flex min-w-32 items-center justify-between gap-3 text-sm sm:min-w-40">
          <span className="text-muted-foreground">{t("common.spent")}</span>
          <span className="font-semibold text-primary">
            {formatCurrency(amount, { locale, currency, precision: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

type DailyExpensesAreaChartProps = {
  readonly chartData: DailyChartItem[];
  readonly currency: string;
  readonly endDay: number;
  readonly isMobile: boolean;
  readonly locale: string;
  readonly t: (key: string) => string;
  readonly xTicks: number[];
};

function DailyExpensesGradientDef() {
  return (
    <defs>
      <linearGradient id="dailyExpensesGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
        <stop offset="95%" stopColor="currentColor" stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

const DAILY_EXPENSES_RESPONSIVE_PROPS = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  initialDimension: { width: 1, height: 200 },
} as const;
const DAILY_EXPENSES_AREA_ANIMATION = {
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: 800,
  animationEasing: "ease-in-out" as const,
};

function DailyExpensesXAxis({
  endDay,
  xTicks,
}: Pick<DailyExpensesAreaChartProps, "endDay" | "xTicks">) {
  return (
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
      tickFormatter={(value) => String(Number(value)).padStart(2, "0")}
    />
  );
}

function DailyExpensesYAxis({
  currency,
  isMobile,
  locale,
}: Pick<DailyExpensesAreaChartProps, "currency" | "isMobile" | "locale">) {
  return (
    <YAxis
      tickLine={false}
      axisLine={false}
      tickMargin={6}
      width={isMobile ? 56 : 72}
      tickCount={isMobile ? 4 : 5}
      className="text-xs"
      tickFormatter={(value) => formatCurrency(Number(value), { locale, currency })}
    />
  );
}

function DailyExpensesAreaChart({
  chartData,
  currency,
  endDay,
  isMobile,
  locale,
  t,
  xTicks,
}: DailyExpensesAreaChartProps) {
  return (
    <ResponsiveContainer {...DAILY_EXPENSES_RESPONSIVE_PROPS}>
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: isMobile ? 4 : 12, left: isMobile ? -8 : 0, bottom: 0 }}
      >
        <DailyExpensesGradientDef />
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <DailyExpensesXAxis endDay={endDay} xTicks={xTicks} />
        <DailyExpensesYAxis currency={currency} isMobile={isMobile} locale={locale} />
        <Tooltip
          content={
            <DailyExpensesTooltip currency={currency} locale={locale} t={t} />
          }
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="currentColor"
          strokeWidth={2.5}
          fill="url(#dailyExpensesGradient)"
          dot={false}
          activeDot={{ r: 5 }}
          className="text-primary"
          {...DAILY_EXPENSES_AREA_ANIMATION}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DailyExpensesSplineChartHeader({
  t,
  currency,
  locale,
  averagePerDay,
}: {
  t: (key: string) => string;
  currency: string;
  locale: string;
  averagePerDay: number;
}) {
  return (
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
            {formatCurrency(averagePerDay, { locale, currency, precision: 2 })}
          </p>
        </div>
      </div>
    </CardHeader>
  );
}

function DailyExpensesSplineChartBody(
  props: DailyExpensesAreaChartProps & { hasData: boolean },
) {
  const { hasData, t } = props;

  return (
    <CardContent>
      <div className="h-60 min-h-0 min-w-0 sm:h-72">
        {hasData ? <DailyExpensesAreaChart {...props} /> : <NoDataMessage t={t} />}
      </div>
    </CardContent>
  );
}

export function DailyExpensesSplineChart({
  dailyExpensesOverTime,
  selectedMonth,
  currency = "BRL",
  locale = "pt-BR",
}: DailyExpensesSplineChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const monthKey = selectedMonth ?? getMonthKey(new Date());
  const endDay = getChartEndDay(monthKey);
  const chartData = buildDailyChartData(
    dailyExpensesOverTime,
    monthKey,
    endDay,
  );

  const totalSpent = chartData.reduce((total, item) => total + item.amount, 0);
  const averagePerDay = endDay > 0 ? totalSpent / endDay : 0;
  const hasData = chartData.some((item) => item.amount > 0);
  const xTickStep = isMobile ? 5 : 2;
  const xTicks = useMemo(
    () => buildXTicks(endDay, xTickStep),
    [endDay, xTickStep],
  );

  return (
    <Card className="h-full">
      <DailyExpensesSplineChartHeader
        t={t}
        currency={currency}
        locale={locale}
        averagePerDay={averagePerDay}
      />
      <DailyExpensesSplineChartBody
        hasData={hasData}
        chartData={chartData}
        currency={currency}
        endDay={endDay}
        isMobile={isMobile}
        locale={locale}
        t={t}
        xTicks={xTicks}
      />
    </Card>
  );
}
