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

type CategoriesScreenProps = {
  readonly categories: CategoryOverviewItem[];
  readonly createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  readonly deleteCategoryAction: (categoryId: string) => Promise<void>;
  readonly updateCategoryAction: (data: UpdateCategoryInput) => Promise<void>;
};

type CategoryCardProps = {
  readonly category: CategoryOverviewItem;
  readonly createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  readonly onRequestDelete: (category: CategoryOverviewItem) => void;
  readonly updateCategoryAction: (data: UpdateCategoryInput) => Promise<void>;
};

type CategoryIconLabelProps = {
  readonly category: CategoryOverviewItem;
};

function CategoryIconLabel({ category }: CategoryIconLabelProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex size-12 items-center justify-center rounded-lg text-2xl"
        style={{ backgroundColor: `${category.color}20` }}
      >
        {category.icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{t(category.label)}</h3>
        <Badge
          variant="secondary"
          className="mt-1 text-xs"
          style={{
            backgroundColor: `${category.color}1A`,
            color: category.color,
          }}
        >
          {t(`data.group.${category.group}`)}
        </Badge>
      </div>
    </div>
  );
}

function CategoryCardActions({
  category,
  createCategoryAction,
  onRequestDelete,
  updateCategoryAction,
}: CategoryCardProps) {
  const { t } = useI18n();

  return (
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
        onClick={() => onRequestDelete(category)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function CategoryCardHeader({
  category,
  createCategoryAction,
  onRequestDelete,
  updateCategoryAction,
}: CategoryCardProps) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <CategoryIconLabel category={category} />
      <CategoryCardActions
        category={category}
        createCategoryAction={createCategoryAction}
        onRequestDelete={onRequestDelete}
        updateCategoryAction={updateCategoryAction}
      />
    </div>
  );
}

type CategoryCardBudgetProps = {
  readonly category: CategoryOverviewItem;
};

function CategoryCardBudget({ category }: CategoryCardBudgetProps) {
  const { formatCurrency, t } = useI18n();

  if (category.monthlyLimit <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("category.noMonthlyLimit")}
      </p>
    );
  }

  const percentage = Math.round((category.spent / category.monthlyLimit) * 100);
  const isOverBudget = percentage > 100;

  return (
    <>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted-foreground">{t("common.spent")}</span>
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
        <Progress value={Math.min(percentage, 100)} className="h-2" />
      </div>
      <p
        className={cn(
          "mt-2 text-xs",
          isOverBudget ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {isOverBudget
          ? `${percentage - 100}% ${t("common.overBudget")}`
          : `${100 - percentage}% ${t("common.remaining")}`}
      </p>
    </>
  );
}

function CategoryCard({
  category,
  createCategoryAction,
  onRequestDelete,
  updateCategoryAction,
}: CategoryCardProps) {
  return (
    <Card className="border-border bg-card card-shadow">
      <CardContent className="p-5">
        <CategoryCardHeader
          category={category}
          createCategoryAction={createCategoryAction}
          onRequestDelete={onRequestDelete}
          updateCategoryAction={updateCategoryAction}
        />
        <CategoryCardBudget category={category} />
      </CardContent>
    </Card>
  );
}

type DeleteCategoryDialogProps = {
  readonly category: CategoryOverviewItem | null;
  readonly isPending: boolean;
  readonly onConfirm: () => void;
  readonly onOpenChange: (open: boolean) => void;
};

function DeleteCategoryDialog({
  category,
  isPending,
  onConfirm,
  onOpenChange,
}: DeleteCategoryDialogProps) {
  const { t } = useI18n();

  return (
    <AlertDialog open={Boolean(category)} onOpenChange={onOpenChange}>
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
              onConfirm();
            }}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type CategoriesHeaderProps = {
  readonly activeTab: string;
  readonly createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  readonly setActiveTab: (tab: string) => void;
};

function CategoriesHeader({
  activeTab,
  createCategoryAction,
  setActiveTab,
}: CategoriesHeaderProps) {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        title={t("screen.categories.title")}
        description={t("screen.categories.description")}
        actions={
          <NewCategoryDialog createCategoryAction={createCategoryAction}>
            <Button className="gap-2 text-background">
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
    </>
  );
}

type CategoryGridProps = {
  readonly categories: CategoryOverviewItem[];
  readonly createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  readonly onRequestDelete: (category: CategoryOverviewItem) => void;
  readonly updateCategoryAction: (data: UpdateCategoryInput) => Promise<void>;
};

function CategoryGrid({
  categories,
  createCategoryAction,
  onRequestDelete,
  updateCategoryAction,
}: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          createCategoryAction={createCategoryAction}
          onRequestDelete={onRequestDelete}
          updateCategoryAction={updateCategoryAction}
        />
      ))}
    </div>
  );
}

type PerformCategoryDeleteOptions = {
  categoryId: string;
  deleteCategoryAction: (categoryId: string) => Promise<void>;
  errorMessage: string;
  onDone: () => void;
  successMessage: string;
};

async function performCategoryDelete({
  categoryId,
  deleteCategoryAction,
  errorMessage,
  onDone,
  successMessage,
}: PerformCategoryDeleteOptions) {
  try {
    await deleteCategoryAction(categoryId);
    toast.success(successMessage);
    onDone();
  } catch (error) {
    console.error("Error deleting category:", error);
    toast.error(errorMessage);
  }
}

function useCategoryDeleteHandler(
  deleteCategoryAction: (categoryId: string) => Promise<void>,
  deletingCategory: CategoryOverviewItem | null,
  onDeleted: () => void,
) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;
    startTransition(() =>
      performCategoryDelete({
        categoryId: deletingCategory.id,
        deleteCategoryAction,
        errorMessage: t("category.deleteError"),
        onDone: onDeleted,
        successMessage: t("category.deleteSuccess"),
      }),
    );
  };

  return { handleDeleteCategory, isPending };
}

export function CategoriesScreen({
  categories,
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
}: CategoriesScreenProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [deletingCategory, setDeletingCategory] =
    useState<CategoryOverviewItem | null>(null);
  const { handleDeleteCategory, isPending } = useCategoryDeleteHandler(
    deleteCategoryAction,
    deletingCategory,
    () => setDeletingCategory(null),
  );

  const filteredCategories =
    activeTab === "all"
      ? categories
      : categories.filter((category) => category.group === activeTab);

  return (
    <>
      <CategoriesHeader
        activeTab={activeTab}
        createCategoryAction={createCategoryAction}
        setActiveTab={setActiveTab}
      />

      <CategoryGrid
        categories={filteredCategories}
        createCategoryAction={createCategoryAction}
        onRequestDelete={setDeletingCategory}
        updateCategoryAction={updateCategoryAction}
      />

      <DeleteCategoryDialog
        category={deletingCategory}
        isPending={isPending}
        onConfirm={handleDeleteCategory}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null);
        }}
      />
    </>
  );
}
