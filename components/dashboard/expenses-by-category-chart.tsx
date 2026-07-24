"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type ExpensesByCategoryItem } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type ExpensesByCategoryChartProps = {
  readonly expensesByCategory: ExpensesByCategoryItem[];
};

type NamedExpensesByCategoryItem = ExpensesByCategoryItem & {
  groupName: string;
  name: string;
};

type ExpensesByCategoryTooltipProps = {
  readonly active?: boolean;
  readonly formatCurrency: (value: number) => string;
  readonly payload?: Array<{
    payload: NamedExpensesByCategoryItem;
  }>;
  readonly t: (key: string) => string;
  readonly total: number;
};

export function ExpensesByCategoryTooltip({
  active,
  formatCurrency,
  payload,
  t,
  total,
}: ExpensesByCategoryTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const percentage =
    total > 0 ? ((data.value / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
      <p className="text-sm font-medium text-foreground">{data.name}</p>
      <p className="text-xs text-muted-foreground">{data.groupName}</p>
      <p className="mt-1 text-lg font-bold text-foreground">
        {formatCurrency(data.value)}
      </p>
      <p className="text-xs text-muted-foreground">
        {percentage}% {t("common.ofTotal")}
      </p>
    </div>
  );
}

type GroupedExpensesData = {
  color: string;
  group: string;
  groupName: string;
  groupTotal: number;
  items: NamedExpensesByCategoryItem[];
};

type ExpensesByCategoryPieSectionProps = {
  readonly chartData: NamedExpensesByCategoryItem[];
  readonly formatCurrency: (value: number) => string;
  readonly t: (key: string) => string;
  readonly total: number;
};

function getExpensesByCategoryCellOpacity(index: number) {
  return 1 - (index % 4) * 0.12;
}

const CATEGORY_PIE_RESPONSIVE_PROPS = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  initialDimension: { width: 1, height: 170 },
} as const;

const CATEGORY_PIE_PROPS = {
  cx: "50%",
  cy: "50%",
  dataKey: "value",
  innerRadius: 44,
  outerRadius: 72,
  paddingAngle: 2,
  isAnimationActive: true,
  animationBegin: 100,
  animationDuration: 900,
  animationEasing: "ease-out" as const,
};

function ExpensesByCategoryPieChart({
  chartData,
  formatCurrency,
  t,
  total,
}: ExpensesByCategoryPieSectionProps) {
  return (
    <div className="h-42.5 min-h-0 min-w-0">
      <ResponsiveContainer {...CATEGORY_PIE_RESPONSIVE_PROPS}>
        <PieChart>
          <Pie data={chartData} {...CATEGORY_PIE_PROPS}>
            {chartData.map((entry, index) => (
              <Cell
                key={`${entry.categoryId ?? entry.group}-${entry.nameKey}`}
                className="stroke-card stroke-2"
                fill={entry.color}
                opacity={getExpensesByCategoryCellOpacity(index)}
              />
            ))}
          </Pie>
          <Tooltip
            content={
              <ExpensesByCategoryTooltip
                formatCurrency={formatCurrency}
                t={t}
                total={total}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExpensesByCategoryTotalBox({
  formatCurrency,
  t,
  total,
}: Pick<ExpensesByCategoryPieSectionProps, "formatCurrency" | "t" | "total">) {
  return (
    <div className="rounded-md border-border/70 bg-muted/20 p-3 w-fit">
      <p className="text-xs text-muted-foreground">
        {t("dashboard.summary.predictedExpenses")}
      </p>
      <p className="text-lg font-semibold text-foreground m-auto">
        {formatCurrency(total)}
      </p>
    </div>
  );
}

function ExpensesByCategoryPieSection(props: ExpensesByCategoryPieSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr] md:items-center">
      <ExpensesByCategoryPieChart {...props} />
      <ExpensesByCategoryTotalBox {...props} />
    </div>
  );
}

type ExpensesByCategoryRowProps = {
  readonly category: NamedExpensesByCategoryItem;
  readonly formatCurrency: (value: number) => string;
  readonly groupTotal: number;
};

function ExpensesByCategoryRow({
  category,
  formatCurrency,
  groupTotal,
}: ExpensesByCategoryRowProps) {
  const percentage =
    groupTotal > 0 ? Math.round((category.value / groupTotal) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="truncate text-muted-foreground">{category.name}</p>
        <p className="shrink-0 font-medium text-foreground">
          {formatCurrency(category.value)}
        </p>
      </div>
      <Progress
        value={percentage}
        className="h-2 bg-accent"
        style={{
          // @ts-expect-error CSS variable
          "--progress-foreground": category.color,
        }}
      />
    </div>
  );
}

type ExpensesByCategoryGroupSectionProps = {
  readonly formatCurrency: (value: number) => string;
  readonly formatPercentage: (value: number) => string;
  readonly group: GroupedExpensesData;
  readonly total: number;
};

function ExpensesByCategoryGroupSection({
  formatCurrency,
  formatPercentage,
  group,
  total,
}: ExpensesByCategoryGroupSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          <p className="truncate text-sm font-semibold text-foreground">
            {group.groupName}
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 text-right">
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatPercentage((group.groupTotal / total) * 100)}%
          </p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(group.groupTotal)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {group.items.map((category) => (
          <ExpensesByCategoryRow
            key={`${category.categoryId ?? category.group}-${category.nameKey}`}
            category={category}
            formatCurrency={formatCurrency}
            groupTotal={group.groupTotal}
          />
        ))}
      </div>
    </div>
  );
}

const EXPENSE_GROUP_ORDER = ["needs", "wants", "savings"];

function buildGroupedExpensesData(
  chartData: NamedExpensesByCategoryItem[],
): GroupedExpensesData[] {
  return EXPENSE_GROUP_ORDER.map((group) => {
    const items = chartData.filter((item) => item.group === group);
    const groupTotal = items.reduce((sum, item) => sum + item.value, 0);

    return {
      color: items[0]?.color ?? "#64748B",
      group,
      groupName: items[0]?.groupName ?? "",
      groupTotal,
      items,
    };
  }).filter((group) => group.items.length > 0);
}

function useExpensesByCategoryData({
  expensesByCategory,
  t,
  formatNumber,
}: ExpensesByCategoryChartProps & {
  t: (key: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}) {
  const chartData = useMemo(
    () =>
      expensesByCategory.map((item) => ({
        ...item,
        groupName: t(item.groupKey),
        name: t(item.nameKey),
      })),
    [expensesByCategory, t],
  );
  const total = useMemo(
    () => expensesByCategory.reduce((sum, item) => sum + item.value, 0),
    [expensesByCategory],
  );
  const groupedData = useMemo(
    () => buildGroupedExpensesData(chartData),
    [chartData],
  );
  const formatPercentage = (value: number) =>
    formatNumber(value, { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  return { chartData, total, groupedData, formatPercentage };
}

function ExpensesByCategoryContent({
  chartData,
  formatCurrency,
  groupedData,
  formatPercentage,
  t,
  total,
}: {
  chartData: NamedExpensesByCategoryItem[];
  formatCurrency: (value: number) => string;
  groupedData: GroupedExpensesData[];
  formatPercentage: (value: number) => string;
  t: (key: string) => string;
  total: number;
}) {
  if (total <= 0) {
    return (
      <div className="flex h-50 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        {t("common.noDataForPeriod")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ExpensesByCategoryPieSection
        chartData={chartData}
        formatCurrency={formatCurrency}
        t={t}
        total={total}
      />

      {groupedData.map((group) => (
        <ExpensesByCategoryGroupSection
          key={group.group}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
          group={group}
          total={total}
        />
      ))}
    </div>
  );
}

export function ExpensesByCategoryChart({
  expensesByCategory,
}: ExpensesByCategoryChartProps) {
  const { formatCurrency, formatNumber, t } = useI18n();
  const { chartData, total, groupedData, formatPercentage } =
    useExpensesByCategoryData({ expensesByCategory, t, formatNumber });

  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold">
          {t("dashboard.expensesByCategory.title")}
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          {t("dashboard.expensesByCategory.description")}
        </p>
      </CardHeader>
      <CardContent>
        <ExpensesByCategoryContent
          chartData={chartData}
          formatCurrency={formatCurrency}
          groupedData={groupedData}
          formatPercentage={formatPercentage}
          t={t}
          total={total}
        />
      </CardContent>
    </Card>
  );
}
