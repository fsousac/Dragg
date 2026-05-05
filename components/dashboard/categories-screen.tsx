"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NewCategoryDialog } from "@/components/dashboard/new-category-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type CategoryOverviewItem,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const groupColors: Record<CategoryOverviewItem["group"], string> = {
  needs: "bg-needs text-white",
  savings: "bg-savings text-white",
  wants: "bg-wants text-white",
};

type CategoriesScreenProps = {
  categories: CategoryOverviewItem[];
  createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  deleteCategoryAction: (categoryId: string) => Promise<void>;
  updateCategoryAction: (data: UpdateCategoryInput) => Promise<void>;
};

export function CategoriesScreen({
  categories,
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
}: CategoriesScreenProps) {
  const { formatCurrency, t } = useI18n();
  const [activeTab, setActiveTab] = useState("all");
  const [deletingCategory, setDeletingCategory] =
    useState<CategoryOverviewItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories =
    activeTab === "all"
      ? categories
      : categories.filter((category) => category.group === activeTab);

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;

    startTransition(async () => {
      try {
        await deleteCategoryAction(deletingCategory.id);
        toast.success(t("category.deleteSuccess"));
        setDeletingCategory(null);
      } catch (error) {
        console.error("Error deleting category:", error);
        toast.error(t("category.deleteError"));
      }
    });
  };

  return (
    <>
      <PageHeader
        title={t("screen.categories.title")}
        description={t("screen.categories.description")}
        actions={
          <NewCategoryDialog createCategoryAction={createCategoryAction}>
            <Button className="gap-2">
              <Plus className="size-4" />
              {t("screen.categories.newCategory")}
            </Button>
          </NewCategoryDialog>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
          <TabsTrigger value="needs">{t("data.group.needs")}</TabsTrigger>
          <TabsTrigger value="wants">{t("data.group.wants")}</TabsTrigger>
          <TabsTrigger value="savings">{t("data.group.savings")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCategories.map((category) => {
          const percentage =
            category.monthlyLimit > 0
              ? Math.round((category.spent / category.monthlyLimit) * 100)
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
                        {t(category.label)}
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
                    <NewCategoryDialog
                      category={{
                        group: category.group,
                        icon: category.icon,
                        id: category.id,
                        monthlyLimit: category.monthlyLimit,
                        name: category.name,
                        showName: !category.isDefault,
                      }}
                      createCategoryAction={createCategoryAction}
                      updateCategoryAction={updateCategoryAction}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={!category.canModify}
                        aria-label={t("common.edit")}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </NewCategoryDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      disabled={!category.canModify}
                      aria-label={t("common.delete")}
                      onClick={() => setDeletingCategory(category)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {category.monthlyLimit > 0 ? (
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
                    {t("category.noMonthlyLimit")}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("category.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("category.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDeleteCategory();
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
