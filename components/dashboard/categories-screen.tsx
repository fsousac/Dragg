"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories, type TransactionGroup } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const groupColors: Record<TransactionGroup, string> = {
  needs: "bg-needs text-white",
  income: "bg-income text-white",
  savings: "bg-savings text-white",
  wants: "bg-wants text-white",
};

export function CategoriesScreen() {
  const { formatCurrency, t } = useI18n();
  const [activeTab, setActiveTab] = useState("all");

  const filteredCategories =
    activeTab === "all"
      ? categories
      : categories.filter((category) => category.group === activeTab);

  return (
    <>
      <PageHeader
        title={t("screen.categories.title")}
        description={t("screen.categories.description")}
        actions={
          <Button className="gap-2">
            <Plus className="size-4" />
            {t("screen.categories.newCategory")}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
          <TabsTrigger value="needs">{t("data.group.needs")}</TabsTrigger>
          <TabsTrigger value="wants">{t("data.group.wants")}</TabsTrigger>
          <TabsTrigger value="savings">{t("data.group.savings")}</TabsTrigger>
          <TabsTrigger value="income">{t("data.group.income")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCategories.map((category) => {
          const percentage =
            category.budget > 0
              ? Math.round((category.spent / category.budget) * 100)
              : 0;
          const isOverBudget = percentage > 100;

          return (
            <Card
              key={category.id}
              className="border-border bg-card card-shadow"
            >
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-12 items-center justify-center rounded-lg text-2xl"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {t(category.nameKey)}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "mt-1 text-xs",
                          groupColors[category.group],
                        )}
                      >
                        {t(`data.group.${category.group}`)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-8">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {category.budget > 0 ? (
                  <>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("common.spent")}
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          isOverBudget ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {formatCurrency(category.spent)} /{" "}
                        {formatCurrency(category.budget)}
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
                    <p
                      className={cn(
                        "mt-2 text-xs",
                        isOverBudget
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {isOverBudget
                        ? `${percentage - 100}% ${t("common.overBudget")}`
                        : `${100 - percentage}% ${t("common.remaining")}`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("screen.categories.incomeNoBudget")}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
