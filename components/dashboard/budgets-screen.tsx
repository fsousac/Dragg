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

function buildBudgetTotals(budgetData: BudgetData) {
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

  return { totalBudget, totalSpent, totalPlannedSpent, totalUsage };
}

function buildBudgetGroups(
  budgetData: BudgetData,
  t: (key: string) => string,
) {
  return [
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
}

function buildBudgetCsvRows({
  budgetData,
  includePlanned,
  t,
}: {
  budgetData: BudgetData;
  includePlanned: boolean;
  t: (key: string) => string;
}) {
  const groups = ["needs", "wants", "savings"] as const;

  return [
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
}

/* c8 ignore start */
function downloadBudgetCsv({
  budgetData,
  includePlanned,
  t,
}: {
  budgetData: BudgetData;
  includePlanned: boolean;
  t: (key: string) => string;
}) {
  const rows = buildBudgetCsvRows({ budgetData, includePlanned, t });
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

function useBudgetsScreenState({
  budgetData,
  budgetSplitData,
}: Pick<BudgetsScreenProps, "budgetData" | "budgetSplitData">) {
  const { t } = useI18n();
  const [includePlanned, setIncludePlanned] = useState(false);
  const totals = buildBudgetTotals(budgetData);
  const chartData = useMemo(
    () => budgetSplitData.map((item) => ({ ...item, name: t(item.nameKey) })),
    [budgetSplitData, t],
  );
  /* c8 ignore next */
  const pieTooltipFormatter = (value: unknown) =>
    [`${value}%`, t("screen.budgets.monthlyAllocation")] as [string, string];
  const budgetGroups = useMemo(
    () => buildBudgetGroups(budgetData, t),
    [budgetData, t],
  );
  const downloadCsv = () =>
    downloadBudgetCsv({ budgetData, includePlanned, t });

  return {
    includePlanned,
    setIncludePlanned,
    ...totals,
    chartData,
    pieTooltipFormatter,
    budgetGroups,
    downloadCsv,
  };
}

type BudgetsSummaryCardData = {
  label: string;
  value: string;
  note: string;
  sub: string | null;
};

function buildBudgetsSummaryCards({
  totalBudget,
  totalSpent,
  totalPlannedSpent,
  totalUsage,
  formatCurrency,
  t,
}: {
  totalBudget: number;
  totalSpent: number;
  totalPlannedSpent: number;
  totalUsage: ReturnType<typeof calculateBudgetUsage>;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}): BudgetsSummaryCardData[] {
  return [
    {
      label: t("screen.budgets.totalBudget"),
      value: formatCurrency(totalBudget),
      note: t("screen.budgets.monthlyAllocation"),
      sub: null,
    },
    {
      label: t("screen.budgets.totalSpent"),
      value: formatCurrency(totalSpent),
      note: `${totalUsage.usagePercentage}% ${t("common.ofBudget")}`,
      sub:
        totalPlannedSpent !== totalSpent
          ? `${t("screen.budgets.plannedLabel")}: ${formatCurrency(totalPlannedSpent)}`
          : null,
    },
    {
      label: totalUsage.isOverBudget ? t("common.overBudget") : t("common.left"),
      value: formatCurrency(
        totalUsage.isOverBudget ? totalUsage.exceededAmount : totalUsage.remainingAmount,
      ),
      note: totalUsage.isOverBudget
        ? t("common.overBudget")
        : t("screen.budgets.leftToSpend"),
      sub: null,
    },
  ];
}

function BudgetsSummaryCards(props: {
  totalBudget: number;
  totalSpent: number;
  totalPlannedSpent: number;
  totalUsage: ReturnType<typeof calculateBudgetUsage>;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  const cards = buildBudgetsSummaryCards(props);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-border bg-card card-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>
            {card.sub ? (
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BudgetsToolbar({
  includePlanned,
  setIncludePlanned,
  downloadCsv,
  t,
}: {
  includePlanned: boolean;
  setIncludePlanned: (value: boolean) => void;
  downloadCsv: () => void;
  t: (key: string) => string;
}) {
  return (
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
  );
}

function BudgetsPieCard({
  chartData,
  pieTooltipFormatter,
  t,
}: {
  chartData: (BudgetSplitItem & { name: string })[];
  pieTooltipFormatter: (value: unknown) => [string, string];
  t: (key: string) => string;
}) {
  return (
    <Card className="border-border bg-card card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{t("screen.budgets.rule")}</CardTitle>
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
  );
}

function getBudgetGroupTrend(usage: ReturnType<typeof calculateBudgetUsage>) {
  if (usage.isOverBudget || usage.usagePercentage > 80) return "over" as const;
  if (usage.usagePercentage > 50) return "normal" as const;
  return "under" as const;
}

type BudgetGroupItem = ReturnType<typeof buildBudgetGroups>[number];

function BudgetGroupHeader({
  group,
  displaySpent,
  formatCurrency,
}: {
  group: BudgetGroupItem;
  displaySpent: number;
  formatCurrency: (value: number) => string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">{group.icon}</span>
        <div>
          <p className="font-medium text-foreground">{group.name}</p>
          <p className="text-xs text-muted-foreground">{group.description}</p>
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
  );
}

function BudgetGroupStatus({
  usage,
  trend,
  formatCurrency,
  t,
}: {
  usage: ReturnType<typeof calculateBudgetUsage>;
  trend: ReturnType<typeof getBudgetGroupTrend>;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  return (
    <div className="mt-1 flex items-center justify-between">
      <span
        className={cn(
          "flex items-center gap-1 text-xs",
          usage.isOverBudget ? "text-destructive" : "text-muted-foreground",
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
          usage.isOverBudget ? "font-medium text-destructive" : "text-muted-foreground",
        )}
      >
        {usage.isOverBudget
          ? `${formatCurrency(usage.exceededAmount)} ${t("common.overBudget")}`
          : `${formatCurrency(usage.remainingAmount)} ${t("common.left")}`}
      </span>
    </div>
  );
}

function BudgetGroupRow({
  group,
  includePlanned,
  formatCurrency,
  t,
}: {
  group: BudgetGroupItem;
  includePlanned: boolean;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  /* c8 ignore next */
  const displaySpent = includePlanned ? group.plannedSpent : group.spent;
  const usage = calculateBudgetUsage(displaySpent, group.budget);
  const trend = getBudgetGroupTrend(usage);

  return (
    <div>
      <BudgetGroupHeader group={group} displaySpent={displaySpent} formatCurrency={formatCurrency} />
      <div
        className="overflow-hidden rounded-full bg-secondary"
        style={{
          // @ts-expect-error CSS variable
          "--progress-foreground": group.color,
        }}
      >
        <Progress value={usage.progressValue} className="h-3" />
      </div>
      <BudgetGroupStatus usage={usage} trend={trend} formatCurrency={formatCurrency} t={t} />
    </div>
  );
}

function BudgetGroupsCard({
  budgetGroups,
  includePlanned,
  formatCurrency,
  t,
}: {
  budgetGroups: BudgetGroupItem[];
  includePlanned: boolean;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  return (
    <Card className="border-border bg-card card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{t("screen.budgets.groups")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {budgetGroups.map((group) => (
          <BudgetGroupRow
            key={group.key}
            group={group}
            includePlanned={includePlanned}
            formatCurrency={formatCurrency}
            t={t}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function CategoryBudgetItem({
  category,
  formatCurrency,
  t,
}: {
  category: CategoryOverviewItem;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  const percentage = Math.round((category.spent / category.monthlyLimit) * 100);
  const isOverBudget = percentage > 100;

  return (
    <div className="rounded-lg bg-accent/50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>{category.icon}</span>
          <span className="font-medium text-foreground">{t(category.label)}</span>
        </div>
        <span
          className={cn(
            "text-sm",
            isOverBudget ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {formatCurrency(category.spent)} / {formatCurrency(category.monthlyLimit)}
        </span>
      </div>
      <div
        className="overflow-hidden rounded-full bg-secondary"
        style={{
          // @ts-expect-error CSS variable
          "--progress-foreground": isOverBudget ? "var(--destructive)" : category.color,
        }}
      >
        <Progress value={Math.min(percentage, 100)} className="h-2" />
      </div>
    </div>
  );
}

function CategoryBudgetsCard({
  categories,
  formatCurrency,
  t,
}: {
  categories: CategoryOverviewItem[];
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  return (
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
            .map((category) => (
              <CategoryBudgetItem
                key={category.id}
                category={category}
                formatCurrency={formatCurrency}
                t={t}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BudgetsScreen({
  budgetData,
  budgetSplitData,
  categories,
}: BudgetsScreenProps) {
  const { formatCurrency, t } = useI18n();
  const state = useBudgetsScreenState({ budgetData, budgetSplitData });

  return (
    <>
      <PageHeader
        title={t("screen.budgets.title")}
        description={t("screen.budgets.track")}
      />

      <BudgetsSummaryCards {...state} formatCurrency={formatCurrency} t={t} />
      <BudgetsToolbar {...state} t={t} />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetsPieCard {...state} t={t} />
        <BudgetGroupsCard {...state} formatCurrency={formatCurrency} t={t} />
      </div>

      <CategoryBudgetsCard categories={categories} formatCurrency={formatCurrency} t={t} />
    </>
  );
}
