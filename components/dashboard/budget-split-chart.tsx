"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateBudgetUsage } from "@/lib/finance/budget";
import { type BudgetSplitItem } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type BudgetSplitChartProps = {
  budgetSplitData: BudgetSplitItem[];
};

type BudgetSplitTooltipProps = {
  active?: boolean;
  formatCurrency: (value: number) => string;
  payload?: Array<{
    payload: BudgetSplitItem & {
      name: string;
    };
  }>;
  t: (key: string) => string;
};

export function BudgetSplitTooltip({
  active,
  formatCurrency,
  payload,
  t,
}: BudgetSplitTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
      <p className="text-sm font-medium text-foreground">
        {data.name} ({data.value}%)
      </p>
      <p className="mt-1 text-lg font-bold text-foreground">
        {formatCurrency(data.maxAmount)}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("dashboard.budgetSplit.plannedSpend")}:{" "}
        {formatCurrency(data.spentAmount)}
      </p>
    </div>
  );
}

export function BudgetSplitChart({ budgetSplitData }: BudgetSplitChartProps) {
  const { formatCurrency, t } = useI18n();
  const chartData = useMemo(
    () => budgetSplitData.map((item) => ({ ...item, name: t(item.nameKey) })),
    [budgetSplitData, t],
  );
  const totalPlanned = useMemo(
    () => chartData.reduce((sum, item) => sum + item.maxAmount, 0),
    [chartData],
  );
  const totalSpent = useMemo(
    () => chartData.reduce((sum, item) => sum + item.spentAmount, 0),
    [chartData],
  );

  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
          {t("dashboard.budgetSplit.title")}
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          {t("dashboard.budgetSplit.description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4">
          <div className="h-42.5 min-h-0 min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              initialDimension={{ width: 1, height: 170 }}
            >
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  dataKey="value"
                  innerRadius={44}
                  outerRadius={72}
                  paddingAngle={4}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.nameKey}
                      className="stroke-card stroke-2"
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <BudgetSplitTooltip formatCurrency={formatCurrency} t={t} />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-md border border-border/70 bg-muted/20 p-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.budgetSplit.incomeBase")}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(totalPlanned)}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-muted-foreground">
                {t("dashboard.budgetSplit.plannedSpend")}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {chartData.map((item) => {
            const usage = calculateBudgetUsage(
              item.spentAmount,
              item.maxAmount,
            );

            return (
              <div key={item.nameKey} className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.name} ({item.value}%)
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("common.available")}: {formatCurrency(item.maxAmount)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(item.spentAmount)}
                    </p>
                    <p
                      className={
                        usage.isOverBudget
                          ? "text-xs font-medium text-destructive"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {usage.isOverBudget
                        ? `${formatCurrency(usage.exceededAmount)} ${t("common.overBudget")}`
                        : `${formatCurrency(usage.remainingAmount)} ${t("common.left").toLowerCase()}`}
                    </p>
                  </div>
                </div>
                <Progress
                  value={usage.progressValue}
                  className="h-2.5 bg-accent"
                  style={{
                    // @ts-expect-error CSS variable
                    "--progress-foreground": usage.isOverBudget
                      ? "var(--destructive)"
                      : item.color,
                  }}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {usage.usagePercentage}% {t("common.used")}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
