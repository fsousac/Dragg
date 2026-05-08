"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isValid, parse } from "date-fns";
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { NewCategoryDialog } from "@/components/dashboard/new-category-dialog";
import { CompactInput } from "@/components/dashboard/form-inputs/compact-input";
import { CompactSelect } from "@/components/dashboard/form-inputs/compact-select";
import { CompactTextarea } from "@/components/dashboard/form-inputs/compact-textarea";
import { withSelectedMonth } from "@/components/dashboard/month-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  type CreateCategoryInput,
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
  type CreatePaymentMethodInput,
} from "@/lib/finance/transactions";
import { NewPaymentMethodDialog } from "@/components/dashboard/new-payment-method-dialog";
import { useI18n } from "@/lib/i18n";

export interface TransactionFormData {
  type: "income" | "expense";
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

  const [amountInputValue, setAmountInputValue] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<keyof TransactionFormData, string>>
  >({});
  const [formData, setFormData] = useState<TransactionFormData>({
    type: "expense",
    date: today,
    amount: 0,
    category: categories[0]?.id ?? "none",
    paymentMethod: paymentMethods[0]?.id ?? "none",
    installmentCount: 1,
    description: "",
    notes: "",
  });
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      category:
        currentFormData.type === "income"
          ? "none"
          : currentFormData.category !== "none"
            ? currentFormData.category
            : (categories[0]?.id ?? "none"),
      paymentMethod:
        currentFormData.paymentMethod !== "none"
          ? currentFormData.paymentMethod
          : (paymentMethods[0]?.id ?? "none"),
    }));
  }, [categories, paymentMethods]);

  useEffect(() => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      category:
        currentFormData.type === "income"
          ? "none"
          : currentFormData.category !== "none"
          ? currentFormData.category
          : (categories[0]?.id ?? "none"),
    }));
  }, [categories]);

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

  const sanitizeAmountInput = (value: string) => {
    const normalizedSeparator = value.replace(/\./g, ",");
    const sanitizedValue = normalizedSeparator.replace(/[^\d,]/g, "");
    const [integerPart, ...decimalParts] = sanitizedValue.split(",");
    const decimalPart = decimalParts.join("");

    if (decimalParts.length === 0) {
      return integerPart;
    }

    return `${integerPart},${decimalPart}`;
  };

  const parseAmountInput = (value: string) =>
    Number(value.replace(",", ".")) || 0;

  const formatAmountInput = (value: number) =>
    value.toFixed(2).replace(".", ",");

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const parsedDate = parseDateValue(formData.date);

    if (!formData.date || !isValid(parsedDate)) {
      newErrors.date = t("common.cancel");
    }
    if (formData.amount <= 0) {
      newErrors.amount = t("common.cancel");
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = t("common.cancel");
    }
    if (!formData.description?.trim()) {
      newErrors.description = t("common.cancel");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      type: "expense",
      date: today,
      amount: 0,
      category: categories[0]?.id ?? "none",
      paymentMethod: paymentMethods[0]?.id ?? "none",
      installmentCount: 1,
      description: "",
      notes: "",
    });
    setAmountInputValue("");
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

  const categoryOptions = useMemo(
    () =>
      [...categories]
        .sort((left, right) => {
          const order = { needs: 0, wants: 1, savings: 2, income: 3 };
          return order[left.group] - order[right.group];
        })
        .map((category) => ({
          value: category.id,
          label: t(category.label),
          group: category.group,
          icon: category.icon,
        })),
    [categories, t],
  );
  const displayedCategoryOptions =
    formData.type === "income"
      ? [
          {
            value: "none",
            label: t("data.category.receipts"),
            icon: "💼",
          },
        ]
      : categoryOptions;

  const paymentMethodOptions = paymentMethods.map((paymentMethod) => ({
    value: paymentMethod.id,
    label: t(paymentMethod.label),
  }));

  const selectedPaymentMethod = paymentMethods.find(
    (paymentMethod) => paymentMethod.id === formData.paymentMethod,
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

    return "bg-linear-to-r from-emerald-300 to-blue-300 hover:from-emerald-400 hover:to-blue-400 text-emerald-900";
  };

  return (
    <div className="w-full">
      <Card
        className={`
          border-border/40 bg-linear-to-br from-card/60 via-card/40 to-card/20
          p-4 backdrop-blur-xl shadow-2xl transition-all duration-500
          ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        `}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-xs font-medium text-foreground/60 uppercase tracking-wide mb-2 block">
              {t("transaction.type")}
            </Label>
            <div className="flex w-full gap-3 lg:w-1/2">
              <Button
                type="button"
                variant="outline"
                className={`h-8 flex-1 px-4 text-xs font-medium transition-all duration-300 ${
                  formData.type === "expense"
                    ? "border-rose-400/60 bg-rose-300/70 text-rose-900 shadow-sm hover:bg-rose-400/70 dark:border-rose-400/50 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30"
                    : "border-border/40 text-foreground/80 hover:bg-foreground/5"
                }`}
                onClick={() =>
                  setFormData({
                    ...formData,
                    category:
                      formData.category === "none"
                        ? (categories[0]?.id ?? "none")
                        : formData.category,
                    type: "expense",
                  })
                }
              >
                {t("transaction.typeExpense")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`h-8 flex-1 px-4 text-xs font-medium transition-all duration-300 ${
                  formData.type === "income"
                    ? "border-emerald-400/60 bg-emerald-300/70 text-emerald-900 shadow-sm hover:bg-emerald-400/70 dark:border-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/30"
                    : "border-border/40 text-foreground/80 hover:bg-foreground/5"
                }`}
                onClick={() =>
                  setFormData({
                    ...formData,
                    category: "none",
                    installmentCount: 1,
                    type: "income",
                  })
                }
              >
                {t("transaction.typeIncome")}
              </Button>
            </div>
          </div>

          <CompactInput
            label={t("transaction.amount")}
            id="amount"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[,.]?[0-9]*"
            placeholder="0,00"
            value={amountInputValue}
            onChange={(event) => {
              const nextAmountInputValue = sanitizeAmountInput(
                event.target.value,
              );
              setAmountInputValue(nextAmountInputValue);
              setFormData({
                ...formData,
                amount: parseAmountInput(nextAmountInputValue),
              });
            }}
            onBlur={() => {
              if (!amountInputValue) return;
              setAmountInputValue(formatAmountInput(formData.amount));
            }}
            icon={<DollarSign className="w-4 h-4" />}
            error={errors.amount}
          />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 lg:gap-4">
            <div className="lg:col-span-2">
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
            </div>

            <CompactSelect
              label={t("transaction.category")}
              id="category"
              value={formData.category}
              onChange={(value) =>
                setFormData({ ...formData, category: value })
              }
              options={displayedCategoryOptions}
              disabled={formData.type === "income"}
              icon={<Tag className="w-4 h-4" />}
              addActionLabel={
                formData.type === "income"
                  ? undefined
                  : t("transaction.addCategory")
              }
              onAddAction={
                formData.type === "income"
                  ? undefined
                  : createCategoryAction
                  ? () => setIsCategoryDialogOpen(true)
                  : () =>
                      router.push(
                        withSelectedMonth("/categories", searchParams),
                      )
              }
            />

            {createCategoryAction ? (
              <NewCategoryDialog
                createCategoryAction={createCategoryAction}
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
              />
            ) : null}

            <CompactSelect
              label={t("transaction.paymentMethod")}
              id="payment"
              value={formData.paymentMethod}
              onChange={(value) => {
                const nextPaymentMethod = paymentMethods.find(
                  (paymentMethod) => paymentMethod.id === value,
                );
                const nextPaymentMethodLabel = nextPaymentMethod
                  ? t(nextPaymentMethod.label).toLowerCase()
                  : "";
                const nextCanInstallment =
                  nextPaymentMethod?.type === "credit" ||
                  nextPaymentMethod?.type === "boleto" ||
                  nextPaymentMethodLabel.includes("boleto");

                setFormData({
                  ...formData,
                  installmentCount: nextCanInstallment
                    ? formData.installmentCount
                    : 1,
                  paymentMethod: value,
                });
              }}
              options={paymentMethodOptions}
              error={errors.paymentMethod}
              icon={<CreditCard className="w-4 h-4" />}
              addActionLabel={t("transaction.addPaymentMethod")}
              onAddAction={() =>
                createPaymentMethodAction
                  ? setIsPaymentDialogOpen(true)
                  : router.push(withSelectedMonth("/payments", searchParams))
              }
            />

            {createPaymentMethodAction ? (
              <NewPaymentMethodDialog
                createPaymentMethodAction={createPaymentMethodAction}
                open={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                onCreated={() => setIsPaymentDialogOpen(false)}
              />
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 lg:gap-4">
            <div className="lg:col-span-2">
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
                inputClassName="max-w-full min-w-0 appearance-none overflow-hidden pr-3 [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left"
              />
            </div>

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

          <Button
            type="submit"
            disabled={isLoading}
            className={`
              w-full h-10 mt-6 font-semibold text-sm
              ${getSubmitButtonClasses()}
              shadow-lg hover:shadow-xl
              transition-all duration-300 transform active:scale-95
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
                <Plus className="w-4 h-4" />
                {t("transaction.save")}
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
