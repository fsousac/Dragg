"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isValid, parse } from "date-fns";
import { Calendar, Check, FileText, Plus, Tag } from "lucide-react";
import { toast } from "sonner";

import { NewCategoryDialog } from "@/components/dashboard/new-category-dialog";
import { CompactInput } from "@/components/dashboard/form-inputs/compact-input";
import { CompactSelect } from "@/components/dashboard/form-inputs/compact-select";
import { CompactTextarea } from "@/components/dashboard/form-inputs/compact-textarea";
import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
import { withSelectedMonth } from "@/components/dashboard/month-route";
import { Button } from "@/components/ui/button";
import {
  type CreateCategoryInput,
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
  type CreatePaymentMethodInput,
} from "@/lib/finance/transactions";
import { NewPaymentMethodDialog } from "@/components/dashboard/new-payment-method-dialog";
import { useI18n } from "@/lib/i18n";

export interface TransactionFormData {
  type: "income" | "expense" | "saving";
  date: string;
  amount: number;
  category: string;
  paymentMethod: string;
  installmentCount: number;
  description: string;
  notes?: string;
}

type TransactionFormProps = {
  categories: TransactionFormCategory[];
  createCategoryAction?: (data: CreateCategoryInput) => Promise<void>;
  createPaymentMethodAction?: (data: CreatePaymentMethodInput) => Promise<void>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  paymentMethods: TransactionFormPaymentMethod[];
};

function getCategoryChipClass(group: string | undefined, isSelected: boolean) {
  if (!isSelected)
    return "border-border/40 text-foreground/70 hover:border-border/60 hover:bg-foreground/5";
  switch (group) {
    case "needs":
      return "border-blue-500/40 bg-blue-500/15 text-blue-400";
    case "wants":
      return "border-yellow-400/40 bg-yellow-400/15 text-yellow-500 dark:text-yellow-400";
    case "savings":
      return "border-green-500/40 bg-green-500/15 text-green-400";
    case "income":
      return "border-positive/40 bg-positive/15 text-positive";
    default:
      return "border-foreground/30 bg-foreground/10 text-foreground";
  }
}

export function TransactionForm({
  categories,
  createCategoryAction,
  createPaymentMethodAction,
  onSubmit,
  paymentMethods,
}: TransactionFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = format(new Date(), "dd/MM/yyyy");
  const todayDateInputValue = format(new Date(), "yyyy-MM-dd");

  const [errors, setErrors] = useState<
    Partial<Record<keyof TransactionFormData, string>>
  >({});
  const [formData, setFormData] = useState<TransactionFormData>({
    type: "expense",
    date: today,
    amount: 0,
    category:
      categories.find(
        (category) => category.id !== "none" && category.group !== "income",
      )?.id ?? "none",
    paymentMethod: paymentMethods[0]?.id ?? "none",
    installmentCount: 1,
    description: "",
    notes: "",
  });
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.id !== "none" && category.group !== "income",
      ),
    [categories],
  );
  const incomeCategory = useMemo(
    () => categories.find((category) => category.group === "income"),
    [categories],
  );
  const savingsCategories = useMemo(
    () => expenseCategories.filter((category) => category.group === "savings"),
    [expenseCategories],
  );
  const fallbackExpenseCategoryId = expenseCategories[0]?.id ?? "none";
  const fallbackSavingsCategoryId =
    savingsCategories[0]?.id ?? fallbackExpenseCategoryId;
  const incomeCategoryOption = useMemo(
    () => ({
      value: incomeCategory?.id ?? "none",
      label: t(incomeCategory?.label ?? "data.category.receipts"),
      icon: incomeCategory?.icon ?? "💼",
      group: "income" as const,
    }),
    [incomeCategory, t],
  );
  const incomeCategoryId = incomeCategoryOption.value;

  const categoryOptions = useMemo(
    () =>
      [...expenseCategories]
        .sort((left, right) => {
          const order = { needs: 0, wants: 1, savings: 2 };
          return (
            order[left.group as keyof typeof order] -
            order[right.group as keyof typeof order]
          );
        })
        .map((category) => ({
          value: category.id,
          label: t(category.label),
          group: category.group,
          icon: category.icon,
        })),
    [expenseCategories, t],
  );
  const savingsCategoryOptions = useMemo(
    () =>
      savingsCategories.map((category) => ({
        value: category.id,
        label: t(category.label),
        group: category.group,
        icon: category.icon,
      })),
    [savingsCategories, t],
  );

  const expenseOnlyCategoryOptions = useMemo(
    () => categoryOptions.filter((opt) => opt.group !== "savings"),
    [categoryOptions],
  );

  const displayedCategoryOptions =
    formData.type === "income"
      ? [incomeCategoryOption]
      : formData.type === "saving"
        ? savingsCategoryOptions.length > 0
          ? savingsCategoryOptions
          : categoryOptions
        : expenseOnlyCategoryOptions;

  useEffect(() => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      category:
        currentFormData.type === "income"
          ? incomeCategoryId
          : currentFormData.type === "saving"
            ? savingsCategories.some(
                (category) => category.id === currentFormData.category,
              )
              ? currentFormData.category
              : fallbackSavingsCategoryId
            : expenseCategories.some(
                  (category) => category.id === currentFormData.category,
                )
              ? currentFormData.category
              : fallbackExpenseCategoryId,
      paymentMethod:
        currentFormData.paymentMethod !== "none"
          ? currentFormData.paymentMethod
          : (paymentMethods[0]?.id ?? "none"),
    }));
  }, [
    expenseCategories,
    fallbackExpenseCategoryId,
    fallbackSavingsCategoryId,
    incomeCategoryId,
    paymentMethods,
    savingsCategories,
  ]);

  const parseDateValue = (dateValue: string) =>
    parse(dateValue, "dd/MM/yyyy", new Date());

  const toDateInputValue = (dateValue: string) => {
    const parsedDate = parseDateValue(dateValue);
    return isValid(parsedDate) ? format(parsedDate, "yyyy-MM-dd") : "";
  };

  const fromDateInputValue = (dateValue: string) => {
    const parsedDate = parse(dateValue, "yyyy-MM-dd", new Date());
    return isValid(parsedDate) ? format(parsedDate, "dd/MM/yyyy") : "";
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const parsedDate = parseDateValue(formData.date);

    if (!formData.date || !isValid(parsedDate)) {
      newErrors.date = t("common.required");
    }
    if (formData.amount <= 0) {
      newErrors.amount = t("common.required");
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = t("common.required");
    }
    if (!formData.description?.trim()) {
      newErrors.description = t("common.required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      type: "expense",
      date: today,
      amount: 0,
      category: fallbackExpenseCategoryId,
      paymentMethod: paymentMethods[0]?.id ?? "none",
      installmentCount: 1,
      description: "",
      notes: "",
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSubmit(formData);
      toast.success(t("transaction.recordSuccess"));
      resetForm();
      router.refresh();
    } catch (error) {
      console.error("Error submitting transaction:", error);
      toast.error(t("transaction.recordError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentMethodChange = (value: string) => {
    const nextPaymentMethod = paymentMethods.find((pm) => pm.id === value);
    const nextPaymentMethodLabel = nextPaymentMethod
      ? t(nextPaymentMethod.label).toLowerCase()
      : "";
    const nextCanInstallment =
      nextPaymentMethod?.type === "credit" ||
      nextPaymentMethod?.type === "boleto" ||
      nextPaymentMethodLabel.includes("boleto");

    setFormData({
      ...formData,
      installmentCount: nextCanInstallment ? formData.installmentCount : 1,
      paymentMethod: value,
    });
  };

  const selectedPaymentMethod = paymentMethods.find(
    (pm) => pm.id === formData.paymentMethod,
  );
  const selectedPaymentMethodLabel = selectedPaymentMethod
    ? t(selectedPaymentMethod.label).toLowerCase()
    : "";
  const canInstallment =
    formData.type === "expense" &&
    (selectedPaymentMethod?.type === "credit" ||
      selectedPaymentMethod?.type === "boleto" ||
      selectedPaymentMethodLabel.includes("boleto"));

  const installmentOptions = [
    { value: "1", label: t("transaction.installmentOption.full") },
    { value: "2", label: "2x" },
    { value: "3", label: "3x" },
    { value: "4", label: "4x" },
    { value: "5", label: "5x" },
    { value: "6", label: "6x" },
    { value: "7", label: "7x" },
    { value: "8", label: "8x" },
    { value: "9", label: "9x" },
    { value: "10", label: "10x" },
    { value: "11", label: "11x" },
    { value: "12", label: "12x" },
    { value: "24", label: "24x" },
  ];

  const getSubmitButtonClasses = () => {
    if (formData.type === "expense") {
      return "bg-linear-to-r from-rose-300 to-orange-300 hover:from-rose-400 hover:to-orange-400 text-rose-900";
    }
    if (formData.type === "saving") {
      return "bg-linear-to-r from-blue-300 to-violet-300 hover:from-blue-400 hover:to-violet-400 text-blue-900";
    }
    return "bg-linear-to-r from-emerald-300 to-blue-300 hover:from-emerald-400 hover:to-blue-400 text-emerald-900";
  };

  const sectionLabel =
    "mb-2.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground";
  const chipBase =
    "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer max-w-full";
  const chipAddAction =
    "border-dashed border-border/40 text-foreground/50 hover:border-border/60 hover:text-foreground/70";

  return (
    <div className="w-full min-w-0">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 min-w-0">
        {/* Type selector */}
        <div className="flex w-full gap-1 rounded-lg border border-border/40 bg-muted/20 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-200 ${
              formData.type === "expense"
                ? "bg-red-500/20 border border-red-500/40 text-red-400 shadow-sm"
                : "text-foreground/60 hover:text-foreground/80"
            }`}
            onClick={() =>
              setFormData({
                ...formData,
                category: expenseCategories.some(
                  (c) => c.id === formData.category,
                )
                  ? formData.category
                  : fallbackExpenseCategoryId,
                type: "expense",
              })
            }
          >
            {t("transaction.typeExpense")}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-200 ${
              formData.type === "income"
                ? "bg-green-500/20 border border-green-500/40 text-green-400 shadow-sm"
                : "text-foreground/60 hover:text-foreground/80"
            }`}
            onClick={() =>
              setFormData({
                ...formData,
                category: incomeCategoryId,
                installmentCount: 1,
                type: "income",
              })
            }
          >
            {t("transaction.typeIncome")}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-200 ${
              formData.type === "saving"
                ? "bg-blue-500/20 border border-blue-500/40 text-blue-400 shadow-sm"
                : "text-foreground/60 hover:text-foreground/80"
            }`}
            onClick={() =>
              setFormData({
                ...formData,
                category: fallbackSavingsCategoryId,
                installmentCount: 1,
                type: "saving",
              })
            }
          >
            {t("transaction.typeSaving")}
          </button>
        </div>

        {/* Amount */}
        <div className="rounded-xl border border-border/40 bg-card px-4 py-5">
          <p className="mb-3 text-center text-sm text-muted-foreground">
            {t("transaction.amount")}
          </p>
          <div className="flex items-center justify-center align-middle gap-1.5 mx-2">
            <span
              className={`text-md font-semibold pt-1.5 ${
                formData.type === "expense"
                  ? "text-red-400"
                  : formData.type === "income"
                    ? "text-green-400"
                    : "text-blue-400"
              }`}
            >
              R$
            </span>
            <CurrencyInput
              id="amount"
              label={t("transaction.amount")}
              labelClassName="sr-only"
              className="max-w-[80%] min-w-fit"
              value={formData.amount}
              onValueChange={(amount) => setFormData({ ...formData, amount })}
              inputClassName="w-fill border-0 bg-transparent p-0 text-center !text-3xl font-bold tabular-nums shadow-none placeholder:text-foreground/25 focus-visible:ring-0"
            />
          </div>
          {errors.amount && (
            <p className="mt-2 text-center text-xs text-destructive">
              {errors.amount}
            </p>
          )}
        </div>

        {/* Two-column grid on desktop */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5 min-w-0">
          {/* ── Left: Amount + Category ── */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* Category chips */}
            <div>
              <span className={sectionLabel}>{t("transaction.category")}</span>
              <div className="flex flex-wrap gap-2 min-w-0 max-w-full">
                {displayedCategoryOptions.map((option) => {
                  const isSelected = formData.category === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, category: option.value })
                      }
                      className={`${chipBase} ${getCategoryChipClass(option.group, isSelected)}`}
                    >
                      {option.icon && (
                        <span className="text-sm leading-none">
                          {option.icon}
                        </span>
                      )}
                      <span>{option.label}</span>
                    </button>
                  );
                })}
                {formData.type === "expense" && (
                  <button
                    type="button"
                    onClick={
                      createCategoryAction
                        ? () => setIsCategoryDialogOpen(true)
                        : () =>
                            router.push(
                              withSelectedMonth("/categories", searchParams),
                            )
                    }
                    className={`${chipBase} ${chipAddAction}`}
                  >
                    <Plus className="h-3 w-3" />
                    {t("transaction.addCategory")}
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* ── end left ── */}

          {/* ── Right: Description + Payment + Date + Installments + Notes ── */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* Description */}
            <CompactInput
              label={t("transaction.description")}
              id="description"
              type="text"
              placeholder={t("transaction.descriptionPlaceholder")}
              value={formData.description}
              onChange={(event) =>
                setFormData({ ...formData, description: event.target.value })
              }
              icon={<Tag className="w-4 h-4" />}
              error={errors.description}
            />

            {/* Payment method chips */}
            <div>
              <span className={sectionLabel}>
                {t("transaction.paymentMethod")}
              </span>
              <div className="flex flex-wrap gap-2 min-w-0 max-w-full">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => handlePaymentMethodChange(pm.id)}
                    className={`${chipBase} ${
                      formData.paymentMethod === pm.id
                        ? "border-green-500 bg-green-500/20 text-green-400 font-semibold"
                        : "border-border/40 text-foreground/70 hover:border-border/60 hover:bg-foreground/5"
                    }`}
                  >
                    {t(pm.label)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    createPaymentMethodAction
                      ? setIsPaymentDialogOpen(true)
                      : router.push(
                          withSelectedMonth("/payments", searchParams),
                        )
                  }
                  className={`${chipBase} ${chipAddAction}`}
                >
                  <Plus className="h-3 w-3" />
                  {t("transaction.addPaymentMethod")}
                </button>
              </div>
              {errors.paymentMethod && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.paymentMethod}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 min-w-0">
              <CompactInput
                label={t("transaction.date")}
                id="date"
                type="date"
                placeholder="dd/MM/yyyy"
                value={toDateInputValue(formData.date) || todayDateInputValue}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    date: fromDateInputValue(event.target.value),
                  })
                }
                icon={<Calendar className="w-4 h-4" />}
                error={errors.date}
                inputClassName="w-full max-w-full min-w-0 appearance-none overflow-hidden pr-3 text-left [&::-webkit-calendar-picker-indicator]:shrink-0 [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:overflow-hidden [&::-webkit-date-and-time-value]:text-left"
              />

              {/* Installments (conditional) */}
              {canInstallment ? (
                <CompactSelect
                  label={t("transaction.installmentFrequency")}
                  id="installment"
                  value={formData.installmentCount.toString()}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      installmentCount: parseInt(value, 10),
                    })
                  }
                  options={installmentOptions}
                />
              ) : null}
            </div>

            {/* Notes */}
            <CompactTextarea
              label={t("transaction.notes")}
              id="notes"
              value={formData.notes || ""}
              onChange={(event) =>
                setFormData({ ...formData, notes: event.target.value })
              }
              placeholder={t("transaction.notesPlaceholder")}
              icon={<FileText className="w-4 h-4" />}
            />
          </div>
          {/* ── end right ── */}
        </div>

        {/* Submit — full width */}
        <Button
          type="submit"
          disabled={isLoading}
          className={`
            w-full h-11 font-semibold text-sm
            ${getSubmitButtonClasses()}
            shadow-lg hover:shadow-xl
            transition-all duration-300 active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          `}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t("transaction.saving")}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {t("transaction.save")}
            </>
          )}
        </Button>
      </form>

      {createCategoryAction ? (
        <NewCategoryDialog
          createCategoryAction={createCategoryAction}
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
        />
      ) : null}

      {createPaymentMethodAction ? (
        <NewPaymentMethodDialog
          createPaymentMethodAction={createPaymentMethodAction}
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          onCreated={() => setIsPaymentDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
