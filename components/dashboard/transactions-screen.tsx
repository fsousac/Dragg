"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { type TransactionFormData } from "@/components/dashboard/transaction-form";
import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
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
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  isInstallmentTransaction,
  type InstallmentDeleteScope,
} from "@/lib/finance/installments";
import {
  type AdvanceInstallmentsInput,
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
  type CreateCategoryInput,
  type NewTransactionInput,
  type UpdateTransactionInput,
  type CreatePaymentMethodInput,
  type DeleteInstallmentsInput,
  type DeleteSubscriptionOccurrencesInput,
  type InstallmentPrepaymentPreview,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

type EditableTransaction = {
  amount: number;
  category: string;
  date: string;
  description: string;
  notes: string;
  paymentMethod: string;
  type: TransactionType;
};

type InstallmentDeleteRequest = {
  scope: InstallmentDeleteScope;
  transaction: Transaction;
};

type ConfirmRequest =
  | { kind: "delete-transaction"; transaction: Transaction }
  | {
      kind: "advance-installments";
      preview: InstallmentPrepaymentPreview;
      transactionId: string;
    }
  | {
      kind: "delete-subscription";
      transaction: Transaction;
      scope: DeleteSubscriptionOccurrencesInput["scope"];
    };

type TransactionsScreenProps = {
  categories: TransactionFormCategory[];
  advanceInstallmentsAction: (data: AdvanceInstallmentsInput) => Promise<void>;
  createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  createPaymentMethodAction?: (data: CreatePaymentMethodInput) => Promise<void>;
  createTransactionAction: (data: NewTransactionInput) => Promise<void>;
  deleteInstallmentsAction: (data: DeleteInstallmentsInput) => Promise<void>;
  deleteSubscriptionOccurrencesAction: (
    data: DeleteSubscriptionOccurrencesInput,
  ) => Promise<void>;
  deleteTransactionAction: (transactionId: string) => Promise<void>;
  nextInvoiceTransactions: Transaction[];
  paymentMethods: TransactionFormPaymentMethod[];
  previewInstallmentPrepaymentAction: (
    data: AdvanceInstallmentsInput,
  ) => Promise<InstallmentPrepaymentPreview>;
  showNextInvoice: boolean;
  showPrevious: boolean;
  transactions: Transaction[];
  updateTransactionAction: (data: UpdateTransactionInput) => Promise<void>;
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getInitialFormState(
  transaction: Transaction,
  incomeCategoryId: string,
): EditableTransaction {
  return {
    amount: Math.abs(transaction.amount),
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

export function TransactionsScreen({
  advanceInstallmentsAction,
  categories,
  createCategoryAction,
  createPaymentMethodAction,
  createTransactionAction,
  deleteInstallmentsAction,
  deleteSubscriptionOccurrencesAction,
  deleteTransactionAction,
  nextInvoiceTransactions,
  paymentMethods,
  previewInstallmentPrepaymentAction,
  showNextInvoice,
  showPrevious,
  transactions,
  updateTransactionAction,
}: TransactionsScreenProps) {
  const { formatCurrency, formatDate, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<Transaction["group"] | "all">(
    "all",
  );
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [formData, setFormData] = useState<EditableTransaction | null>(null);
  const [pendingTransactionId, setPendingTransactionId] = useState<
    string | null
  >(null);
  const [installmentDeleteRequest, setInstallmentDeleteRequest] =
    useState<InstallmentDeleteRequest | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [isNextInvoiceVisible, setIsNextInvoiceVisible] =
    useState(showNextInvoice);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const selectedMonth =
    searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const transactionsHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", selectedMonth);

    return `/transactions?${params.toString()}`;
  }, [searchParams, selectedMonth]);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const previousTransactionsHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", selectedMonth);
    params.set("history", "1");

    return `/transactions?${params.toString()}`;
  }, [searchParams, selectedMonth]);

  const isSubscriptionTransaction = (transaction: Transaction) =>
    transaction.notes?.startsWith("subscription") ?? false;

  const monthlySummary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let savings = 0;
    for (const tx of transactions) {
      if (tx.isCreditCardInvoice) continue;
      if (tx.type === "income") income += Math.abs(tx.amount);
      else if (tx.type === "saving") savings += Math.abs(tx.amount);
      else expenses += Math.abs(tx.amount);
    }
    return { income, expenses, savings, balance: income - expenses - savings };
  }, [transactions]);

  const getInstallmentDeleteDescriptionKey = (
    scope: InstallmentDeleteScope,
  ) => {
    if (scope === "all") return "transactions.installments.deleteAllConfirm";
    if (scope === "this_and_following") {
      return "transactions.installments.deleteThisAndFollowingConfirm";
    }
    return "transactions.installments.deleteOnlyThisConfirm";
  };
  const getInstallmentDeleteTitleKey = (scope: InstallmentDeleteScope) => {
    if (scope === "all") return "transactions.installments.deleteAllTitle";
    if (scope === "this_and_following") {
      return "transactions.installments.deleteThisAndFollowingTitle";
    }
    return "transactions.installments.deleteOnlyThisTitle";
  };

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

  const groupOptions = useMemo(
    () => [
      { label: t("common.all"), value: "all" as const },
      { label: t("data.group.needs"), value: "needs" as const },
      { label: t("data.group.wants"), value: "wants" as const },
      { label: t("data.group.savings"), value: "savings" as const },
      { label: t("data.group.income"), value: "income" as const },
    ],
    [t],
  );

  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      if (groupFilter !== "all" && transaction.group !== groupFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const invoiceLabelKey =
        transaction.invoice?.paymentMethodKey ?? transaction.paymentMethodKey;
      const searchTerms = [
        transaction.isCreditCardInvoice
          ? invoiceLabelKey
            ? `${t("transaction.creditCardInvoiceFor")} ${t(invoiceLabelKey)}`
            : t("transaction.creditCardInvoice")
          : t(transaction.descriptionKey),
        t(transaction.categoryKey),
        t(`data.group.${transaction.group}`),
        transaction.notes ?? "",
        invoiceLabelKey ? t(invoiceLabelKey) : "",
      ]
        .map(normalizeSearchValue)
        .join(" ");

      return searchTerms.includes(normalizedQuery);
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
  }, [groupFilter, normalizedQuery, sortOption, t, transactions]);

  const filteredNextInvoiceTransactions = useMemo(
    () =>
      nextInvoiceTransactions.filter((transaction) => {
        if (groupFilter !== "all" && transaction.group !== groupFilter) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const invoiceLabelKey =
          transaction.invoice?.paymentMethodKey ?? transaction.paymentMethodKey;
        const searchTerms = [
          transaction.isCreditCardInvoice
            ? invoiceLabelKey
              ? `${t("transaction.creditCardInvoiceFor")} ${t(invoiceLabelKey)}`
              : t("transaction.creditCardInvoice")
            : t(transaction.descriptionKey),
          t(transaction.categoryKey),
          t(`data.group.${transaction.group}`),
          transaction.notes ?? "",
          invoiceLabelKey ? t(invoiceLabelKey) : "",
        ]
          .map(normalizeSearchValue)
          .join(" ");

        return searchTerms.includes(normalizedQuery);
      }),
    [groupFilter, normalizedQuery, nextInvoiceTransactions, t],
  );

  const dateGroups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filteredTransactions) {
      const existing = map.get(tx.date);
      if (existing) {
        existing.push(tx);
      } else {
        map.set(tx.date, [tx]);
      }
    }
    const entries = [...map.entries()];
    if (sortOption === "amount-desc" || sortOption === "amount-asc") {
      entries.sort(([, aTxs], [, bTxs]) => {
        const aMax = Math.max(...aTxs.map((tx) => Math.abs(tx.amount)));
        const bMax = Math.max(...bTxs.map((tx) => Math.abs(tx.amount)));
        return sortOption === "amount-desc" ? bMax - aMax : aMax - bMax;
      });
    } else {
      entries.sort(([a], [b]) =>
        sortOption === "date-asc" ? a.localeCompare(b) : b.localeCompare(a),
      );
    }
    return entries;
  }, [filteredTransactions, sortOption]);

  const getDateGroupLabel = (date: string) => {
    if (date === today) return t("common.today");
    if (date === yesterday) return t("common.yesterday");
    return formatDate(date, { day: "numeric", month: "short" });
  };

  const openTransactionDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData(
      transaction.isCreditCardInvoice
        ? null
        : getInitialFormState(transaction, incomeCategoryId),
    );
  };

  const closeTransactionDialog = () => {
    if (isPending) return;
    setSelectedTransaction(null);
    setFormData(null);
  };

  const handleAdvanceInstallmentsById = (transactionId: string) => {
    const transaction = transactions.find(
      (candidate) => candidate.id === transactionId,
    );

    if (!transaction || !isInstallmentTransaction(transaction)) {
      return;
    }

    setPendingTransactionId(transaction.id);
    startTransition(async () => {
      try {
        const preview = await previewInstallmentPrepaymentAction({
          scope: "remaining",
          targetMonth: selectedMonth,
          transactionId: transaction.id,
        });

        if (preview.count === 0) {
          toast.error(t("transactions.installments.advanceNone"));
          return;
        }

        setConfirmRequest({
          kind: "advance-installments",
          preview,
          transactionId: transaction.id,
        });
      } catch (error) {
        console.error("Error advancing installments:", error);
        toast.error(t("transactions.installments.advanceError"));
      } finally {
        setPendingTransactionId(null);
      }
    });
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setConfirmRequest({ kind: "delete-transaction", transaction });
  };

  const handleDeleteInstallments = (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => {
    setInstallmentDeleteRequest({ scope, transaction });
  };

  const confirmDeleteInstallments = () => {
    if (!installmentDeleteRequest) return;

    setPendingTransactionId(installmentDeleteRequest.transaction.id);
    startTransition(async () => {
      try {
        await deleteInstallmentsAction({
          scope: installmentDeleteRequest.scope,
          transactionId: installmentDeleteRequest.transaction.id,
        });
        toast.success(t("transaction.deleteSuccess"));
        setInstallmentDeleteRequest(null);
        closeTransactionDialog();
        router.refresh();
      } catch (error) {
        console.error("Error deleting installments:", error);
        toast.error(t("transaction.deleteError"));
      } finally {
        setPendingTransactionId(null);
      }
    });
  };

  const confirmAction = () => {
    if (!confirmRequest) return;

    if (confirmRequest.kind === "delete-transaction") {
      setPendingTransactionId(confirmRequest.transaction.id);
      startTransition(async () => {
        try {
          await deleteTransactionAction(confirmRequest.transaction.id);
          toast.success(t("transaction.deleteSuccess"));
          setConfirmRequest(null);
          closeTransactionDialog();
          router.refresh();
        } catch (error) {
          console.error("Error deleting transaction:", error);
          toast.error(t("transaction.deleteError"));
        } finally {
          setPendingTransactionId(null);
        }
      });
    } else if (confirmRequest.kind === "advance-installments") {
      startTransition(async () => {
        try {
          await advanceInstallmentsAction({
            scope: "remaining",
            targetMonth: selectedMonth,
            transactionId: confirmRequest.transactionId,
          });
          toast.success(t("transactions.installments.advanceSuccess"));
          setConfirmRequest(null);
          closeTransactionDialog();
          router.refresh();
        } catch (error) {
          console.error("Error advancing installments:", error);
          toast.error(t("transactions.installments.advanceError"));
        }
      });
    } else if (confirmRequest.kind === "delete-subscription") {
      setPendingTransactionId(confirmRequest.transaction.id);
      startTransition(async () => {
        try {
          await deleteSubscriptionOccurrencesAction({
            scope: confirmRequest.scope,
            transactionId: confirmRequest.transaction.id,
          });
          toast.success(t("transaction.deleteSuccess"));
          setConfirmRequest(null);
          closeTransactionDialog();
          router.refresh();
        } catch (error) {
          console.error("Error deleting subscription occurrences:", error);
          toast.error(t("transaction.deleteError"));
        } finally {
          setPendingTransactionId(null);
        }
      });
    }
  };

  const handleDeleteSubscriptionOccurrences = (
    transaction: Transaction,
    scope: DeleteSubscriptionOccurrencesInput["scope"],
  ) => {
    setConfirmRequest({ kind: "delete-subscription", transaction, scope });
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
  };

  const handleUpdateTransaction = () => {
    if (!selectedTransaction || !formData) return;

    setPendingTransactionId(selectedTransaction.id);
    startTransition(async () => {
      try {
        await updateTransactionAction({
          amount: formData.amount,
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
            className="gap-2 text-background"
            onClick={() => setIsNewTransactionOpen(true)}
          >
            <Plus className="size-4" />
            {t("screen.transactions.add")}
          </Button>
        }
      />

      {/* Summary chips */}
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-3"
        style={{ animation: "tx-fade-up 0.45s both" }}
      >
        {[
          {
            icon: TrendingUp,
            label: t("dashboard.summary.totalIncome"),
            value: formatCurrency(monthlySummary.income),
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            valueColor: "text-emerald-600 dark:text-emerald-400",
          },
          {
            icon: TrendingDown,
            label: t("dashboard.summary.totalExpenses"),
            value: formatCurrency(monthlySummary.expenses),
            iconBg: "bg-rose-500/10",
            iconColor: "text-rose-500 dark:text-rose-400",
            valueColor: "text-expense",
          },
          {
            icon: PiggyBank,
            label: t("dashboard.summary.totalSaved"),
            value: formatCurrency(monthlySummary.savings),
            iconBg: "bg-violet-500/10",
            iconColor: "text-violet-600 dark:text-violet-400",
            valueColor: "text-savings",
          },
          {
            icon: Wallet,
            label: t("dashboard.summary.currentBalance"),
            value: formatCurrency(monthlySummary.balance),
            iconBg:
              monthlySummary.balance >= 0
                ? "bg-emerald-500/10"
                : "bg-rose-500/10",
            iconColor:
              monthlySummary.balance >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-500 dark:text-rose-400",
            valueColor:
              monthlySummary.balance >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-500 dark:text-rose-400",
          },
        ].map((chip) => {
          const Icon = chip.icon;
          return (
            <div
              key={chip.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  chip.iconBg,
                )}
              >
                <Icon className={cn("size-4", chip.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {chip.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-base font-bold tabular-nums not-sm:text-xs overflow-auto",
                    chip.valueColor,
                  )}
                >
                  {chip.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Card
        className="border-border bg-card card-shadow py-5 my-3"
        style={{ animation: "tx-fade-up 0.45s 0.06s both" }}
      >
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="font-semibold text-2xl">
                {filteredTransactions.length} {t("screen.transactions.count")}
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 lg:min-w-48">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("screen.transactions.searchPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className="size-3.5 rotate-90" />
                  </button>
                )}
              </div>

              {/* Group filter */}
              <Select
                value={groupFilter}
                onValueChange={(value) =>
                  setGroupFilter(value as Transaction["group"] | "all")
                }
              >
                <SelectTrigger className="h-9 w-auto min-w-32 rounded-xl border-border bg-background text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-1 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold",
                    sortOption.startsWith("date")
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() =>
                    setSortOption(
                      sortOption === "date-desc" ? "date-asc" : "date-desc",
                    )
                  }
                >
                  {t("common.date")}
                  {sortOption === "date-desc" ? (
                    <ChevronDown className="size-3" />
                  ) : sortOption === "date-asc" ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ArrowUpDown className="size-3 opacity-50" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold",
                    sortOption.startsWith("amount")
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() =>
                    setSortOption(
                      sortOption === "amount-desc"
                        ? "amount-asc"
                        : "amount-desc",
                    )
                  }
                >
                  {t("common.amount")}
                  {sortOption === "amount-desc" ? (
                    <ChevronDown className="size-3" />
                  ) : sortOption === "amount-asc" ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ArrowUpDown className="size-3 opacity-50" />
                  )}
                </Button>
              </div>

              {/* Next invoice toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 rounded-xl border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setIsNextInvoiceVisible((current) => !current)}
              >
                {isNextInvoiceVisible
                  ? t("screen.transactions.hideNextInvoice")
                  : t("screen.transactions.showNextInvoice")}
              </Button>

              {(searchQuery || groupFilter !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchQuery("");
                    setGroupFilter("all");
                  }}
                >
                  {t("screen.transactions.clearFilters")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Next invoice section */}
      {isNextInvoiceVisible && filteredNextInvoiceTransactions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/20 my-3 px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("screen.transactions.nextInvoice")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("screen.transactions.nextInvoiceDescription")}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {filteredNextInvoiceTransactions.length}
            </Badge>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
            <div className="divide-y divide-border">
              {filteredNextInvoiceTransactions.map((transaction) => {
                const invoiceLabelKey =
                  transaction.invoice?.paymentMethodKey ??
                  transaction.paymentMethodKey;
                const transactionTitle = invoiceLabelKey
                  ? `${t("transaction.creditCardInvoiceFor")} ${t(invoiceLabelKey)}`
                  : t("transaction.creditCardInvoice");

                return (
                  <button
                    key={transaction.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left opacity-50 transition-colors hover:bg-accent/30 hover:opacity-80 lg:gap-4 lg:px-5"
                    onClick={() => openTransactionDialog(transaction)}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-xl lg:size-11 lg:text-2xl">
                      {transaction.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {transactionTitle}
                        </p>
                        <Badge
                          variant="secondary"
                          className="shrink-0 border-border bg-muted px-2 py-0 text-[10px] font-medium text-muted-foreground"
                        >
                          {t("screen.transactions.nextInvoice")}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] leading-5 text-muted-foreground">
                        <span>{t(transaction.categoryKey)}</span>
                        <span>·</span>
                        <span>
                          {formatDate(transaction.date, {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span>·</span>
                        <span>{t(`data.group.${transaction.group}`)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-medium tabular-nums text-foreground/80 lg:text-sm">
                        {transaction.amount > 0 ? "+" : ""}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px]"
                      >
                        {t("common.view")}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Timeline-grouped transaction list */}
      <div className="flex flex-col gap-3 pb-2">
        {dateGroups.map(([date, groupTxs], groupIdx) => {
          const dayNet = groupTxs.reduce((sum, tx) => {
            if (tx.isCreditCardInvoice) return sum;
            return tx.type === "income"
              ? sum + Math.abs(tx.amount)
              : sum - Math.abs(tx.amount);
          }, 0);

          return (
            <div
              key={date}
              style={{
                animation: `tx-fade-up 0.35s ${groupIdx * 0.06}s both`,
              }}
            >
              {/* Group header: date label + rule + day net */}
              <div className="mb-2.5 flex items-center gap-3">
                <span className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.07em] text-muted-foreground">
                  {getDateGroupLabel(date)}
                </span>
                <div className="h-px flex-1 bg-border" />
                <span
                  className={cn(
                    "whitespace-nowrap tabular-nums text-xs font-bold",
                    dayNet >= 0 ? "text-income" : "text-expense",
                  )}
                >
                  {dayNet >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(dayNet))}
                </span>
              </div>
              {/* Group card */}
              <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-sm">
                {groupTxs.map((transaction, rowIdx) => {
                  const isLast = rowIdx === groupTxs.length - 1;
                  const isPlanned = Boolean(transaction.isPlanned);
                  const isCreditCardInvoice = Boolean(
                    transaction.isCreditCardInvoice,
                  );
                  const isInstallment = isInstallmentTransaction(transaction);
                  const isSubscription = isSubscriptionTransaction(transaction);
                  const shouldPresentAsPlanned =
                    isPlanned && transaction.date > today;
                  const invoiceLabelKey =
                    transaction.invoice?.paymentMethodKey ??
                    transaction.paymentMethodKey;
                  const invoiceTitle = invoiceLabelKey
                    ? `${t("transaction.creditCardInvoiceFor")} ${t(invoiceLabelKey)}`
                    : t("transaction.creditCardInvoice");
                  const transactionTitle = isCreditCardInvoice
                    ? invoiceTitle
                    : t(transaction.descriptionKey);

                  return (
                    <div
                      key={transaction.id}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3.5 transition-colors",
                        !isLast && "border-b border-border",
                        shouldPresentAsPlanned && "bg-muted/20",
                      )}
                      style={{
                        animation: `tx-fade-up 0.3s ${rowIdx * 0.025}s both`,
                      }}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-4 rounded-md text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => openTransactionDialog(transaction)}
                      >
                        <div
                          className={cn(
                            "flex size-11 items-center justify-center rounded-[13px] bg-accent text-xl",
                            shouldPresentAsPlanned && "grayscale opacity-55",
                          )}
                        >
                          {transaction.icon}
                        </div>
                        <div
                          className={cn(
                            "min-w-0 flex-1",
                            shouldPresentAsPlanned && "opacity-65",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "truncate font-medium text-foreground",
                                shouldPresentAsPlanned &&
                                  "text-muted-foreground",
                              )}
                            >
                              {transactionTitle}
                            </p>
                            {shouldPresentAsPlanned ? (
                              <Badge
                                variant="secondary"
                                className="shrink-0 border-border bg-muted px-2 py-0 text-[10px] font-medium text-muted-foreground not-lg:hidden"
                              >
                                {t(
                                  isCreditCardInvoice
                                    ? "screen.transactions.plannedInvoice"
                                    : "screen.transactions.planned",
                                )}
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
                          <div className="mt-1 flex flex-col items-start align-middle gap-2 truncate w-full">
                            <Badge variant="secondary" className="text-xs ">
                              {t(transaction.categoryKey)}
                            </Badge>
                            {shouldPresentAsPlanned ? (
                              <Badge
                                variant="secondary"
                                className="lg:hidden shrink-0 border-border bg-muted px-2 py-0 text-[10px] font-medium text-muted-foreground"
                              >
                                {t(
                                  isCreditCardInvoice
                                    ? "screen.transactions.plannedInvoice"
                                    : "screen.transactions.planned",
                                )}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <p
                          className={cn(
                            "tabular-nums font-semibold w-fit",
                            transaction.type === "income"
                              ? "text-income"
                              : transaction.group === "savings"
                                ? "text-savings"
                                : "text-expense",
                          )}
                        >
                          {transaction.type === "income" ? "+" : ""}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </p>
                      </button>
                      {isCreditCardInvoice ? null : (
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
                            {isInstallment ? (
                              <>
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={
                                    isPending &&
                                    pendingTransactionId === transaction.id
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteInstallments(
                                      transaction,
                                      "single",
                                    );
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                  {t(
                                    "transactions.installments.deleteOnlyThis",
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={
                                    isPending &&
                                    pendingTransactionId === transaction.id
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteInstallments(
                                      transaction,
                                      "this_and_following",
                                    );
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                  {t(
                                    "transactions.installments.deleteThisAndFollowing",
                                  )}
                                </DropdownMenuItem>
                              </>
                            ) : isSubscription ? (
                              <>
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={
                                    isPending &&
                                    pendingTransactionId === transaction.id
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteSubscriptionOccurrences(
                                      transaction,
                                      "single",
                                    );
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                  {t(
                                    "transactions.subscriptions.deleteOnlyThis",
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={
                                    isPending &&
                                    pendingTransactionId === transaction.id
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteSubscriptionOccurrences(
                                      transaction,
                                      "this_and_following_unpaid",
                                    );
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                  {t(
                                    "transactions.subscriptions.deleteThisAndFollowingUnpaid",
                                  )}
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={
                                  isPending &&
                                  pendingTransactionId === transaction.id
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteTransaction(transaction);
                                }}
                              >
                                <Trash2 className="size-4" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex justify-center">
          <Button asChild size="sm" variant="outline">
            <Link
              href={showPrevious ? transactionsHref : previousTransactionsHref}
            >
              {showPrevious
                ? t("screen.transactions.hidePrevious")
                : t("screen.transactions.showPrevious")}
            </Link>
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedTransaction)}
        onOpenChange={(open) => {
          if (!open) closeTransactionDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTransaction?.isCreditCardInvoice
                ? (() => {
                    const invoiceKey =
                      selectedTransaction.invoice?.paymentMethodKey ??
                      selectedTransaction.paymentMethodKey;

                    return invoiceKey
                      ? `${t("transaction.creditCardInvoiceFor")} ${t(invoiceKey)}`
                      : t("transaction.creditCardInvoice");
                  })()
                : t("transaction.detailsTitle")}
            </DialogTitle>
            <DialogDescription>
              {selectedTransaction?.isCreditCardInvoice
                ? t("transaction.invoiceDetailsDescription")
                : t("transaction.detailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction?.isCreditCardInvoice &&
            selectedTransaction.invoice && (
              <div className="grid gap-4">
                <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("transaction.paymentMethod")}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {t(selectedTransaction.invoice.paymentMethodKey)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("transaction.invoiceCycle")}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(selectedTransaction.invoice.startsAt, {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      -{" "}
                      {formatDate(selectedTransaction.invoice.closingDate, {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("transaction.invoiceDueDate")}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(selectedTransaction.invoice.dueDate, {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border bg-muted/30 px-4 py-3 text-sm font-medium">
                    <span>{t("transaction.invoicePurchases")}</span>
                    <span className="tabular-nums">
                      {formatCurrency(Math.abs(selectedTransaction.amount))}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {selectedTransaction.invoice.purchases.map((purchase) => {
                      const installmentTransaction = transactions.find(
                        (transaction) => transaction.id === purchase.id,
                      );
                      const canAdvanceInstallment = Boolean(
                        installmentTransaction &&
                        isInstallmentTransaction(installmentTransaction),
                      );

                      return (
                        <div
                          key={purchase.id}
                          className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {t(purchase.descriptionKey)}
                              </p>
                              {purchase.installmentLabel ? (
                                <Badge variant="secondary" className="shrink-0">
                                  {purchase.installmentLabel}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(purchase.date, {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              · {t(purchase.categoryKey)}
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-2 sm:flex-row-reverse sm:gap-3">
                            <p className="text-sm font-semibold tabular-nums sm:text-right">
                              {formatCurrency(purchase.amount)}
                            </p>
                            {canAdvanceInstallment && installmentTransaction ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-9 shrink-0 text-muted-foreground"
                                disabled={
                                  isPending &&
                                  pendingTransactionId === purchase.id
                                }
                                onClick={() =>
                                  handleAdvanceInstallmentsById(purchase.id)
                                }
                              >
                                <CalendarArrowDown className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

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
                  <CurrencyInput
                    id="transaction-amount"
                    label={t("transaction.amount")}
                    value={formData.amount}
                    onValueChange={(amount) =>
                      setFormData({
                        ...formData,
                        amount,
                      })
                    }
                    labelClassName="normal-case tracking-normal text-foreground"
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
                    className="w-full max-w-full min-w-0 appearance-none overflow-hidden pr-3 text-left [&::-webkit-calendar-picker-indicator]:shrink-0 [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:overflow-hidden [&::-webkit-date-and-time-value]:text-left"
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
            {selectedTransaction &&
              !selectedTransaction.isCreditCardInvoice && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => {
                      if (isInstallmentTransaction(selectedTransaction)) {
                        handleDeleteInstallments(selectedTransaction, "single");
                        return;
                      }

                      if (isSubscriptionTransaction(selectedTransaction)) {
                        handleDeleteSubscriptionOccurrences(
                          selectedTransaction,
                          "single",
                        );
                        return;
                      }

                      handleDeleteTransaction(selectedTransaction);
                    }}
                  >
                    <Trash2 className="size-4" />
                    {t("common.delete")}
                  </Button>
                </div>
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
              {selectedTransaction?.isCreditCardInvoice ? null : (
                <Button
                  type="button"
                  disabled={isPending || !formData?.description.trim()}
                  onClick={handleUpdateTransaction}
                >
                  {isPending
                    ? t("transaction.saving")
                    : t("transaction.saveChanges")}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(installmentDeleteRequest)}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setInstallmentDeleteRequest(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {installmentDeleteRequest
                ? t(
                    getInstallmentDeleteTitleKey(
                      installmentDeleteRequest.scope,
                    ),
                  )
                : null}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {installmentDeleteRequest
                ? t(
                    getInstallmentDeleteDescriptionKey(
                      installmentDeleteRequest.scope,
                    ),
                  )
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                confirmDeleteInstallments();
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(confirmRequest)}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setConfirmRequest(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRequest?.kind === "delete-transaction"
                ? t("transaction.deleteConfirm")
                : confirmRequest?.kind === "advance-installments"
                  ? t("transactions.installments.advanceTitle")
                  : confirmRequest?.kind === "delete-subscription"
                    ? t(
                        confirmRequest.scope === "single"
                          ? "transactions.subscriptions.deleteOnlyThisTitle"
                          : "transactions.subscriptions.deleteThisAndFollowingUnpaidTitle",
                      )
                    : null}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRequest?.kind === "delete-transaction"
                ? t("transaction.deleteDescription")
                : confirmRequest?.kind === "advance-installments"
                  ? t("transactions.installments.advanceConfirmDescription")
                      .replace("{count}", String(confirmRequest.preview.count))
                      .replace(
                        "{amount}",
                        formatCurrency(confirmRequest.preview.totalAmount),
                      )
                      .replace(
                        "{month}",
                        formatDate(`${confirmRequest.preview.targetMonth}-01`, {
                          month: "long",
                          year: "numeric",
                        }),
                      )
                  : confirmRequest?.kind === "delete-subscription"
                    ? t(
                        confirmRequest.scope === "single"
                          ? "transactions.subscriptions.deleteOnlyThisConfirm"
                          : "transactions.subscriptions.deleteThisAndFollowingUnpaidConfirm",
                      )
                    : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                confirmAction();
              }}
            >
              {confirmRequest?.kind === "advance-installments"
                ? t("transactions.installments.advanceRemaining")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddTransactionDialog
        open={isNewTransactionOpen}
        onOpenChange={setIsNewTransactionOpen}
        categories={categories}
        paymentMethods={paymentMethods}
        createCategoryAction={createCategoryAction}
        createPaymentMethodAction={createPaymentMethodAction}
        onSubmit={handleNewTransactionSubmit}
      />
    </>
  );
}
