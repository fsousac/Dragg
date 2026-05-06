"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { type BudgetSplitItem } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

type BudgetSplitChartProps = {
  budgetSplitData: BudgetSplitItem[];
};

export function BudgetSplitChart({ budgetSplitData }: BudgetSplitChartProps) {
  const { formatCurrency, t } = useI18n();
  const chartData = budgetSplitData.map((item) => ({
    ...item,
    name: t(item.nameKey),
  }));

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
      <CardContent>
        <div className="h-[200px] lg:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
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
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                        <p className="text-sm font-medium text-foreground">
                          {data.name}
                        </p>
                        <p className="mt-1 text-lg font-bold text-foreground">
                          {formatCurrency(data.maxAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.value}% {t("common.ofBudget")}
                        </p>
                        <p className="mt-1 text-xs font-medium text-foreground">
                          {t("common.spent")}:{" "}
                          {formatCurrency(data.spentAmount)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 gap-3 pt-2">
          {chartData.map((item) => (
            <div key={item.nameKey} className="flex items-center gap-3">
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-medium text-foreground">
                    {item.name} ({item.value}%)
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {formatCurrency(item.maxAmount)}
                  </p>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {t("common.spent")}: {formatCurrency(item.spentAmount)}
                  </span>
                  <span>
                    {Math.round(
                      item.maxAmount > 0
                        ? (item.spentAmount / item.maxAmount) * 100
                        : 0,
                    )}
                    % {t("common.used")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
