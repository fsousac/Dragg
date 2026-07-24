"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Plus, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
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
import { cn } from "@/lib/utils";

type NewCategoryDialogProps = {
  readonly category?: UpdateCategoryInput & {
    showName?: boolean;
  };
  readonly children?: ReactNode;
  readonly createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  readonly onCreated?: () => void;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly updateCategoryAction?: (data: UpdateCategoryInput) => Promise<void>;
};

type CategoryGroup = CreateCategoryInput["group"];

const groupOptions: CategoryGroup[] = ["needs", "wants", "savings"];
const emojiOptions = [
  { emoji: "🏠", label: "Moradia" },
  { emoji: "🛒", label: "Mercado" },
  { emoji: "🍽️", label: "Alimentação" },
  { emoji: "🚗", label: "Transporte" },
  { emoji: "🏥", label: "Saúde" },
  { emoji: "🏋️", label: "Academia" },
  { emoji: "📚", label: "Educação" },
  { emoji: "🧾", label: "Contas" },
  { emoji: "💡", label: "Serviços" },
  { emoji: "🎬", label: "Assinaturas" },
  { emoji: "🎮", label: "Lazer" },
  { emoji: "🛍️", label: "Compras" },
  { emoji: "✈️", label: "Viagem" },
  { emoji: "🎁", label: "Presentes" },
  { emoji: "📈", label: "Investimentos" },
  { emoji: "🏷️", label: "Outros" },
];

type CategoryFormDefaults = {
  group: CategoryGroup;
  icon: string;
  monthlyLimit: number;
  name: string;
};

function getCategoryFormDefaults(
  category: NewCategoryDialogProps["category"],
): CategoryFormDefaults {
  if (!category) {
    return { group: "needs", icon: "🏷️", monthlyLimit: 0, name: "" };
  }

  return {
    group: category.group ?? "needs",
    icon: category.icon ?? "🏷️",
    monthlyLimit: category.monthlyLimit ?? 0,
    name: category.showName === false ? "" : (category.name ?? ""),
  };
}

function getSubmittedCategoryName(
  name: string,
  category: NewCategoryDialogProps["category"],
) {
  return name.trim() || category?.name || "";
}

function buildCategoryPayload(
  defaults: Pick<CategoryFormDefaults, "group" | "icon" | "monthlyLimit">,
  name: string,
): CreateCategoryInput {
  return {
    group: defaults.group,
    icon: defaults.icon,
    monthlyLimit: defaults.monthlyLimit,
    name,
  };
}

type CategoryNameFieldProps = {
  readonly name: string;
  readonly setName: (name: string) => void;
};

function CategoryNameField({ name, setName }: CategoryNameFieldProps) {
  const { t } = useI18n();

  return (
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
  );
}

type CategoryIconPickerProps = {
  readonly icon: string;
  readonly setIcon: (icon: string) => void;
};

function CategoryIconPicker({ icon, setIcon }: CategoryIconPickerProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <Label htmlFor="category-icon">{t("category.icon")}</Label>
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {emojiOptions.map(({ emoji, label }) => (
            <button
              key={emoji}
              type="button"
              className={cn(
                "flex size-8 items-center justify-center rounded-md border bg-background text-lg transition-colors hover:bg-accent",
                icon === emoji
                  ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                  : "border-border",
              )}
              onClick={() => setIcon(emoji)}
              aria-label={label}
              aria-pressed={icon === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type CategoryGroupAndLimitFieldsProps = {
  readonly group: CategoryGroup;
  readonly monthlyLimit: number;
  readonly setGroup: (group: CategoryGroup) => void;
  readonly setMonthlyLimit: (monthlyLimit: number) => void;
};

function CategoryGroupAndLimitFields({
  group,
  monthlyLimit,
  setGroup,
  setMonthlyLimit,
}: CategoryGroupAndLimitFieldsProps) {
  const { t } = useI18n();

  return (
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
        <CurrencyInput
          id="category-limit"
          label={t("category.monthlyLimit")}
          value={monthlyLimit}
          onValueChange={setMonthlyLimit}
          labelClassName="normal-case tracking-normal text-foreground"
        />
      </div>
    </div>
  );
}

type CategoryDialogHeaderProps = {
  readonly isEditing: boolean;
  readonly t: ReturnType<typeof useI18n>["t"];
};

function CategoryDialogHeader({ isEditing, t }: CategoryDialogHeaderProps) {
  return (
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
  );
}

type CategoryDialogFooterProps = {
  readonly isEditing: boolean;
  readonly isSaving: boolean;
  readonly setOpen: (open: boolean) => void;
};

function CategoryDialogFooter({
  isEditing,
  isSaving,
  setOpen,
}: CategoryDialogFooterProps) {
  const { t } = useI18n();
  let submitLabel = t("category.create");
  if (isSaving) {
    submitLabel = t("category.saving");
  } else if (isEditing) {
    submitLabel = t("category.update");
  }

  return (
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
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}

function useCategoryFormFields(
  category: NewCategoryDialogProps["category"],
  open: boolean,
) {
  const [icon, setIcon] = useState("🏷️");
  const [name, setName] = useState("");
  const [group, setGroup] = useState<CategoryGroup>("needs");
  const [monthlyLimit, setMonthlyLimit] = useState(0);

  const resetForm = () => {
    const defaults = getCategoryFormDefaults(category);
    setIcon(defaults.icon);
    setName(defaults.name);
    setGroup(defaults.group);
    setMonthlyLimit(defaults.monthlyLimit);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  return {
    icon,
    setIcon,
    name,
    setName,
    group,
    setGroup,
    monthlyLimit,
    setMonthlyLimit,
    resetForm,
  };
}

type CategorySubmitHandlerOptions = {
  category: NewCategoryDialogProps["category"];
  createCategoryAction: NewCategoryDialogProps["createCategoryAction"];
  updateCategoryAction: NewCategoryDialogProps["updateCategoryAction"];
  onCreated?: () => void;
  isEditing: boolean;
  fields: Pick<
    ReturnType<typeof useCategoryFormFields>,
    "name" | "group" | "icon" | "monthlyLimit" | "resetForm"
  >;
  setOpen: (open: boolean) => void;
};

function useCategorySaveReporters({
  resetForm,
  setOpen,
  onCreated,
  isEditing,
  t,
}: {
  resetForm: () => void;
  setOpen: (open: boolean) => void;
  onCreated?: () => void;
  isEditing: boolean;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const router = useRouter();

  const reportCategorySaved = (action: "create" | "update") => {
      toast.success(
        t(
          action === "update"
            ? "category.updateSuccess"
            : "category.createSuccess",
        ),
      );
      resetForm();
      setOpen(false);
      onCreated?.();
      router.refresh();
    },
    reportCategorySaveError = (error: unknown) => {
      console.error("Error saving category:", error);
      toast.error(
        isEditing ? t("category.updateError") : t("category.createError"),
      );
    };

  return { reportCategorySaved, reportCategorySaveError };
}

function useCategorySubmitHandler({
  category,
  createCategoryAction,
  updateCategoryAction,
  onCreated,
  isEditing,
  fields,
  setOpen,
}: CategorySubmitHandlerOptions) {
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);
  const { name, group, icon, monthlyLimit, resetForm } = fields;
  const { reportCategorySaved, reportCategorySaveError } =
    useCategorySaveReporters({ resetForm, setOpen, onCreated, isEditing, t });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submittedName = getSubmittedCategoryName(name, category);
    if (!submittedName.trim()) {
      toast.error(t("category.createValidationError"));
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildCategoryPayload(
        { group, icon, monthlyLimit },
        submittedName,
      );
      if (category && updateCategoryAction) {
        await updateCategoryAction({ ...payload, id: category.id });
      } else {
        await createCategoryAction(payload);
      }
      reportCategorySaved(
        category && updateCategoryAction ? "update" : "create",
      );
    } catch (error) {
      reportCategorySaveError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, handleSubmit, t };
}

function useCategoryDialogController({
  category,
  createCategoryAction,
  onCreated,
  open: controlledOpen,
  onOpenChange,
  updateCategoryAction,
}: NewCategoryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isEditing = Boolean(category);

  const open = controlledOpen ?? internalOpen,
    setOpen = (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      setInternalOpen(nextOpen);
    };

  const fields = useCategoryFormFields(category, open);

  const { isSaving, handleSubmit, t } = useCategorySubmitHandler({
    category,
    createCategoryAction,
    updateCategoryAction,
    onCreated,
    isEditing,
    fields,
    setOpen,
  });

  return { open, setOpen, isSaving, isEditing, ...fields, handleSubmit, t };
}

export function NewCategoryDialog(props: NewCategoryDialogProps) {
  const { children } = props;
  const {
    open,
    setOpen,
    isSaving,
    isEditing,
    icon,
    setIcon,
    name,
    setName,
    group,
    setGroup,
    monthlyLimit,
    setMonthlyLimit,
    handleSubmit,
    t,
  } = useCategoryDialogController(props);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="overflow-y-auto sm:h-[50vh] sm:w-[50vw] sm:max-w-none">
        <CategoryDialogHeader isEditing={isEditing} t={t} />

        <form onSubmit={handleSubmit} className="h-fill w-fill space-y-4">
          <CategoryNameField name={name} setName={setName} />
          <CategoryIconPicker icon={icon} setIcon={setIcon} />
          <CategoryGroupAndLimitFields
            group={group}
            monthlyLimit={monthlyLimit}
            setGroup={setGroup}
            setMonthlyLimit={setMonthlyLimit}
          />
          <CategoryDialogFooter
            isEditing={isEditing}
            isSaving={isSaving}
            setOpen={setOpen}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
