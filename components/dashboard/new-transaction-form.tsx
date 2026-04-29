"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { categories } from "@/lib/data";
import { CompactInput } from "@/components/dashboard/form-inputs/compact-input";
import { CompactSelect } from "@/components/dashboard/form-inputs/compact-select";
import { CompactTextarea } from "@/components/dashboard/form-inputs/compact-textarea";
import {
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  FileText,
  Zap,
  ArrowRight,
  Plus,
} from "lucide-react";
import { format, isValid, parse } from "date-fns";

export interface NewTransactionFormData {
  type: "income" | "expense";
  date: string;
  amount: number;
  category: string;
  paymentMethod: string;
  installmentCount: number;
  description?: string;
}

interface NewTransactionFormProps {
  onSubmit?: (data: NewTransactionFormData) => void | Promise<void>;
  isLoading?: boolean;
  compact?: boolean;
}

export function NewTransactionForm({
  onSubmit,
  isLoading = false,
  compact = false,
}: NewTransactionFormProps) {
  const { t } = useI18n();
  const today = format(new Date(), "dd/MM/yyyy");

  const parseDateValue = (dateValue: string) =>
    parse(dateValue, "dd/MM/yyyy", new Date());

  const [formData, setFormData] = useState<NewTransactionFormData>({
    type: "expense",
    date: today,
    amount: 0,
    category: "data.category.housing",
    paymentMethod: "credit-card",
    installmentCount: 1,
    description: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof NewTransactionFormData, string>>
  >({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const parsedDate = parseDateValue(formData.date);
    if (!formData.date || !isValid(parsedDate))
      newErrors.date = t("common.cancel");
    if (formData.amount <= 0) newErrors.amount = t("common.cancel");
    if (!formData.paymentMethod) newErrors.paymentMethod = t("common.cancel");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (onSubmit) {
        await onSubmit(formData);
        setFormData({
          type: "expense",
          date: today,
          amount: 0,
          category: "data.category.housing",
          paymentMethod: "credit-card",
          installmentCount: 1,
          description: "",
        });
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
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
          value: category.nameKey,
          label: t(category.nameKey),
          icon: category.icon,
          group: category.group,
        })),
    [t],
  );

  const selectedCategory = categoryOptions.find(
    (category) => category.value === formData.category,
  );

  const paymentMethods = [
    { value: "credit-card", label: t("transaction.paymentMethods.creditCard") },
    { value: "debit-card", label: t("transaction.paymentMethods.debitCard") },
    { value: "cash", label: t("transaction.paymentMethods.cash") },
    { value: "bank-transfer", label: t("transaction.paymentMethods.transfer") },
    { value: "pix", label: t("transaction.paymentMethods.pix") },
  ];

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

  const installmentPerValue =
    formData.installmentCount && formData.installmentCount > 0
      ? formData.amount / formData.installmentCount
      : formData.amount;

  // Dynamic color classes based on transaction type
  const getSubmitButtonClasses = () => {
    if (formData.type === "expense") {
      return "bg-linear-to-r from-rose-300 to-orange-300 hover:from-rose-400 hover:to-orange-400 text-rose-900";
    }
    return "bg-linear-to-r from-emerald-300 to-blue-300 hover:from-emerald-400 hover:to-blue-400 text-emerald-900";
  };

  const containerClasses = compact
    ? "w-full"
    : "min-h-screen bg-gradient-to-br from-background via-background to-background/80 p-4 lg:p-6";

  const contentClasses = compact
    ? ""
    : "max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Form Section */}
        <div className={compact ? "" : "flex-1"}>
          {!compact && (
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-linear-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  {t("transaction.add.title")}
                </h1>
              </div>
              <p className="text-foreground/60 text-lg">
                {t("transaction.add.subtitle")}
              </p>
            </div>
          )}

          <Card
            className={`
            border-border/40 bg-linear-to-br from-card/60 via-card/40 to-card/20
            backdrop-blur-xl shadow-2xl transition-all duration-500
            ${compact ? "p-4" : "p-6 lg:p-8"}
            ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}
          `}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: Type + Amount (Semantic Pair) */}
              {/* Type Toggle */}
              <div>
                <Label className="text-xs font-medium text-foreground/60 uppercase tracking-wide mb-2 block">
                  {t("transaction.type")}
                </Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className={`px-4 h-8 text-xs font-medium transition-all duration-300 ${
                      formData.type === "expense"
                        ? "bg-rose-300/70 hover:bg-rose-400/70 text-rose-900 shadow-sm border-rose-400/50"
                        : "border-border/40 hover:bg-foreground/5"
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, type: "expense" })
                    }
                  >
                    {t("transaction.typeExpense")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`px-4 h-8 text-xs font-medium transition-all duration-300 ${
                      formData.type === "income"
                        ? "bg-emerald-300/70 hover:bg-emerald-400/70 text-emerald-900 shadow-sm border-emerald-400/50"
                        : "border-border/40 hover:bg-foreground/5"
                    }`}
                    onClick={() => setFormData({ ...formData, type: "income" })}
                  >
                    {t("transaction.typeIncome")}
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <CompactInput
                label={t("transaction.amount")}
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                icon={<DollarSign className="w-4 h-4" />}
                error={errors.amount}
              />

              {/* Row 2: Category + Payment Method (Semantic Pair) */}
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <CompactSelect
                  label={t("transaction.category")}
                  id="category"
                  value={formData.category}
                  onChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                  options={categoryOptions}
                  icon={<Tag className="w-4 h-4" />}
                />

                <CompactSelect
                  label={t("transaction.paymentMethod")}
                  id="payment"
                  value={formData.paymentMethod}
                  onChange={(value) =>
                    setFormData({ ...formData, paymentMethod: value })
                  }
                  options={paymentMethods}
                  error={errors.paymentMethod}
                  icon={<CreditCard className="w-4 h-4" />}
                />
              </div>

              {/* Row 3: Date + Installment Frequency (Semantic Pair) */}
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <CompactInput
                  label={t("transaction.date")}
                  id="date"
                  type="text"
                  placeholder="dd/MM/yyyy"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  icon={<Calendar className="w-4 h-4" />}
                  error={errors.date}
                />

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
              </div>

              {/* Row 4: Notes (Full Width) */}
              <CompactTextarea
                label={t("transaction.notes")}
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional notes about this transaction..."
                icon={<FileText className="w-4 h-4" />}
              />

              {/* Row 5: Submit Button */}
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

        {/* Summary Section (Desktop Only) */}
        {!compact && (
          <div className="hidden lg:flex lg:flex-col lg:w-80 gap-4">
            {/* Summary Card */}
            <Card
              className={`border-border/40 bg-linear-to-br ${
                formData.type === "expense"
                  ? "from-rose-200/40 via-rose-100/20 to-transparent"
                  : "from-emerald-200/40 via-emerald-100/20 to-transparent"
              } backdrop-blur-xl p-6 sticky top-8 transition-all duration-500`}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-foreground/60 uppercase tracking-wide mb-1">
                    {t("transaction.summary")}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-bold bg-linear-to-r ${
                        formData.type === "expense"
                          ? "from-rose-400 to-orange-400"
                          : "from-emerald-400 to-blue-400"
                      } bg-clip-text text-transparent transition-all duration-500`}
                    >
                      ${formData.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div
                  className={`h-px bg-linear-to-r ${
                    formData.type === "expense"
                      ? "from-red-500/20 via-red-500/50 to-transparent"
                      : "from-emerald-500/20 via-emerald-500/50 to-transparent"
                  } transition-all duration-500`}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">
                      {formData.type === "income"
                        ? t("transaction.typeIncome")
                        : t("transaction.typeExpense")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">
                      {selectedCategory?.icon} {selectedCategory?.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">
                      {
                        paymentMethods.find(
                          (m) => m.value === formData.paymentMethod,
                        )?.label
                      }
                    </span>
                  </div>

                  {formData.installmentCount &&
                    formData.installmentCount > 0 && (
                      <div
                        className={`pt-2 border-t ${
                          formData.type === "expense"
                            ? "border-rose-300/40"
                            : "border-emerald-300/40"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between text-sm font-medium ${
                            formData.type === "expense"
                              ? "text-rose-600"
                              : "text-emerald-600"
                          } transition-all duration-500`}
                        >
                          <span>{formData.installmentCount}x</span>
                          <span>
                            ${installmentPerValue.toFixed(2)}
                            {t("transaction.perInstallment")}
                          </span>
                        </div>
                      </div>
                    )}
                </div>

                <div
                  className={`h-px bg-linear-to-r ${
                    formData.type === "expense"
                      ? "from-rose-400/30 via-rose-300/50 to-transparent"
                      : "from-emerald-400/30 via-emerald-300/50 to-transparent"
                  } transition-all duration-500`}
                />

                <div className="text-xs text-foreground/50 space-y-1">
                  <p>📅 {formData.date}</p>
                  <p>✨ {t("common.all")} calculations in real-time</p>
                </div>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="border-border/40 bg-card/40 backdrop-blur-xl p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-primary/80 uppercase tracking-wide mb-2">
                  50/30/20 Rule
                </p>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Organize your spending: 50% for needs, 30% for wants, and 20%
                  for savings.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
