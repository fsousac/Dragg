"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  type BudgetData,
  type BudgetSplitItem,
  type CategoryOverviewItem,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BudgetsScreenProps = {
  budgetData: BudgetData;
  budgetSplitData: BudgetSplitItem[];
  categories: CategoryOverviewItem[];
};

export function BudgetsScreen({
  budgetData,
  budgetSplitData,
  categories,
}: BudgetsScreenProps) {
  const { formatCurrency, t } = useI18n();
  const totalBudget =
    budgetData.needs.budget +
    budgetData.wants.budget +
    budgetData.savings.budget;
  const totalSpent =
    budgetData.needs.spent + budgetData.wants.spent + budgetData.savings.spent;
  const left = totalBudget - totalSpent;
  const chartData = budgetSplitData.map((item) => ({
    ...item,
    name: t(item.nameKey),
  }));

  const budgetGroups = [
    {
      description: t("data.category.needs"),
      icon: "🏠",
      key: "needs" as const,
      name: t("data.group.needs"),
      color: "var(--needs)",
      ...budgetData.needs,
    },
    {
      description: t("data.category.leisure"),
      icon: "🎉",
      key: "wants" as const,
      name: t("data.group.wants"),
      color: "var(--wants)",
      ...budgetData.wants,
    },
    {
      description: t("data.category.investments"),
      icon: "💰",
      key: "savings" as const,
      name: t("data.group.savings"),
      color: "var(--savings)",
      ...budgetData.savings,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("screen.budgets.title")}
        description={t("screen.budgets.track")}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          [
            t("screen.budgets.totalBudget"),
            formatCurrency(totalBudget),
            t("screen.budgets.monthlyAllocation"),
          ],
          [
            t("screen.budgets.totalSpent"),
            formatCurrency(totalSpent),
            `${Math.round((totalSpent / totalBudget) * 100)}% ${t("common.ofBudget")}`,
          ],
          [
            t("common.left"),
            formatCurrency(left),
            t("screen.budgets.leftToSpend"),
          ],
        ].map(([label, value, note]) => (
          <Card key={label} className="border-border bg-card card-shadow">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("screen.budgets.rule")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
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
                    formatter={(value: number) => [
                      `${value}%`,
                      t("screen.budgets.monthlyAllocation"),
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("screen.budgets.groups")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {budgetGroups.map((group) => {
              const percentage = Math.round((group.spent / group.budget) * 100);
              const trend =
                percentage > 80 ? "over" : percentage > 50 ? "normal" : "under";
              return (
                <div key={group.key}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <div>
                        <p className="font-medium text-foreground">
                          {group.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(group.spent)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(group.budget)}
                      </p>
                    </div>
                  </div>
                  <div
                    className="overflow-hidden rounded-full bg-secondary"
                    style={{
                      // @ts-expect-error CSS variable
                      "--progress-foreground": group.color,
                    }}
                  >
                    <Progress
                      value={Math.min(percentage, 100)}
                      className="h-3"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        percentage > 100
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {trend === "over" && <TrendingUp className="size-3" />}
                      {trend === "under" && <TrendingDown className="size-3" />}
                      {trend === "normal" && <Minus className="size-3" />}
                      {percentage}% {t("common.used")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(group.budget - group.spent)}{" "}
                      {t("common.left")}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">
            {t("screen.budgets.categoryBudgets")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {categories
              .filter((category) => category.monthlyLimit > 0)
              .map((category) => {
                const percentage = Math.round(
                  (category.spent / category.monthlyLimit) * 100,
                );
                return (
                  <div
                    key={category.id}
                    className="rounded-lg bg-accent/50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span className="font-medium text-foreground">
                          {t(category.label)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(category.spent)} /{" "}
                        {formatCurrency(category.monthlyLimit)}
                      </span>
                    </div>
                    <div
                      className="overflow-hidden rounded-full bg-secondary"
                      style={{
                        // @ts-expect-error CSS variable
                        "--progress-foreground": category.color,
                      }}
                    >
                      <Progress
                        value={Math.min(percentage, 100)}
                        className="h-2"
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
