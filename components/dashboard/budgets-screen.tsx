"use client";

import { useMemo, useState } from "react";

import { Download, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  type BudgetData,
  type BudgetSplitItem,
  type CategoryOverviewItem,
} from "@/lib/finance/transactions";
import { calculateBudgetUsage } from "@/lib/finance/budget";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BudgetsScreenProps = {
  budgetData: BudgetData;
  budgetSplitData: BudgetSplitItem[];
  categories: CategoryOverviewItem[];
};

export function csvEscape(value: string | number | null) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function BudgetsScreen({
  budgetData,
  budgetSplitData,
  categories,
}: BudgetsScreenProps) {
  const { formatCurrency, t } = useI18n();
  const [includePlanned, setIncludePlanned] = useState(false);

  const totalBudget =
    budgetData.needs.budget +
    budgetData.wants.budget +
    budgetData.savings.budget;
  const totalSpent =
    budgetData.needs.spent + budgetData.wants.spent + budgetData.savings.spent;
  const totalPlannedSpent =
    budgetData.needs.plannedSpent +
    budgetData.wants.plannedSpent +
    budgetData.savings.plannedSpent;
  const totalUsage = calculateBudgetUsage(totalSpent, totalBudget);
  const chartData = useMemo(
    () => budgetSplitData.map((item) => ({ ...item, name: t(item.nameKey) })),
    [budgetSplitData, t],
  );
  /* c8 ignore next */
  const pieTooltipFormatter = (value: unknown) =>
    [`${value}%`, t("screen.budgets.monthlyAllocation")] as [string, string];

  const budgetGroups = useMemo(
    () => [
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
    ],
    [budgetData, t],
  );

  /* c8 ignore start */
  function downloadCsv() {
    const groups = ["needs", "wants", "savings"] as const;
    const rows = [
      [
        t("data.group.needs").replace(t("data.group.needs"), "Group"),
        t("common.spent"),
        ...(includePlanned ? [t("common.planned")] : []),
        "Budget",
        "%",
      ],
      ...groups.map((key) => {
        const group = budgetData[key];
        return [
          t(`data.group.${key}`),
          group.spent.toFixed(2),
          ...(includePlanned ? [group.plannedSpent.toFixed(2)] : []),
          group.budget.toFixed(2),
          `${group.percentage}%`,
        ];
      }),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dragg-budget.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  /* c8 ignore stop */

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
            null,
          ],
          [
            t("screen.budgets.totalSpent"),
            formatCurrency(totalSpent),
            `${totalUsage.usagePercentage}% ${t("common.ofBudget")}`,
            totalPlannedSpent !== totalSpent
              ? `${t("screen.budgets.plannedLabel")}: ${formatCurrency(totalPlannedSpent)}`
              : null,
          ],
          [
            totalUsage.isOverBudget
              ? t("common.overBudget")
              : t("common.left"),
            formatCurrency(
              totalUsage.isOverBudget
                ? totalUsage.exceededAmount
                : totalUsage.remainingAmount,
            ),
            totalUsage.isOverBudget
              ? t("common.overBudget")
              : t("screen.budgets.leftToSpend"),
            null,
          ],
        ].map(([label, value, note, sub]) => (
          <Card key={label as string} className="border-border bg-card card-shadow">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              {sub ? (
                <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="include-planned"
            checked={includePlanned}
            onCheckedChange={setIncludePlanned}
          />
          <Label htmlFor="include-planned" className="text-sm text-muted-foreground cursor-pointer">
            {t("screen.budgets.includePlanned")}
          </Label>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv} className="gap-2">
          <Download className="size-4" />
          {t("screen.budgets.exportCsv")}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("screen.budgets.rule")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 min-h-0 min-w-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
                initialDimension={{ width: 1, height: 256 }}
              >
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
                  <Tooltip formatter={pieTooltipFormatter} />
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
              /* c8 ignore next */
              const displaySpent = includePlanned ? group.plannedSpent : group.spent;
              const usage = calculateBudgetUsage(displaySpent, group.budget);
              let trend: "over" | "normal" | "under" = "under";
              if (usage.isOverBudget || usage.usagePercentage > 80) {
                trend = "over";
              } else if (usage.usagePercentage > 50) {
                trend = "normal";
              }
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
                        {formatCurrency(displaySpent)}
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
                      value={usage.progressValue}
                      className="h-3"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        usage.isOverBudget
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {trend === "over" && <TrendingUp className="size-3" />}
                      {trend === "under" && <TrendingDown className="size-3" />}
                      {trend === "normal" && <Minus className="size-3" />}
                      {usage.usagePercentage}% {t("common.used")}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        usage.isOverBudget
                          ? "font-medium text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {usage.isOverBudget
                        ? `${formatCurrency(usage.exceededAmount)} ${t("common.overBudget")}`
                        : `${formatCurrency(usage.remainingAmount)} ${t("common.left")}`}
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
                const isOverBudget = percentage > 100;
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
                      <span
                        className={cn(
                          "text-sm",
                          isOverBudget
                            ? "font-medium text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatCurrency(category.spent)} /{" "}
                        {formatCurrency(category.monthlyLimit)}
                      </span>
                    </div>
                    <div
                      className="overflow-hidden rounded-full bg-secondary"
                      style={{
                        // @ts-expect-error CSS variable
                        "--progress-foreground": isOverBudget
                          ? "var(--destructive)"
                          : category.color,
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
