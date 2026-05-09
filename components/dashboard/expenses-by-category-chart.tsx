"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type ExpensesByCategoryItem } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type ExpensesByCategoryChartProps = {
  expensesByCategory: ExpensesByCategoryItem[];
};

type ExpensesByCategoryTooltipProps = {
  active?: boolean;
  formatCurrency: (value: number) => string;
  payload?: Array<{
    payload: ExpensesByCategoryItem & {
      groupName: string;
      name: string;
    };
  }>;
  t: (key: string) => string;
  total: number;
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

export function ExpensesByCategoryChart({
  expensesByCategory,
}: ExpensesByCategoryChartProps) {
  const { formatCurrency, t } = useI18n();
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
  const groupedData = useMemo(() => {
    const groupOrder = ["needs", "wants", "savings"];
    return groupOrder
      .map((group) => {
        const items = chartData.filter((item) => item.group === group);
        const groupTotal = items.reduce((sum, item) => sum + item.value, 0);

        return {
          color: items[0]?.color ?? "#64748B",
          group,
          groupName: items[0]?.groupName ?? "",
          groupTotal,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [chartData]);

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
        {total > 0 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr] md:items-center">
              <div className="h-[170px] min-h-0 min-w-0">
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
                      paddingAngle={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`${entry.group}-${entry.nameKey}`}
                          className="stroke-card stroke-2"
                          fill={entry.color}
                          opacity={1 - (index % 4) * 0.12}
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
              <div className="rounded-md border-border/70 bg-muted/20 p-3 w-fit">
                <p className="text-xs text-muted-foreground">
                  {t("common.expense")}
                </p>
                <p className="text-lg font-semibold text-foreground m-auto">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>

            {groupedData.map((group) => (
              <div key={group.group} className="space-y-3">
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
                  <p className="shrink-0 text-sm font-semibold text-foreground">
                    {formatCurrency(group.groupTotal)}
                  </p>
                </div>

                <div className="space-y-3">
                  {group.items.map((category) => {
                    const percentage =
                      group.groupTotal > 0
                        ? Math.round((category.value / group.groupTotal) * 100)
                        : 0;

                    return (
                      <div
                        key={`${category.group}-${category.nameKey}`}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <p className="truncate text-muted-foreground">
                            {category.name}
                          </p>
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
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
            {t("common.noDataForPeriod")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
