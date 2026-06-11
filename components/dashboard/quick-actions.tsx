"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Target, PieChart, BarChart3, Folder } from "lucide-react";
import { withSelectedMonth } from "@/components/dashboard/month-route";
import { useI18n } from "@/lib/i18n";

const actions = [
  {
    nameKey: "dashboard.quickActions.addIncome",
    href: "/transactions",
    icon: Plus,
    color: "bg-income/10 text-income hover:bg-income/20",
  },
  {
    nameKey: "dashboard.quickActions.addExpense",
    href: "/transactions",
    icon: Minus,
    color: "bg-expense/10 text-expense hover:bg-expense/20",
  },
  {
    nameKey: "dashboard.quickActions.addCategory",
    href: "/categories",
    icon: Folder,
    color: "bg-[#0369A1]/10 text-[#0369A1] hover:bg-[#0369A1]/20 dark:bg-[#38BDF8]/10 dark:text-[#38BDF8] dark:hover:bg-[#38BDF8]/20",
  },
  {
    nameKey: "dashboard.quickActions.addGoal",
    href: "/goals",
    icon: Target,
    color: "bg-wants/10 text-wants hover:bg-wants/20",
  },
  {
    nameKey: "dashboard.quickActions.createBudget",
    href: "/budgets",
    icon: PieChart,
    color: "bg-needs/10 text-needs hover:bg-needs/20",
  },
  {
    nameKey: "dashboard.quickActions.viewReports",
    href: "/reports",
    icon: BarChart3,
    color: "bg-savings/10 text-savings hover:bg-savings/20",
  },
];

export function QuickActions() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
          {t("dashboard.quickActions.title")}
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          {t("dashboard.quickActions.description")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                asChild
                key={action.nameKey}
                variant="ghost"
                className={`flex flex-col items-center gap-2 h-auto py-4 lg:py-6 ${action.color} transition-all duration-200 cursor-pointer`}
              >
                <Link href={withSelectedMonth(action.href, searchParams)}>
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                  <span className="text-[10px] lg:text-xs font-medium text-center leading-tight">
                    {t(action.nameKey)}
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
