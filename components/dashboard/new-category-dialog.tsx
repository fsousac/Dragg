"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Plus, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

type NewCategoryDialogProps = {
  category?: UpdateCategoryInput & {
    showName?: boolean;
  };
  children?: ReactNode;
  createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  onCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  updateCategoryAction?: (data: UpdateCategoryInput) => Promise<void>;
};

type CategoryGroup = CreateCategoryInput["group"];

const groupOptions: CategoryGroup[] = ["needs", "wants", "savings"];
const emojiOptions = [
  "🏠",
  "🛒",
  "🚗",
  "🏥",
  "📚",
  "🧾",
  "🎮",
  "🎬",
  "🛍️",
  "📈",
  "💼",
  "🏷️",
];

function sanitizeCurrencyInput(value: string) {
  const normalizedSeparator = value.replace(/\./g, ",");
  const sanitizedValue = normalizedSeparator.replace(/[^\d,]/g, "");
  const [integerPart, ...decimalParts] = sanitizedValue.split(",");

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart},${decimalParts.join("")}`;
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function formatCurrencyInput(value: string) {
  if (!value) {
    return "";
  }

  return parseCurrencyInput(value).toFixed(2).replace(".", ",");
}

export function NewCategoryDialog({
  category,
  children,
  createCategoryAction,
  onCreated,
  open: controlledOpen,
  onOpenChange,
  updateCategoryAction,
}: NewCategoryDialogProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [icon, setIcon] = useState("🏷️");
  const [name, setName] = useState("");
  const [group, setGroup] = useState<CategoryGroup>("needs");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const isEditing = Boolean(category);

  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    setInternalOpen(nextOpen);
  };

  const resetForm = () => {
    setIcon(category?.icon ?? "🏷️");
    setName(category?.showName === false ? "" : (category?.name ?? ""));
    setGroup(category?.group ?? "needs");
    setMonthlyLimit(
      category?.monthlyLimit
        ? String(category.monthlyLimit).replace(".", ",")
        : "",
    );
  };

  useEffect(() => {
    if (open) {
      setIcon(category?.icon ?? "🏷️");
      setName(category?.showName === false ? "" : (category?.name ?? ""));
      setGroup(category?.group ?? "needs");
      setMonthlyLimit(
        category?.monthlyLimit
          ? String(category.monthlyLimit).replace(".", ",")
          : "",
      );
    }
  }, [open, category]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submittedName = name.trim() || category?.name || "";

    if (!submittedName.trim()) {
      toast.error(t("category.createValidationError"));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        group,
        icon,
        monthlyLimit: parseCurrencyInput(monthlyLimit),
        name: submittedName,
      };

      if (category && updateCategoryAction) {
        await updateCategoryAction({ ...payload, id: category.id });
        toast.success(t("category.updateSuccess"));
      } else {
        await createCategoryAction(payload);
        toast.success(t("category.createSuccess"));
      }

      resetForm();
      setOpen(false);
      onCreated?.();
      router.refresh();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(
        isEditing ? t("category.updateError") : t("category.createError"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="overflow-y-auto sm:h-[50vh] sm:w-[50vw] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("screen.categories.editCategory")
              : t("screen.categories.newCategory")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("category.editDescription")
              : t("category.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="h-fill w-fill space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">{t("common.category")}</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("category.namePlaceholder")}
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-icon">{t("category.icon")}</Label>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-lg transition-colors hover:bg-accent"
                    onClick={() => setIcon(emoji)}
                    aria-label={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("category.group")}</Label>
              <Select
                value={group}
                onValueChange={(value) => setGroup(value as CategoryGroup)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`data.group.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-limit">
                {t("category.monthlyLimit")}
              </Label>
              <Input
                id="category-limit"
                inputMode="decimal"
                pattern="[0-9]*[,.]?[0-9]*"
                placeholder="0,00"
                value={monthlyLimit}
                onChange={(event) =>
                  setMonthlyLimit(sanitizeCurrencyInput(event.target.value))
                }
                onBlur={() =>
                  setMonthlyLimit((currentValue) =>
                    formatCurrencyInput(currentValue),
                  )
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Plus className="size-4" />
              {isSaving
                ? t("category.saving")
                : isEditing
                  ? t("category.update")
                  : t("category.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
