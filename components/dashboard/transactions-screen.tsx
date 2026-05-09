"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { withSelectedMonth } from "@/components/dashboard/month-route";
import { type TransactionFormData } from "@/components/dashboard/transaction-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Transaction, type TransactionType } from "@/lib/data";
import {
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
  type CreateCategoryInput,
  type NewTransactionInput,
  type UpdateTransactionInput,
  type CreatePaymentMethodInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { TransactionForm } from "./transaction-form";

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

type EditableTransaction = {
  amount: string;
  category: string;
  date: string;
  description: string;
  notes: string;
  paymentMethod: string;
  type: TransactionType;
};

type TransactionsScreenProps = {
  categories: TransactionFormCategory[];
  createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  createPaymentMethodAction?: (data: CreatePaymentMethodInput) => Promise<void>;
  createTransactionAction: (data: NewTransactionInput) => Promise<void>;
  deleteTransactionAction: (transactionId: string) => Promise<void>;
  paymentMethods: TransactionFormPaymentMethod[];
  showPrevious: boolean;
  transactions: Transaction[];
  updateTransactionAction: (data: UpdateTransactionInput) => Promise<void>;
};

function getInitialFormState(
  transaction: Transaction,
  incomeCategoryId: string,
): EditableTransaction {
  return {
    amount: Math.abs(transaction.amount).toFixed(2),
    category:
      transaction.type === "income"
        ? incomeCategoryId
        : (transaction.categoryId ?? "none"),
    date: transaction.date,
    description: transaction.descriptionKey,
    notes: transaction.notes ?? "",
    paymentMethod: transaction.paymentMethodId ?? "none",
    type: transaction.type,
  };
}

function parseAmountInput(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function sanitizeAmountInput(value: string) {
  const normalizedSeparator = value.replace(/\./g, ",");
  const sanitizedValue = normalizedSeparator.replace(/[^\d,]/g, "");
  const [integerPart, ...decimalParts] = sanitizedValue.split(",");

  return decimalParts.length
    ? `${integerPart},${decimalParts.join("")}`
    : integerPart;
}

export function TransactionsScreen({
  categories,
  createCategoryAction,
  createPaymentMethodAction,
  createTransactionAction,
  deleteTransactionAction,
  paymentMethods,
  showPrevious,
  transactions,
  updateTransactionAction,
}: TransactionsScreenProps) {
  const { formatCurrency, formatDate, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = "";
  const typeFilter = "all";
  const categoryFilter = "all";
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [formData, setFormData] = useState<EditableTransaction | null>(null);
  const [pendingTransactionId, setPendingTransactionId] = useState<
    string | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const transactionsHref = withSelectedMonth("/transactions", searchParams);
  const previousTransactionsHref = `${transactionsHref}${
    transactionsHref.includes("?") ? "&" : "?"
  }history=1`;

  const categoryOptions = useMemo(
    () =>
      [...categories]
        .filter(
          (category) => category.id !== "none" && category.group !== "income",
        )
        .sort((left, right) => {
          const order = { needs: 0, wants: 1, savings: 2 };
          return (
            order[left.group as keyof typeof order] -
            order[right.group as keyof typeof order]
          );
        })
        .map((category) => ({
          label: t(category.label),
          value: category.id,
        })),
    [categories, t],
  );

  const incomeCategory = useMemo(
    () => categories.find((category) => category.group === "income"),
    [categories],
  );
  const incomeCategoryOption = useMemo(
    () => ({
      label: t(incomeCategory?.label ?? "data.category.receipts"),
      value: incomeCategory?.id ?? "none",
    }),
    [incomeCategory, t],
  );
  const incomeCategoryId = incomeCategoryOption.value;

  const paymentMethodOptions = useMemo(
    () =>
      paymentMethods.map((paymentMethod) => ({
        label: t(paymentMethod.label),
        value: paymentMethod.id,
      })),
    [paymentMethods, t],
  );

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      const description = t(transaction.descriptionKey).toLowerCase();
      const category = t(transaction.categoryKey).toLowerCase();
      const query = searchQuery.toLowerCase();

      return (
        (description.includes(query) || category.includes(query)) &&
        (typeFilter === "all" || transaction.type === typeFilter) &&
        (categoryFilter === "all" || transaction.categoryKey === categoryFilter)
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortOption === "amount-desc") {
        return Math.abs(right.amount) - Math.abs(left.amount);
      }

      if (sortOption === "amount-asc") {
        return Math.abs(left.amount) - Math.abs(right.amount);
      }

      const leftDate = new Date(left.date).getTime();
      const rightDate = new Date(right.date).getTime();

      return sortOption === "date-asc"
        ? leftDate - rightDate
        : rightDate - leftDate;
    });
  }, [categoryFilter, searchQuery, sortOption, t, transactions, typeFilter]);

  const openTransactionDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData(getInitialFormState(transaction, incomeCategoryId));
  };

  const closeTransactionDialog = () => {
    if (isPending) return;
    setSelectedTransaction(null);
    setFormData(null);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    const confirmed = window.confirm(t("transaction.deleteConfirm"));

    if (!confirmed) return;

    setPendingTransactionId(transaction.id);
    startTransition(async () => {
      try {
        await deleteTransactionAction(transaction.id);
        toast.success(t("transaction.deleteSuccess"));
        router.refresh();
      } catch (error) {
        console.error("Error deleting transaction:", error);
        toast.error(t("transaction.deleteError"));
      } finally {
        setPendingTransactionId(null);
      }
    });
  };

  const handleNewTransactionSubmit = async (data: TransactionFormData) => {
    const input: NewTransactionInput = {
      amount: data.amount,
      category: data.category === "none" ? "" : data.category,
      date: data.date,
      description: data.description.trim(),
      installmentCount: data.installmentCount,
      notes: data.notes?.trim() || undefined,
      paymentMethod: data.paymentMethod === "none" ? "" : data.paymentMethod,
      type: data.type,
    };

    await createTransactionAction(input);
    setIsNewTransactionOpen(false);
  };

  const handleUpdateTransaction = () => {
    if (!selectedTransaction || !formData) return;

    setPendingTransactionId(selectedTransaction.id);
    startTransition(async () => {
      try {
        await updateTransactionAction({
          amount: parseAmountInput(formData.amount),
          category: formData.category,
          date: formData.date,
          description: formData.description,
          id: selectedTransaction.id,
          notes: formData.notes,
          paymentMethod: formData.paymentMethod,
          type: formData.type,
        });
        toast.success(t("transaction.updateSuccess"));
        closeTransactionDialog();
        router.refresh();
      } catch (error) {
        console.error("Error updating transaction:", error);
        toast.error(t("transaction.updateError"));
      } finally {
        setPendingTransactionId(null);
      }
    });
  };

  return (
    <>
      <PageHeader
        title={t("screen.transactions.title")}
        description={t("screen.transactions.description")}
        actions={
          <Button
            className="gap-2"
            onClick={() => setIsNewTransactionOpen(true)}
          >
            <Plus className="size-4" />
            {t("screen.transactions.add")}
          </Button>
        }
      />

      <Card className="border-border bg-card card-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {filteredTransactions.length} {t("screen.transactions.count")}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setSortOption(
                    sortOption === "date-desc" ? "date-asc" : "date-desc",
                  )
                }
              >
                {t("common.date")}
                {sortOption === "date-desc" ? (
                  <ChevronDown className="size-3.5" />
                ) : sortOption === "date-asc" ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ArrowUpDown className="size-3.5 opacity-50" />
                )}
              </Button>
              <span className="text-border">|</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setSortOption(
                    sortOption === "amount-desc" ? "amount-asc" : "amount-desc",
                  )
                }
              >
                {t("common.amount")}
                {sortOption === "amount-desc" ? (
                  <ChevronDown className="size-3.5" />
                ) : sortOption === "amount-asc" ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ArrowUpDown className="size-3.5 opacity-50" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredTransactions.map((transaction) => {
              const isPlanned = Boolean(transaction.isPlanned);

              return (
                <div
                  key={transaction.id}
                  className={cn(
                    "flex items-center gap-2 p-4",
                    isPlanned && "bg-muted/20",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-4 rounded-md text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => openTransactionDialog(transaction)}
                  >
                    <div
                      className={cn(
                        "flex size-12 items-center justify-center rounded-lg bg-accent text-2xl",
                        isPlanned && "grayscale opacity-55",
                      )}
                    >
                      {transaction.icon}
                    </div>
                    <div
                      className={cn(
                        "min-w-0 flex-1",
                        isPlanned && "opacity-65",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "truncate font-medium text-foreground",
                            isPlanned && "text-muted-foreground",
                          )}
                        >
                          {t(transaction.descriptionKey)}
                        </p>
                        {isPlanned ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 border-border bg-muted px-2 py-0 text-[10px] font-medium text-muted-foreground"
                          >
                            {t("screen.transactions.planned")}
                          </Badge>
                        ) : null}
                        {transaction.type === "income" && (
                          <ArrowUpRight className="size-4 shrink-0 text-income" />
                        )}
                        {transaction.type === "expense" && (
                          <ArrowDownRight className="size-4 shrink-0 text-expense" />
                        )}
                        {transaction.type === "saving" && (
                          <Wallet className="size-4 shrink-0 text-savings" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {t(transaction.categoryKey)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(transaction.date, {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "tabular-nums font-semibold",
                        transaction.amount > 0
                          ? "text-income"
                          : "text-foreground",
                      )}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-muted-foreground"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          openTransactionDialog(transaction);
                        }}
                      >
                        <Pencil className="size-4" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={
                          isPending && pendingTransactionId === transaction.id
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteTransaction(transaction);
                        }}
                      >
                        <Trash2 className="size-4" />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            <div className="flex justify-center p-4">
              <Button asChild size="sm" variant="outline">
                <Link
                  href={
                    showPrevious
                      ? withSelectedMonth("/transactions", searchParams)
                      : previousTransactionsHref
                  }
                >
                  {showPrevious
                    ? t("screen.transactions.hidePrevious")
                    : t("screen.transactions.showPrevious")}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedTransaction)}
        onOpenChange={(open) => {
          if (!open) closeTransactionDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("transaction.detailsTitle")}</DialogTitle>
            <DialogDescription>
              {t("transaction.detailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && formData && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transaction-type">
                    {t("transaction.type")}
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        category:
                          value === "income"
                            ? incomeCategoryId
                            : categoryOptions.some(
                                  (category) =>
                                    category.value === formData.category,
                                )
                              ? formData.category
                              : (categoryOptions[0]?.value ?? "none"),
                        type: value as TransactionType,
                      })
                    }
                  >
                    <SelectTrigger id="transaction-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">
                        {t("transaction.typeIncome")}
                      </SelectItem>
                      <SelectItem value="expense">
                        {t("transaction.typeExpense")}
                      </SelectItem>
                      <SelectItem value="saving">
                        {t("common.saving")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-amount">
                    {t("transaction.amount")}
                  </Label>
                  <Input
                    id="transaction-amount"
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        amount: sanitizeAmountInput(event.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-description">
                  {t("transaction.description")}
                </Label>
                <Input
                  id="transaction-description"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      description: event.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="transaction-date">
                    {t("transaction.date")}
                  </Label>
                  <Input
                    id="transaction-date"
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData({ ...formData, date: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-category">
                    {t("transaction.category")}
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger id="transaction-category">
                      <SelectValue placeholder={t("common.category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.type === "income"
                        ? [incomeCategoryOption]
                        : categoryOptions
                      ).map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-payment">
                    {t("transaction.paymentMethod")}
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger id="transaction-payment">
                      <SelectValue
                        placeholder={t("transaction.paymentMethod")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("transaction.paymentMethod")}
                      </SelectItem>
                      {paymentMethodOptions.map((paymentMethod) => (
                        <SelectItem
                          key={paymentMethod.value}
                          value={paymentMethod.value}
                        >
                          {paymentMethod.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-notes">
                  {t("transaction.notes")}
                </Label>
                <Textarea
                  id="transaction-notes"
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData({ ...formData, notes: event.target.value })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {selectedTransaction && (
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => handleDeleteTransaction(selectedTransaction)}
              >
                <Trash2 className="size-4" />
                {t("common.delete")}
              </Button>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={closeTransactionDialog}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={isPending || !formData?.description.trim()}
                onClick={handleUpdateTransaction}
              >
                {isPending
                  ? t("transaction.saving")
                  : t("transaction.saveChanges")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isNewTransactionOpen}
        onOpenChange={setIsNewTransactionOpen}
      >
        <DialogContent
          className="sm:max-w-[90dvw]"
          aria-describedby="add transaction"
        >
          <DialogHeader className="not-sm:hidden">
            <DialogTitle>{t("transaction.addTitle")}</DialogTitle>
            <DialogDescription>
              {t("transaction.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-[1dvh]">
            <TransactionForm
              categories={categories}
              createCategoryAction={createCategoryAction}
              createPaymentMethodAction={createPaymentMethodAction}
              paymentMethods={paymentMethods}
              onSubmit={handleNewTransactionSubmit}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
