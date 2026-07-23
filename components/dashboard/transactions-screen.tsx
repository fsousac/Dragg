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
import {
  type CreditCardInvoicePurchase,
  type Transaction,
  type TransactionType,
} from "@/lib/data";
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
  readonly categories: TransactionFormCategory[];
  readonly advanceInstallmentsAction: (
    data: AdvanceInstallmentsInput,
  ) => Promise<void>;
  readonly createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  readonly createPaymentMethodAction?: (
    data: CreatePaymentMethodInput,
  ) => Promise<void>;
  readonly createTransactionAction: (
    data: NewTransactionInput,
  ) => Promise<void>;
  readonly deleteInstallmentsAction: (
    data: DeleteInstallmentsInput,
  ) => Promise<void>;
  readonly deleteSubscriptionOccurrencesAction: (
    data: DeleteSubscriptionOccurrencesInput,
  ) => Promise<void>;
  readonly deleteTransactionAction: (transactionId: string) => Promise<void>;
  readonly monthlySummary: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
  };
  readonly nextInvoiceTransactions: Transaction[];
  readonly paymentMethods: TransactionFormPaymentMethod[];
  readonly previewInstallmentPrepaymentAction: (
    data: AdvanceInstallmentsInput,
  ) => Promise<InstallmentPrepaymentPreview>;
  readonly showNextInvoice: boolean;
  readonly showPrevious: boolean;
  readonly transactions: Transaction[];
  readonly updateTransactionAction: (
    data: UpdateTransactionInput,
  ) => Promise<void>;
};

type Translate = (key: string) => string;
type FormatCurrency = (value: number) => string;
type FormatDate = (
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
) => string;
type CategoryOption = { label: string; value: string };

function normalizeSearchValue(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function isSubscriptionTransaction(transaction: Transaction) {
  return transaction.notes?.startsWith("subscription") ?? false;
}

function getTransactionAmountColorClass(
  transaction: Pick<Transaction, "type" | "group">,
) {
  if (transaction.type === "income") return "text-income";
  if (transaction.group === "savings") return "text-savings";
  return "text-expense";
}

function renderSortIcon(
  sortOption: SortOption,
  descValue: SortOption,
  ascValue: SortOption,
) {
  if (sortOption === descValue) return <ChevronDown className="size-3" />;
  if (sortOption === ascValue) return <ChevronUp className="size-3" />;
  return <ArrowUpDown className="size-3 opacity-50" />;
}

function getInvoiceTransactionTitle(
  transaction: Pick<Transaction, "invoice" | "paymentMethodKey">,
  t: Translate,
) {
  const invoiceLabelKey =
    transaction.invoice?.paymentMethodKey ?? transaction.paymentMethodKey;

  return invoiceLabelKey
    ? `${t("transaction.creditCardInvoiceFor")} ${t(invoiceLabelKey)}`
    : t("transaction.creditCardInvoice");
}

function buildTransactionSearchText(transaction: Transaction, t: Translate) {
  const invoiceLabelKey =
    transaction.invoice?.paymentMethodKey ?? transaction.paymentMethodKey;

  return [
    transaction.isCreditCardInvoice
      ? getInvoiceTransactionTitle(transaction, t)
      : t(transaction.descriptionKey),
    t(transaction.categoryKey),
    t(`data.group.${transaction.group}`),
    transaction.notes ?? "",
    invoiceLabelKey ? t(invoiceLabelKey) : "",
  ]
    .map(normalizeSearchValue)
    .join(" ");
}

export function isVisibleInSelectedMonth(
  transaction: Transaction,
  selectedMonth: string,
) {
  return (
    !transaction.isCreditCardInvoicePurchase ||
    transaction.date.startsWith(selectedMonth)
  );
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

function getInstallmentDeleteTitleKey(scope: InstallmentDeleteScope) {
  if (scope === "all") return "transactions.installments.deleteAllTitle";
  if (scope === "this_and_following") {
    return "transactions.installments.deleteThisAndFollowingTitle";
  }
  return "transactions.installments.deleteOnlyThisTitle";
}

function getInstallmentDeleteDescriptionKey(scope: InstallmentDeleteScope) {
  if (scope === "all") return "transactions.installments.deleteAllConfirm";
  if (scope === "this_and_following") {
    return "transactions.installments.deleteThisAndFollowingConfirm";
  }
  return "transactions.installments.deleteOnlyThisConfirm";
}

function getBalanceChipColors(balance: number) {
  if (balance >= 0) {
    return {
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      valueColor: "text-emerald-600 dark:text-emerald-400",
    };
  }
  return {
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500 dark:text-rose-400",
    valueColor: "text-rose-500 dark:text-rose-400",
  };
}

type MonthlySummaryTotals = {
  income: number;
  expenses: number;
  savings: number;
  balance: number;
};

type SummaryChipsProps = {
  readonly monthlySummary: MonthlySummaryTotals;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
};

type SummaryChipData = {
  readonly icon: typeof TrendingUp;
  readonly label: string;
  readonly value: string;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly valueColor: string;
};

function buildSummaryChips(
  monthlySummary: MonthlySummaryTotals,
  t: Translate,
  formatCurrency: FormatCurrency,
): SummaryChipData[] {
  return [
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
      ...getBalanceChipColors(monthlySummary.balance),
    },
  ];
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
  valueColor,
}: SummaryChipData) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          iconBg,
        )}
      >
        <Icon className={cn("size-4", iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-base font-bold tabular-nums not-sm:text-xs overflow-auto",
            valueColor,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryChips({
  monthlySummary,
  t,
  formatCurrency,
}: SummaryChipsProps) {
  const chips = buildSummaryChips(monthlySummary, t, formatCurrency);

  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-3"
      style={{ animation: "tx-fade-up 0.45s both" }}
    >
      {chips.map((chip) => (
        <SummaryChip key={chip.label} {...chip} />
      ))}
    </div>
  );
}

type SortToggleButtonProps = {
  readonly label: string;
  readonly active: boolean;
  readonly sortOption: SortOption;
  readonly descValue: SortOption;
  readonly ascValue: SortOption;
  readonly onToggle: () => void;
};

function SortToggleButton({
  label,
  active,
  sortOption,
  descValue,
  ascValue,
  onToggle,
}: SortToggleButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onToggle}
    >
      {label}
      {renderSortIcon(sortOption, descValue, ascValue)}
    </Button>
  );
}

type NextInvoiceSectionProps = {
  readonly transactions: Transaction[];
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly formatDate: FormatDate;
  readonly onOpen: (transaction: Transaction) => void;
};

type NextInvoiceRowProps = {
  readonly transaction: Transaction;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly formatDate: FormatDate;
  readonly onOpen: (transaction: Transaction) => void;
};

type NextInvoiceRowDetailsProps = {
  readonly transaction: Transaction;
  readonly transactionTitle: string;
  readonly t: Translate;
  readonly formatDate: FormatDate;
};

function NextInvoiceRowDetails({
  transaction,
  transactionTitle,
  t,
  formatDate,
}: NextInvoiceRowDetailsProps) {
  return (
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
          {formatDate(transaction.date, { day: "numeric", month: "short" })}
        </span>
        <span>·</span>
        <span>{t(`data.group.${transaction.group}`)}</span>
      </div>
    </div>
  );
}

function NextInvoiceRow({
  transaction,
  t,
  formatCurrency,
  formatDate,
  onOpen,
}: NextInvoiceRowProps) {
  const transactionTitle = transaction.isCreditCardInvoice
    ? getInvoiceTransactionTitle(transaction, t)
    : t(transaction.descriptionKey);

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-4 py-3 text-left opacity-50 transition-colors hover:bg-accent/30 hover:opacity-80 lg:gap-4 lg:px-5"
      onClick={() => onOpen(transaction)}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-xl lg:size-11 lg:text-2xl">
        {transaction.icon}
      </div>
      <NextInvoiceRowDetails
        transaction={transaction}
        transactionTitle={transactionTitle}
        t={t}
        formatDate={formatDate}
      />
      <div className="flex items-center gap-3">
        <p className="text-xs font-medium tabular-nums text-foreground/80 lg:text-sm">
          {transaction.amount > 0 ? "+" : ""}
          {formatCurrency(Math.abs(transaction.amount))}
        </p>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {t("common.view")}
        </Badge>
      </div>
    </button>
  );
}

function NextInvoiceSection({
  transactions,
  t,
  formatCurrency,
  formatDate,
  onOpen,
}: NextInvoiceSectionProps) {
  if (transactions.length === 0) return null;

  return (
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
          {transactions.length}
        </Badge>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {transactions.map((transaction) => (
            <NextInvoiceRow
              key={transaction.id}
              transaction={transaction}
              t={t}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type TransactionRowDeleteMenuItemsProps = {
  readonly transaction: Transaction;
  readonly isInstallment: boolean;
  readonly isSubscription: boolean;
  readonly isRowActionPending: boolean;
  readonly t: Translate;
  readonly onDeleteInstallments: (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => void;
  readonly onDeleteSubscriptionOccurrences: (
    transaction: Transaction,
    scope: DeleteSubscriptionOccurrencesInput["scope"],
  ) => void;
  readonly onDeleteTransaction: (transaction: Transaction) => void;
};

type InstallmentDeleteMenuItemsProps = {
  readonly transaction: Transaction;
  readonly isRowActionPending: boolean;
  readonly t: Translate;
  readonly onDeleteInstallments: (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => void;
};

function InstallmentDeleteMenuItems({
  transaction,
  isRowActionPending,
  t,
  onDeleteInstallments,
}: InstallmentDeleteMenuItemsProps) {
  return (
    <>
      <DropdownMenuItem
        variant="destructive"
        disabled={isRowActionPending}
        onClick={(event) => {
          event.stopPropagation();
          onDeleteInstallments(transaction, "single");
        }}
      >
        <Trash2 className="size-4" />
        {t("transactions.installments.deleteOnlyThis")}
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        disabled={isRowActionPending}
        onClick={(event) => {
          event.stopPropagation();
          onDeleteInstallments(transaction, "this_and_following");
        }}
      >
        <Trash2 className="size-4" />
        {t("transactions.installments.deleteThisAndFollowing")}
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        disabled={isRowActionPending}
        onClick={(event) => {
          event.stopPropagation();
          onDeleteInstallments(transaction, "all");
        }}
      >
        <Trash2 className="size-4" />
        {t("transactions.installments.deleteAll")}
      </DropdownMenuItem>
    </>
  );
}

type SubscriptionDeleteMenuItemsProps = {
  readonly transaction: Transaction;
  readonly isRowActionPending: boolean;
  readonly t: Translate;
  readonly onDeleteSubscriptionOccurrences: (
    transaction: Transaction,
    scope: DeleteSubscriptionOccurrencesInput["scope"],
  ) => void;
};

function SubscriptionDeleteMenuItems({
  transaction,
  isRowActionPending,
  t,
  onDeleteSubscriptionOccurrences,
}: SubscriptionDeleteMenuItemsProps) {
  return (
    <>
      <DropdownMenuItem
        variant="destructive"
        disabled={isRowActionPending}
        onClick={(event) => {
          event.stopPropagation();
          onDeleteSubscriptionOccurrences(transaction, "single");
        }}
      >
        <Trash2 className="size-4" />
        {t("transactions.subscriptions.deleteOnlyThis")}
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        disabled={isRowActionPending}
        onClick={(event) => {
          event.stopPropagation();
          onDeleteSubscriptionOccurrences(
            transaction,
            "this_and_following_unpaid",
          );
        }}
      >
        <Trash2 className="size-4" />
        {t("transactions.subscriptions.deleteThisAndFollowingUnpaid")}
      </DropdownMenuItem>
    </>
  );
}

function TransactionRowDeleteMenuItems({
  transaction,
  isInstallment,
  isSubscription,
  isRowActionPending,
  t,
  onDeleteInstallments,
  onDeleteSubscriptionOccurrences,
  onDeleteTransaction,
}: TransactionRowDeleteMenuItemsProps) {
  if (isInstallment) {
    return (
      <InstallmentDeleteMenuItems
        transaction={transaction}
        isRowActionPending={isRowActionPending}
        t={t}
        onDeleteInstallments={onDeleteInstallments}
      />
    );
  }

  if (isSubscription) {
    return (
      <SubscriptionDeleteMenuItems
        transaction={transaction}
        isRowActionPending={isRowActionPending}
        t={t}
        onDeleteSubscriptionOccurrences={onDeleteSubscriptionOccurrences}
      />
    );
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      disabled={isRowActionPending}
      onClick={(event) => {
        event.stopPropagation();
        onDeleteTransaction(transaction);
      }}
    >
      <Trash2 className="size-4" />
      {t("common.delete")}
    </DropdownMenuItem>
  );
}

type TransactionRowProps = {
  readonly transaction: Transaction;
  readonly isLast: boolean;
  readonly rowIdx: number;
  readonly today: string;
  readonly isPending: boolean;
  readonly pendingTransactionId: string | null;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly onOpen: (transaction: Transaction) => void;
  readonly onDeleteInstallments: (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => void;
  readonly onDeleteSubscriptionOccurrences: (
    transaction: Transaction,
    scope: DeleteSubscriptionOccurrencesInput["scope"],
  ) => void;
  readonly onDeleteTransaction: (transaction: Transaction) => void;
};

type PlannedBadgeProps = {
  readonly isCreditCardInvoice: boolean;
  readonly t: Translate;
  readonly className: string;
};

export function PlannedBadge({
  isCreditCardInvoice,
  t,
  className,
}: PlannedBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      {t(
        isCreditCardInvoice
          ? "screen.transactions.plannedInvoice"
          : "screen.transactions.planned",
      )}
    </Badge>
  );
}

type TransactionTypeIndicatorProps = {
  readonly type: TransactionType;
};

export function TransactionTypeIndicator({
  type,
}: TransactionTypeIndicatorProps) {
  if (type === "income") {
    return <ArrowUpRight className="size-4 shrink-0 text-income" />;
  }
  if (type === "expense") {
    return <ArrowDownRight className="size-4 shrink-0 text-expense" />;
  }
  if (type === "saving") {
    return <Wallet className="size-4 shrink-0 text-savings" />;
  }
  return null;
}

type TransactionRowStateArgs = {
  transaction: Transaction;
  today: string;
  isPending: boolean;
  pendingTransactionId: string | null;
  t: Translate;
};

function getTransactionRowState({
  transaction,
  today,
  isPending,
  pendingTransactionId,
  t,
}: TransactionRowStateArgs) {
  const isPlanned = Boolean(transaction.isPlanned);
  const isCreditCardInvoice = Boolean(transaction.isCreditCardInvoice);

  return {
    isPlanned,
    isCreditCardInvoice,
    isInstallment: isInstallmentTransaction(transaction),
    isSubscription: isSubscriptionTransaction(transaction),
    shouldPresentAsPlanned: isPlanned && transaction.date > today,
    transactionTitle: isCreditCardInvoice
      ? getInvoiceTransactionTitle(transaction, t)
      : t(transaction.descriptionKey),
    isRowActionPending: isPending && pendingTransactionId === transaction.id,
  };
}

type TransactionRowState = ReturnType<typeof getTransactionRowState>;

type TransactionRowMainButtonProps = {
  readonly transaction: Transaction;
  readonly rowState: Pick<TransactionRowState, "isCreditCardInvoice" | "shouldPresentAsPlanned" | "transactionTitle">;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly onOpen: (transaction: Transaction) => void;
};

type TransactionRowTitleProps = {
  readonly transaction: Transaction;
  readonly isCreditCardInvoice: boolean;
  readonly shouldPresentAsPlanned: boolean;
  readonly transactionTitle: string;
  readonly t: Translate;
};

function TransactionRowTitle({
  transaction,
  isCreditCardInvoice,
  shouldPresentAsPlanned,
  transactionTitle,
  t,
}: TransactionRowTitleProps) {
  return (
    <div
      className={cn("min-w-0 flex-1", shouldPresentAsPlanned && "opacity-65")}
    >
      <div className="flex items-center gap-2">
        <p
          className={cn(
            "truncate font-medium text-foreground",
            shouldPresentAsPlanned && "text-muted-foreground",
          )}
        >
          {transactionTitle}
        </p>
        {shouldPresentAsPlanned && (
          <PlannedBadge
            isCreditCardInvoice={isCreditCardInvoice}
            t={t}
            className="shrink-0 border-border bg-muted px-2 py-0 text-[10px] font-medium text-muted-foreground not-lg:hidden"
          />
        )}
        <TransactionTypeIndicator type={transaction.type} />
      </div>
      <div className="mt-1 flex flex-col items-start align-middle gap-2 truncate w-full">
        <Badge variant="secondary" className="text-xs ">
          {t(transaction.categoryKey)}
        </Badge>
        {shouldPresentAsPlanned && (
          <PlannedBadge
            isCreditCardInvoice={isCreditCardInvoice}
            t={t}
            className="lg:hidden shrink-0 border-border bg-muted px-2 py-0 text-[10px] font-medium text-muted-foreground"
          />
        )}
      </div>
    </div>
  );
}

function TransactionRowMainButton({
  transaction,
  rowState,
  t,
  formatCurrency,
  onOpen,
}: TransactionRowMainButtonProps) {
  return (
    <button
      type="button"
      className="flex min-w-0 flex-1 items-center gap-4 rounded-md text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onOpen(transaction)}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-[13px] bg-accent text-xl",
          rowState.shouldPresentAsPlanned && "grayscale opacity-55",
        )}
      >
        {transaction.icon}
      </div>
      <TransactionRowTitle
        transaction={transaction}
        isCreditCardInvoice={rowState.isCreditCardInvoice}
        shouldPresentAsPlanned={rowState.shouldPresentAsPlanned}
        transactionTitle={rowState.transactionTitle}
        t={t}
      />
      <p
        className={cn(
          "tabular-nums font-semibold w-fit",
          getTransactionAmountColorClass(transaction),
        )}
      >
        {transaction.type === "income" ? "+" : ""}
        {formatCurrency(Math.abs(transaction.amount))}
      </p>
    </button>
  );
}

type TransactionRowMenuProps = {
  readonly transaction: Transaction;
  readonly rowState: Pick<TransactionRowState, "isInstallment" | "isSubscription" | "isRowActionPending">;
  readonly t: Translate;
  readonly onOpen: (transaction: Transaction) => void;
  readonly onDeleteInstallments: (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => void;
  readonly onDeleteSubscriptionOccurrences: (
    transaction: Transaction,
    scope: DeleteSubscriptionOccurrencesInput["scope"],
  ) => void;
  readonly onDeleteTransaction: (transaction: Transaction) => void;
};

function TransactionRowMenu({
  transaction,
  rowState,
  t,
  onOpen,
  onDeleteInstallments,
  onDeleteSubscriptionOccurrences,
  onDeleteTransaction,
}: TransactionRowMenuProps) {
  return (
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
            onOpen(transaction);
          }}
        >
          <Pencil className="size-4" />
          {t("common.edit")}
        </DropdownMenuItem>
        <TransactionRowDeleteMenuItems
          transaction={transaction}
          isInstallment={rowState.isInstallment}
          isSubscription={rowState.isSubscription}
          isRowActionPending={rowState.isRowActionPending}
          t={t}
          onDeleteInstallments={onDeleteInstallments}
          onDeleteSubscriptionOccurrences={onDeleteSubscriptionOccurrences}
          onDeleteTransaction={onDeleteTransaction}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getTransactionRowAnimationStyle(rowIdx: number) {
  return { animation: `tx-fade-up 0.3s ${rowIdx * 0.025}s both` };
}

function getTransactionRowClassName(
  isLast: boolean,
  shouldPresentAsPlanned: boolean,
) {
  return cn(
    "flex items-center gap-2 px-4 py-3.5 transition-colors",
    !isLast && "border-b border-border",
    shouldPresentAsPlanned && "bg-muted/20",
  );
}

function TransactionRow({
  transaction,
  isLast,
  rowIdx,
  today,
  isPending,
  pendingTransactionId,
  t,
  formatCurrency,
  onOpen,
  onDeleteInstallments,
  onDeleteSubscriptionOccurrences,
  onDeleteTransaction,
}: TransactionRowProps) {
  const rowState = getTransactionRowState({ transaction, today, isPending, pendingTransactionId, t });
  const rowClassName = getTransactionRowClassName(isLast, rowState.shouldPresentAsPlanned);
  const rowStyle = getTransactionRowAnimationStyle(rowIdx);

  return (
    <div className={rowClassName} style={rowStyle}>
      <TransactionRowMainButton
        transaction={transaction}
        rowState={rowState}
        t={t}
        formatCurrency={formatCurrency}
        onOpen={onOpen}
      />
      {rowState.isCreditCardInvoice ? null : (
        <TransactionRowMenu
          transaction={transaction}
          rowState={rowState}
          t={t}
          onOpen={onOpen}
          onDeleteInstallments={onDeleteInstallments}
          onDeleteSubscriptionOccurrences={onDeleteSubscriptionOccurrences}
          onDeleteTransaction={onDeleteTransaction}
        />
      )}
    </div>
  );
}

type InvoicePurchaseRowProps = {
  readonly purchase: CreditCardInvoicePurchase;
  readonly installmentTransaction: Transaction | undefined;
  readonly isPending: boolean;
  readonly pendingTransactionId: string | null;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly formatDate: FormatDate;
  readonly onOpenInstallmentFromInvoice: (
    installmentTransaction: Transaction,
  ) => void;
  readonly onAdvanceInstallments: (transactionId: string) => void;
};

function canAdvancePurchaseInstallment(purchase: CreditCardInvoicePurchase) {
  // `purchase.installmentLabel` ("N/M") is computed server-side from the
  // same installment fields and is always present on invoice purchases —
  // including next month's, which never show up in the locally loaded
  // `transactions` page window — so gate on it instead of requiring a
  // local match.
  const installmentMatch = purchase.installmentLabel?.match(/^(\d+)\/(\d+)$/);
  return Boolean(
    installmentMatch &&
    Number(installmentMatch[1]) < Number(installmentMatch[2]),
  );
}

type InvoicePurchaseRowActionsProps = {
  readonly purchase: CreditCardInvoicePurchase;
  readonly installmentTransaction: Transaction | undefined;
  readonly canAdvanceInstallment: boolean;
  readonly isPending: boolean;
  readonly pendingTransactionId: string | null;
  readonly t: Translate;
  readonly onOpenInstallmentFromInvoice: (
    installmentTransaction: Transaction,
  ) => void;
  readonly onAdvanceInstallments: (transactionId: string) => void;
};

function InvoicePurchaseRowActions({
  purchase,
  installmentTransaction,
  canAdvanceInstallment,
  isPending,
  pendingTransactionId,
  t,
  onOpenInstallmentFromInvoice,
  onAdvanceInstallments,
}: InvoicePurchaseRowActionsProps) {
  return (
    <>
      {installmentTransaction ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          aria-label={t("common.edit")}
          onClick={() => onOpenInstallmentFromInvoice(installmentTransaction)}
        >
          <Pencil className="size-4" />
        </Button>
      ) : null}
      {canAdvanceInstallment ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          disabled={isPending && pendingTransactionId === purchase.id}
          onClick={() => onAdvanceInstallments(purchase.id)}
        >
          <CalendarArrowDown className="size-4" />
        </Button>
      ) : null}
    </>
  );
}

function InvoicePurchaseRow({
  purchase,
  installmentTransaction,
  isPending,
  pendingTransactionId,
  t,
  formatCurrency,
  formatDate,
  onOpenInstallmentFromInvoice,
  onAdvanceInstallments,
}: InvoicePurchaseRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {t(purchase.descriptionKey)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(purchase.date, { day: "numeric", month: "short" })}
          </span>
          <Badge variant="secondary" className="text-xs">
            {t(purchase.categoryKey)}
          </Badge>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-sm font-semibold tabular-nums">
          {formatCurrency(purchase.amount)}
        </p>
        <InvoicePurchaseRowActions
          purchase={purchase}
          installmentTransaction={installmentTransaction}
          canAdvanceInstallment={canAdvancePurchaseInstallment(purchase)}
          isPending={isPending}
          pendingTransactionId={pendingTransactionId}
          t={t}
          onOpenInstallmentFromInvoice={onOpenInstallmentFromInvoice}
          onAdvanceInstallments={onAdvanceInstallments}
        />
      </div>
    </div>
  );
}

type InvoiceDetailsSectionProps = {
  readonly transaction: Transaction;
  readonly transactions: Transaction[];
  readonly isPending: boolean;
  readonly pendingTransactionId: string | null;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly formatDate: FormatDate;
  readonly onOpenInstallmentFromInvoice: (
    installmentTransaction: Transaction,
  ) => void;
  readonly onAdvanceInstallments: (transactionId: string) => void;
};

type InvoiceCycleInfoProps = {
  readonly invoice: NonNullable<Transaction["invoice"]>;
  readonly t: Translate;
  readonly formatDate: FormatDate;
};

function InvoiceCycleInfo({ invoice, t, formatDate }: InvoiceCycleInfoProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">
          {t("transaction.paymentMethod")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {t(invoice.paymentMethodKey)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {t("transaction.invoiceCycle")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {formatDate(invoice.startsAt, { day: "numeric", month: "short" })} -{" "}
          {formatDate(invoice.closingDate, { day: "numeric", month: "short" })}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {t("transaction.invoiceDueDate")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {formatDate(invoice.dueDate, { day: "numeric", month: "short" })}
        </p>
      </div>
    </div>
  );
}

function InvoiceDetailsSection({
  transaction,
  transactions,
  isPending,
  pendingTransactionId,
  t,
  formatCurrency,
  formatDate,
  onOpenInstallmentFromInvoice,
  onAdvanceInstallments,
}: InvoiceDetailsSectionProps) {
  const invoice = transaction.invoice;
  if (!invoice) return null;

  return (
    <div className="grid gap-4">
      <InvoiceCycleInfo invoice={invoice} t={t} formatDate={formatDate} />

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border bg-muted/30 px-4 py-3 text-sm font-medium">
          <span>{t("transaction.invoicePurchases")}</span>
          <span className="tabular-nums">
            {formatCurrency(Math.abs(transaction.amount))}
          </span>
        </div>
        <div className="divide-y divide-border">
          {invoice.purchases.map((purchase) => (
            <InvoicePurchaseRow
              key={purchase.id}
              purchase={purchase}
              installmentTransaction={transactions.find(
                (candidate) => candidate.id === purchase.id,
              )}
              isPending={isPending}
              pendingTransactionId={pendingTransactionId}
              t={t}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onOpenInstallmentFromInvoice={onOpenInstallmentFromInvoice}
              onAdvanceInstallments={onAdvanceInstallments}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type TransactionEditFormProps = {
  readonly formData: EditableTransaction;
  readonly setFormData: (data: EditableTransaction) => void;
  readonly categoryOptions: CategoryOption[];
  readonly incomeCategoryOption: CategoryOption;
  readonly paymentMethodOptions: CategoryOption[];
  readonly t: Translate;
  readonly resolveCategoryForType: (
    type: TransactionType,
    currentCategory: string,
  ) => string;
};

type TransactionTypeAmountFieldsProps = {
  readonly formData: EditableTransaction;
  readonly setFormData: (data: EditableTransaction) => void;
  readonly t: Translate;
  readonly resolveCategoryForType: (
    type: TransactionType,
    currentCategory: string,
  ) => string;
};

function TransactionTypeAmountFields({
  formData,
  setFormData,
  t,
  resolveCategoryForType,
}: TransactionTypeAmountFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="transaction-type">{t("transaction.type")}</Label>
        <Select
          value={formData.type}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              category: resolveCategoryForType(
                value as TransactionType,
                formData.category,
              ),
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
            <SelectItem value="saving">{t("common.saving")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <CurrencyInput
          id="transaction-amount"
          label={t("transaction.amount")}
          value={formData.amount}
          onValueChange={(amount) => setFormData({ ...formData, amount })}
          labelClassName="normal-case tracking-normal text-foreground"
        />
      </div>
    </div>
  );
}

type TransactionDateCategoryPaymentFieldsProps = {
  readonly formData: EditableTransaction;
  readonly setFormData: (data: EditableTransaction) => void;
  readonly categoryOptions: CategoryOption[];
  readonly incomeCategoryOption: CategoryOption;
  readonly paymentMethodOptions: CategoryOption[];
  readonly t: Translate;
};

function TransactionDateField({
  formData,
  setFormData,
  t,
}: Pick<
  TransactionDateCategoryPaymentFieldsProps,
  "formData" | "setFormData" | "t"
>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="transaction-date">{t("transaction.date")}</Label>
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
  );
}

function TransactionCategoryField({
  formData,
  setFormData,
  categoryOptions,
  incomeCategoryOption,
  t,
}: Pick<
  TransactionDateCategoryPaymentFieldsProps,
  "formData" | "setFormData" | "categoryOptions" | "incomeCategoryOption" | "t"
>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="transaction-category">{t("transaction.category")}</Label>
      <Select
        value={formData.category}
        onValueChange={(value) => setFormData({ ...formData, category: value })}
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
  );
}

function TransactionPaymentField({
  formData,
  setFormData,
  paymentMethodOptions,
  t,
}: Pick<
  TransactionDateCategoryPaymentFieldsProps,
  "formData" | "setFormData" | "paymentMethodOptions" | "t"
>) {
  return (
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
          <SelectValue placeholder={t("transaction.paymentMethod")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t("transaction.paymentMethod")}</SelectItem>
          {paymentMethodOptions.map((paymentMethod) => (
            <SelectItem key={paymentMethod.value} value={paymentMethod.value}>
              {paymentMethod.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TransactionDateCategoryPaymentFields({
  formData,
  setFormData,
  categoryOptions,
  incomeCategoryOption,
  paymentMethodOptions,
  t,
}: TransactionDateCategoryPaymentFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TransactionDateField
        formData={formData}
        setFormData={setFormData}
        t={t}
      />
      <TransactionCategoryField
        formData={formData}
        setFormData={setFormData}
        categoryOptions={categoryOptions}
        incomeCategoryOption={incomeCategoryOption}
        t={t}
      />
      <TransactionPaymentField
        formData={formData}
        setFormData={setFormData}
        paymentMethodOptions={paymentMethodOptions}
        t={t}
      />
    </div>
  );
}

function TransactionEditForm({
  formData,
  setFormData,
  categoryOptions,
  incomeCategoryOption,
  paymentMethodOptions,
  t,
  resolveCategoryForType,
}: TransactionEditFormProps) {
  return (
    <div className="grid gap-4">
      <TransactionTypeAmountFields
        formData={formData}
        setFormData={setFormData}
        t={t}
        resolveCategoryForType={resolveCategoryForType}
      />

      <div className="space-y-2">
        <Label htmlFor="transaction-description">
          {t("transaction.description")}
        </Label>
        <Input
          id="transaction-description"
          value={formData.description}
          onChange={(event) =>
            setFormData({ ...formData, description: event.target.value })
          }
        />
      </div>

      <TransactionDateCategoryPaymentFields
        formData={formData}
        setFormData={setFormData}
        categoryOptions={categoryOptions}
        incomeCategoryOption={incomeCategoryOption}
        paymentMethodOptions={paymentMethodOptions}
        t={t}
      />

      <div className="space-y-2">
        <Label htmlFor="transaction-notes">{t("transaction.notes")}</Label>
        <Textarea
          id="transaction-notes"
          value={formData.notes}
          onChange={(event) =>
            setFormData({ ...formData, notes: event.target.value })
          }
        />
      </div>
    </div>
  );
}

type InstallmentDeleteSplitButtonProps = {
  readonly transaction: Transaction;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onDeleteInstallments: (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => void;
};

function InstallmentDeleteSplitButton({
  transaction,
  isPending,
  t,
  onDeleteInstallments,
}: InstallmentDeleteSplitButtonProps) {
  return (
    <div className="flex flex-1">
      <Button
        type="button"
        variant="destructive"
        className="flex-1 rounded-r-none"
        disabled={isPending}
        onClick={() => onDeleteInstallments(transaction, "single")}
      >
        <Trash2 className="size-4" />
        {t("common.delete")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            className="rounded-l-none border-l border-l-destructive-foreground/30 px-2"
            disabled={isPending}
          >
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              onDeleteInstallments(transaction, "this_and_following")
            }
          >
            {t("transactions.installments.deleteThisAndFollowing")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDeleteInstallments(transaction, "all")}
          >
            {t("transactions.installments.deleteAll")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type TransactionDetailsFooterProps = {
  readonly selectedTransaction: Transaction | null;
  readonly formData: EditableTransaction | null;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onClose: () => void;
  readonly onUpdate: () => void;
  readonly onDeleteInstallments: (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => void;
  readonly onDeleteSubscriptionOccurrences: (
    transaction: Transaction,
    scope: DeleteSubscriptionOccurrencesInput["scope"],
  ) => void;
  readonly onDeleteTransaction: (transaction: Transaction) => void;
};

type TransactionDetailsDeleteButtonProps = {
  readonly transaction: Transaction;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onDeleteInstallments: TransactionDetailsFooterProps["onDeleteInstallments"];
  readonly onDeleteSubscriptionOccurrences: TransactionDetailsFooterProps["onDeleteSubscriptionOccurrences"];
  readonly onDeleteTransaction: TransactionDetailsFooterProps["onDeleteTransaction"];
};

function TransactionDetailsDeleteButton({
  transaction,
  isPending,
  t,
  onDeleteInstallments,
  onDeleteSubscriptionOccurrences,
  onDeleteTransaction,
}: TransactionDetailsDeleteButtonProps) {
  if (isInstallmentTransaction(transaction)) {
    return (
      <InstallmentDeleteSplitButton
        transaction={transaction}
        isPending={isPending}
        t={t}
        onDeleteInstallments={onDeleteInstallments}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="destructive"
      className="flex-1"
      disabled={isPending}
      onClick={() => {
        if (isSubscriptionTransaction(transaction)) {
          onDeleteSubscriptionOccurrences(transaction, "single");
          return;
        }

        onDeleteTransaction(transaction);
      }}
    >
      <Trash2 className="size-4" />
      {t("common.delete")}
    </Button>
  );
}

function TransactionDetailsFooter({
  selectedTransaction,
  formData,
  isPending,
  t,
  onClose,
  onUpdate,
  onDeleteInstallments,
  onDeleteSubscriptionOccurrences,
  onDeleteTransaction,
}: TransactionDetailsFooterProps) {
  return (
    <DialogFooter className="gap-2 sm:justify-between">
      <div className="flex gap-2">
        {selectedTransaction && !selectedTransaction.isCreditCardInvoice && (
          <TransactionDetailsDeleteButton
            transaction={selectedTransaction}
            isPending={isPending}
            t={t}
            onDeleteInstallments={onDeleteInstallments}
            onDeleteSubscriptionOccurrences={onDeleteSubscriptionOccurrences}
            onDeleteTransaction={onDeleteTransaction}
          />
        )}
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isPending}
          onClick={onClose}
        >
          {t("common.cancel")}
        </Button>
      </div>
      {selectedTransaction?.isCreditCardInvoice ? null : (
        <Button
          type="button"
          disabled={isPending || !formData?.description.trim()}
          onClick={onUpdate}
        >
          {isPending ? t("transaction.saving") : t("transaction.saveChanges")}
        </Button>
      )}
    </DialogFooter>
  );
}

type TransactionDetailsDialogProps = {
  readonly selectedTransaction: Transaction | null;
  readonly formData: EditableTransaction | null;
  readonly setFormData: (data: EditableTransaction) => void;
  readonly transactions: Transaction[];
  readonly categoryOptions: CategoryOption[];
  readonly incomeCategoryOption: CategoryOption;
  readonly paymentMethodOptions: CategoryOption[];
  readonly isPending: boolean;
  readonly pendingTransactionId: string | null;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly formatDate: FormatDate;
  readonly onClose: () => void;
  readonly onUpdate: () => void;
  readonly onDeleteInstallments: (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => void;
  readonly onDeleteSubscriptionOccurrences: (
    transaction: Transaction,
    scope: DeleteSubscriptionOccurrencesInput["scope"],
  ) => void;
  readonly onDeleteTransaction: (transaction: Transaction) => void;
  readonly onAdvanceInstallments: (transactionId: string) => void;
  readonly onOpenInstallmentFromInvoice: (
    installmentTransaction: Transaction,
  ) => void;
  readonly resolveCategoryForType: (
    type: TransactionType,
    currentCategory: string,
  ) => string;
};

function TransactionDetailsDialogHeader({
  selectedTransaction,
  t,
}: Pick<TransactionDetailsDialogProps, "selectedTransaction" | "t">) {
  return (
    <DialogHeader>
      <DialogTitle>
        {selectedTransaction?.isCreditCardInvoice
          ? getInvoiceTransactionTitle(selectedTransaction, t)
          : t("transaction.detailsTitle")}
      </DialogTitle>
      <DialogDescription>
        {selectedTransaction?.isCreditCardInvoice
          ? t("transaction.invoiceDetailsDescription")
          : t("transaction.detailsDescription")}
      </DialogDescription>
    </DialogHeader>
  );
}

type TransactionDetailsDialogMainContentProps = Pick<
  TransactionDetailsDialogProps,
  | "selectedTransaction"
  | "formData"
  | "setFormData"
  | "transactions"
  | "categoryOptions"
  | "incomeCategoryOption"
  | "paymentMethodOptions"
  | "isPending"
  | "pendingTransactionId"
  | "t"
  | "formatCurrency"
  | "formatDate"
  | "onAdvanceInstallments"
  | "onOpenInstallmentFromInvoice"
  | "resolveCategoryForType"
>;

function TransactionDetailsDialogMainContent({
  selectedTransaction,
  formData,
  setFormData,
  transactions,
  categoryOptions,
  incomeCategoryOption,
  paymentMethodOptions,
  isPending,
  pendingTransactionId,
  t,
  formatCurrency,
  formatDate,
  onAdvanceInstallments,
  onOpenInstallmentFromInvoice,
  resolveCategoryForType,
}: TransactionDetailsDialogMainContentProps) {
  return (
    <>
      {selectedTransaction?.isCreditCardInvoice &&
        selectedTransaction.invoice && (
          <InvoiceDetailsSection
            transaction={selectedTransaction}
            transactions={transactions}
            isPending={isPending}
            pendingTransactionId={pendingTransactionId}
            t={t}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onOpenInstallmentFromInvoice={onOpenInstallmentFromInvoice}
            onAdvanceInstallments={onAdvanceInstallments}
          />
        )}

      {selectedTransaction && formData && (
        <TransactionEditForm
          formData={formData}
          setFormData={setFormData}
          categoryOptions={categoryOptions}
          incomeCategoryOption={incomeCategoryOption}
          paymentMethodOptions={paymentMethodOptions}
          t={t}
          resolveCategoryForType={resolveCategoryForType}
        />
      )}
    </>
  );
}

function TransactionDetailsDialog(props: TransactionDetailsDialogProps) {
  const { selectedTransaction, t, onClose } = props;
  return (
    <Dialog
      open={Boolean(selectedTransaction)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <TransactionDetailsDialogHeader
          selectedTransaction={selectedTransaction}
          t={t}
        />
        <TransactionDetailsDialogMainContent {...props} />
        <TransactionDetailsFooter {...props} />
      </DialogContent>
    </Dialog>
  );
}

type InstallmentDeleteAlertDialogProps = {
  readonly request: InstallmentDeleteRequest | null;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
};

function InstallmentDeleteAlertDialog({
  request,
  isPending,
  t,
  onOpenChange,
  onConfirm,
}: InstallmentDeleteAlertDialogProps) {
  return (
    <AlertDialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {request ? t(getInstallmentDeleteTitleKey(request.scope)) : null}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {request
              ? t(getInstallmentDeleteDescriptionKey(request.scope))
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

type ConfirmActionAlertDialogProps = {
  readonly confirmRequest: ConfirmRequest | null;
  readonly advanceCount: number;
  readonly onAdvanceCountChange: (count: number) => void;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly formatDate: FormatDate;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
};

function resolveAdvanceInstallmentsCopy({
  confirmRequest,
  advanceCount,
  t,
  formatCurrency,
  formatDate,
}: {
  confirmRequest: Extract<ConfirmRequest, { kind: "advance-installments" }>;
  advanceCount: number;
  t: Translate;
  formatCurrency: FormatCurrency;
  formatDate: FormatDate;
}) {
  const selectedTotal = confirmRequest.preview.installments
    .slice(0, advanceCount)
    .reduce((sum, installment) => sum + installment.amount, 0);

  return {
    title: t("transactions.installments.advanceTitle"),
    description: t("transactions.installments.advanceConfirmDescription")
      .replace("{count}", String(advanceCount))
      .replace("{amount}", formatCurrency(selectedTotal))
      .replace(
        "{month}",
        formatDate(`${confirmRequest.preview.targetMonth}-01`, {
          month: "long",
          year: "numeric",
        }),
      ),
  };
}

function resolveDeleteSubscriptionCopy(
  confirmRequest: Extract<ConfirmRequest, { kind: "delete-subscription" }>,
  t: Translate,
) {
  return {
    title: t(
      confirmRequest.scope === "single"
        ? "transactions.subscriptions.deleteOnlyThisTitle"
        : "transactions.subscriptions.deleteThisAndFollowingUnpaidTitle",
    ),
    description: t(
      confirmRequest.scope === "single"
        ? "transactions.subscriptions.deleteOnlyThisConfirm"
        : "transactions.subscriptions.deleteThisAndFollowingUnpaidConfirm",
    ),
  };
}

function resolveConfirmActionCopy({
  confirmRequest,
  advanceCount,
  t,
  formatCurrency,
  formatDate,
}: {
  confirmRequest: ConfirmRequest | null;
  advanceCount: number;
  t: Translate;
  formatCurrency: FormatCurrency;
  formatDate: FormatDate;
}): { title: string | null; description: string | null } {
  if (confirmRequest?.kind === "delete-transaction") {
    return {
      title: t("transaction.deleteConfirm"),
      description: t("transaction.deleteDescription"),
    };
  }
  if (confirmRequest?.kind === "advance-installments") {
    return resolveAdvanceInstallmentsCopy({
      confirmRequest,
      advanceCount,
      t,
      formatCurrency,
      formatDate,
    });
  }
  if (confirmRequest?.kind === "delete-subscription") {
    return resolveDeleteSubscriptionCopy(confirmRequest, t);
  }
  return { title: null, description: null };
}

type AdvanceInstallmentsCountFieldProps = {
  readonly preview: Extract<
    ConfirmRequest,
    { kind: "advance-installments" }
  >["preview"];
  readonly advanceCount: number;
  readonly onAdvanceCountChange: (count: number) => void;
  readonly t: Translate;
};

function AdvanceInstallmentsCountField({
  preview,
  advanceCount,
  onAdvanceCountChange,
  t,
}: AdvanceInstallmentsCountFieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="advance-count">
        {t("transactions.installments.advanceCountLabel")}
      </Label>
      <Input
        id="advance-count"
        type="number"
        min={1}
        max={preview.count}
        value={advanceCount}
        onChange={(event) => {
          if (event.target.value.trim() === "") return;
          const value = Math.round(Number(event.target.value));
          if (!Number.isFinite(value)) return;
          onAdvanceCountChange(Math.min(Math.max(value, 1), preview.count));
        }}
      />
      <p className="text-xs text-muted-foreground">
        {t("transactions.installments.advanceCountHelp").replace(
          "{max}",
          String(preview.count),
        )}
      </p>
    </div>
  );
}

type ConfirmActionAlertDialogFooterProps = {
  readonly confirmRequest: ConfirmRequest | null;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onConfirm: () => void;
};

function ConfirmActionAlertDialogFooter({
  confirmRequest,
  isPending,
  t,
  onConfirm,
}: ConfirmActionAlertDialogFooterProps) {
  return (
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isPending}>
        {t("common.cancel")}
      </AlertDialogCancel>
      <AlertDialogAction
        disabled={isPending}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        {confirmRequest?.kind === "advance-installments"
          ? t("transactions.installments.advanceRemaining")
          : t("common.delete")}
      </AlertDialogAction>
    </AlertDialogFooter>
  );
}

function ConfirmActionAlertDialog({
  confirmRequest,
  advanceCount,
  onAdvanceCountChange,
  isPending,
  t,
  formatCurrency,
  formatDate,
  onOpenChange,
  onConfirm,
}: ConfirmActionAlertDialogProps) {
  const { title, description } = resolveConfirmActionCopy({
    confirmRequest,
    advanceCount,
    t,
    formatCurrency,
    formatDate,
  });

  const advanceInstallmentsPreview =
    confirmRequest?.kind === "advance-installments"
      ? confirmRequest.preview
      : null;

  return (
    <AlertDialog open={Boolean(confirmRequest)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {advanceInstallmentsPreview ? (
          <AdvanceInstallmentsCountField
            preview={advanceInstallmentsPreview}
            advanceCount={advanceCount}
            onAdvanceCountChange={onAdvanceCountChange}
            t={t}
          />
        ) : null}
        <ConfirmActionAlertDialogFooter
          confirmRequest={confirmRequest}
          isPending={isPending}
          t={t}
          onConfirm={onConfirm}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

type TransactionMutationOutcome = {
  successMessage: string;
  errorLogLabel: string;
  errorMessage: string;
  onSuccess?: () => void;
  onSettled?: () => void;
};

async function runTransactionMutation(
  action: () => Promise<void>,
  {
    successMessage,
    errorLogLabel,
    errorMessage,
    onSuccess,
    onSettled,
  }: TransactionMutationOutcome,
) {
  try {
    await action();
    toast.success(successMessage);
    onSuccess?.();
  } catch (error) {
    console.error(errorLogLabel, error);
    toast.error(errorMessage);
  } finally {
    onSettled?.();
  }
}

type TransactionDateGroupProps = Pick<
  TransactionRowProps,
  | "today"
  | "isPending"
  | "pendingTransactionId"
  | "t"
  | "formatCurrency"
  | "onOpen"
  | "onDeleteInstallments"
  | "onDeleteSubscriptionOccurrences"
  | "onDeleteTransaction"
> & {
  readonly date: string;
  readonly groupTxs: Transaction[];
  readonly groupIdx: number;
  readonly getDateGroupLabel: (date: string) => string;
};

function getDayNet(groupTxs: Transaction[]) {
  return groupTxs.reduce((sum, tx) => {
    if (tx.isCreditCardInvoice) return sum;
    return tx.type === "income"
      ? sum + Math.abs(tx.amount)
      : sum - Math.abs(tx.amount);
  }, 0);
}

function TransactionDateGroupHeader({
  date,
  dayNet,
  getDateGroupLabel,
  formatCurrency,
}: {
  readonly date: string;
  readonly dayNet: number;
  readonly getDateGroupLabel: (date: string) => string;
  readonly formatCurrency: FormatCurrency;
}) {
  return (
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
  );
}

function TransactionDateGroup({
  date,
  groupTxs,
  groupIdx,
  getDateGroupLabel,
  today,
  isPending,
  pendingTransactionId,
  t,
  formatCurrency,
  onOpen,
  onDeleteInstallments,
  onDeleteSubscriptionOccurrences,
  onDeleteTransaction,
}: TransactionDateGroupProps) {
  const dayNet = getDayNet(groupTxs);

  return (
    <div style={{ animation: `tx-fade-up 0.35s ${groupIdx * 0.06}s both` }}>
      <TransactionDateGroupHeader
        date={date}
        dayNet={dayNet}
        getDateGroupLabel={getDateGroupLabel}
        formatCurrency={formatCurrency}
      />
      {/* Group card */}
      <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-sm">
        {groupTxs.map((transaction, rowIdx) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            isLast={rowIdx === groupTxs.length - 1}
            rowIdx={rowIdx}
            today={today}
            isPending={isPending}
            pendingTransactionId={pendingTransactionId}
            t={t}
            formatCurrency={formatCurrency}
            onOpen={onOpen}
            onDeleteInstallments={onDeleteInstallments}
            onDeleteSubscriptionOccurrences={onDeleteSubscriptionOccurrences}
            onDeleteTransaction={onDeleteTransaction}
          />
        ))}
      </div>
    </div>
  );
}

type ConfirmActionMutationConfig = {
  action: () => Promise<void>;
  successMessage: string;
  errorLogLabel: string;
  errorMessage: string;
};

function buildConfirmActionMutation(
  confirmRequest: ConfirmRequest,
  {
    advanceCount,
    selectedMonth,
    t,
  }: { advanceCount: number; selectedMonth: string; t: Translate },
  actions: Pick<
    TransactionsScreenProps,
    | "advanceInstallmentsAction"
    | "deleteSubscriptionOccurrencesAction"
    | "deleteTransactionAction"
  >,
): ConfirmActionMutationConfig {
  if (confirmRequest.kind === "delete-transaction") {
    return {
      action: () =>
        actions.deleteTransactionAction(confirmRequest.transaction.id),
      successMessage: t("transaction.deleteSuccess"),
      errorLogLabel: "Error deleting transaction:",
      errorMessage: t("transaction.deleteError"),
    };
  }

  if (confirmRequest.kind === "advance-installments") {
    return {
      action: () =>
        actions.advanceInstallmentsAction({
          count: advanceCount,
          scope: "remaining",
          targetMonth: selectedMonth,
          transactionId: confirmRequest.transactionId,
        }),
      successMessage: t("transactions.installments.advanceSuccess"),
      errorLogLabel: "Error advancing installments:",
      errorMessage: t("transactions.installments.advanceError"),
    };
  }

  return {
    action: () =>
      actions.deleteSubscriptionOccurrencesAction({
        scope: confirmRequest.scope,
        transactionId: confirmRequest.transaction.id,
      }),
    successMessage: t("transaction.deleteSuccess"),
    errorLogLabel: "Error deleting subscription occurrences:",
    errorMessage: t("transaction.deleteError"),
  };
}

function matchesTransactionFilters(
  transaction: Transaction,
  {
    groupFilter,
    normalizedQuery,
    t,
  }: {
    groupFilter: Transaction["group"] | "all";
    normalizedQuery: string;
    t: Translate;
  },
) {
  if (groupFilter !== "all" && transaction.group !== groupFilter) return false;
  if (!normalizedQuery) return true;
  return buildTransactionSearchText(transaction, t).includes(normalizedQuery);
}

function compareTransactionsBySortOption(
  left: Transaction,
  right: Transaction,
  sortOption: SortOption,
) {
  if (sortOption === "amount-desc")
    return Math.abs(right.amount) - Math.abs(left.amount);
  if (sortOption === "amount-asc")
    return Math.abs(left.amount) - Math.abs(right.amount);

  const leftDate = new Date(left.date).getTime();
  const rightDate = new Date(right.date).getTime();
  return sortOption === "date-asc"
    ? leftDate - rightDate
    : rightDate - leftDate;
}

function buildDateGroups(
  filteredTransactions: Transaction[],
  sortOption: SortOption,
) {
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
}

function computeFilteredTransactions(
  transactions: Transaction[],
  { selectedMonth, groupFilter, normalizedQuery, sortOption, t }: {
    selectedMonth: string;
    groupFilter: Transaction["group"] | "all";
    normalizedQuery: string;
    sortOption: SortOption;
    t: Translate;
  },
) {
  const filtered = transactions.filter(
    (transaction) =>
      isVisibleInSelectedMonth(transaction, selectedMonth) &&
      matchesTransactionFilters(transaction, { groupFilter, normalizedQuery, t }),
  );
  return [...filtered].sort((left, right) => compareTransactionsBySortOption(left, right, sortOption));
}

function useFilteredTransactions({
  transactions,
  nextInvoiceTransactions,
  selectedMonth,
  t,
}: {
  transactions: Transaction[];
  nextInvoiceTransactions: Transaction[];
  selectedMonth: string;
  t: Translate;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<Transaction["group"] | "all">("all");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  const filteredTransactions = useMemo(
    () => computeFilteredTransactions(transactions, { selectedMonth, groupFilter, normalizedQuery, sortOption, t }),
    [groupFilter, normalizedQuery, selectedMonth, sortOption, t, transactions],
  );

  const filteredNextInvoiceTransactions = useMemo(
    () =>
      nextInvoiceTransactions.filter((transaction) =>
        matchesTransactionFilters(transaction, {
          groupFilter,
          normalizedQuery,
          t,
        }),
      ),
    [groupFilter, normalizedQuery, nextInvoiceTransactions, t],
  );

  const dateGroups = useMemo(
    () => buildDateGroups(filteredTransactions, sortOption),
    [filteredTransactions, sortOption],
  );

  return {
    searchQuery,
    setSearchQuery,
    groupFilter,
    setGroupFilter,
    sortOption,
    setSortOption,
    filteredTransactions,
    filteredNextInvoiceTransactions,
    dateGroups,
  };
}

const CATEGORY_GROUP_ORDER = { needs: 0, wants: 1, savings: 2 };

function compareCategoriesByGroupOrder(
  left: TransactionFormCategory,
  right: TransactionFormCategory,
) {
  const order = CATEGORY_GROUP_ORDER as Record<string, number>;
  return order[left.group] - order[right.group];
}

type TransactionsFiltersToolbarProps = {
  readonly transactionCount: number;
  readonly t: Translate;
  readonly searchQuery: string;
  readonly setSearchQuery: (value: string) => void;
  readonly groupFilter: Transaction["group"] | "all";
  readonly setGroupFilter: (value: Transaction["group"] | "all") => void;
  readonly groupOptions: CategoryOption[];
  readonly sortOption: SortOption;
  readonly setSortOption: (value: SortOption) => void;
  readonly isNextInvoiceVisible: boolean;
  readonly setIsNextInvoiceVisible: (updater: (current: boolean) => boolean) => void;
};

function TransactionsSearchInput({
  t,
  searchQuery,
  setSearchQuery,
}: Pick<TransactionsFiltersToolbarProps, "t" | "searchQuery" | "setSearchQuery">) {
  return (
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
  );
}

function TransactionsGroupFilterSelect({
  groupFilter,
  setGroupFilter,
  groupOptions,
}: Pick<TransactionsFiltersToolbarProps, "groupFilter" | "setGroupFilter" | "groupOptions">) {
  return (
    <Select
      value={groupFilter}
      onValueChange={(value) => setGroupFilter(value as Transaction["group"] | "all")}
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
  );
}

function TransactionsSortToggleGroup({
  t,
  sortOption,
  setSortOption,
}: Pick<TransactionsFiltersToolbarProps, "t" | "sortOption" | "setSortOption">) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-1 py-1">
      <SortToggleButton
        label={t("common.date")}
        active={sortOption.startsWith("date")}
        sortOption={sortOption}
        descValue="date-desc"
        ascValue="date-asc"
        onToggle={() => setSortOption(sortOption === "date-desc" ? "date-asc" : "date-desc")}
      />
      <SortToggleButton
        label={t("common.amount")}
        active={sortOption.startsWith("amount")}
        sortOption={sortOption}
        descValue="amount-desc"
        ascValue="amount-asc"
        onToggle={() => setSortOption(sortOption === "amount-desc" ? "amount-asc" : "amount-desc")}
      />
    </div>
  );
}

function TransactionsFiltersExtraActions({
  t,
  searchQuery,
  setSearchQuery,
  groupFilter,
  setGroupFilter,
  isNextInvoiceVisible,
  setIsNextInvoiceVisible,
}: Pick<
  TransactionsFiltersToolbarProps,
  "t" | "searchQuery" | "setSearchQuery" | "groupFilter" | "setGroupFilter" | "isNextInvoiceVisible" | "setIsNextInvoiceVisible"
>) {
  return (
    <>
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
    </>
  );
}

function TransactionsFiltersToolbar({
  transactionCount,
  t,
  searchQuery,
  setSearchQuery,
  groupFilter,
  setGroupFilter,
  groupOptions,
  sortOption,
  setSortOption,
  isNextInvoiceVisible,
  setIsNextInvoiceVisible,
}: TransactionsFiltersToolbarProps) {
  return (
    <Card
      className="border-border bg-card card-shadow py-5 my-3"
      style={{ animation: "tx-fade-up 0.45s 0.06s both" }}
    >
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="font-semibold text-2xl">
              {transactionCount} {t("screen.transactions.count")}
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TransactionsSearchInput t={t} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <TransactionsGroupFilterSelect
              groupFilter={groupFilter}
              setGroupFilter={setGroupFilter}
              groupOptions={groupOptions}
            />
            <TransactionsSortToggleGroup t={t} sortOption={sortOption} setSortOption={setSortOption} />
            <TransactionsFiltersExtraActions
              t={t}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              groupFilter={groupFilter}
              setGroupFilter={setGroupFilter}
              isNextInvoiceVisible={isNextInvoiceVisible}
              setIsNextInvoiceVisible={setIsNextInvoiceVisible}
            />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

type TransactionsScreenMutationDialogsProps = {
  readonly installmentDeleteRequest: InstallmentDeleteRequest | null;
  readonly confirmRequest: ConfirmRequest | null;
  readonly advanceCount: number;
  readonly setAdvanceCount: (count: number) => void;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly formatCurrency: FormatCurrency;
  readonly formatDate: FormatDate;
  readonly setInstallmentDeleteRequest: (request: InstallmentDeleteRequest | null) => void;
  readonly setConfirmRequest: (request: ConfirmRequest | null) => void;
  readonly confirmDeleteInstallments: () => void;
  readonly confirmAction: () => void;
};

function TransactionsScreenMutationDialogs({
  installmentDeleteRequest,
  confirmRequest,
  advanceCount,
  setAdvanceCount,
  isPending,
  t,
  formatCurrency,
  formatDate,
  setInstallmentDeleteRequest,
  setConfirmRequest,
  confirmDeleteInstallments,
  confirmAction,
}: TransactionsScreenMutationDialogsProps) {
  return (
    <>
      <InstallmentDeleteAlertDialog
        request={installmentDeleteRequest}
        isPending={isPending}
        t={t}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setInstallmentDeleteRequest(null);
          }
        }}
        onConfirm={confirmDeleteInstallments}
      />

      <ConfirmActionAlertDialog
        confirmRequest={confirmRequest}
        advanceCount={advanceCount}
        onAdvanceCountChange={setAdvanceCount}
        isPending={isPending}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setConfirmRequest(null);
          }
        }}
        onConfirm={confirmAction}
      />
    </>
  );
}

type TransactionsTimelineListProps = Pick<
  TransactionDateGroupProps,
  | "today"
  | "isPending"
  | "pendingTransactionId"
  | "t"
  | "formatCurrency"
  | "onOpen"
  | "onDeleteInstallments"
  | "onDeleteSubscriptionOccurrences"
  | "onDeleteTransaction"
> & {
  readonly dateGroups: [string, Transaction[]][];
  readonly getDateGroupLabel: (date: string) => string;
  readonly showPrevious: boolean;
  readonly transactionsHref: string;
  readonly previousTransactionsHref: string;
};

function TransactionsTimelineList({
  dateGroups,
  getDateGroupLabel,
  showPrevious,
  transactionsHref,
  previousTransactionsHref,
  t,
  ...rowProps
}: TransactionsTimelineListProps) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      {dateGroups.map(([date, groupTxs], groupIdx) => (
        <TransactionDateGroup
          key={date}
          date={date}
          groupTxs={groupTxs}
          groupIdx={groupIdx}
          getDateGroupLabel={getDateGroupLabel}
          t={t}
          {...rowProps}
        />
      ))}
      <div className="flex justify-center">
        <Button asChild size="sm" variant="outline">
          <Link href={showPrevious ? transactionsHref : previousTransactionsHref}>
            {showPrevious ? t("screen.transactions.hidePrevious") : t("screen.transactions.showPrevious")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function useTransactionsScreenNavigation({
  searchParams,
  t,
  formatDate,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
  t: Translate;
  formatDate: FormatDate;
}) {
  const selectedMonth = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const transactionsHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", selectedMonth);
    return `/transactions?${params.toString()}`;
  }, [searchParams, selectedMonth]);

  const previousTransactionsHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", selectedMonth);
    params.set("history", "1");
    return `/transactions?${params.toString()}`;
  }, [searchParams, selectedMonth]);

  const getDateGroupLabel = (date: string) => {
    if (date === today) return t("common.today");
    if (date === yesterday) return t("common.yesterday");
    return formatDate(date, { day: "numeric", month: "short" });
  };

  return { selectedMonth, transactionsHref, previousTransactionsHref, getDateGroupLabel, today };
}

function useTransactionDialogsState(showNextInvoice: boolean) {
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [invoiceOrigin, setInvoiceOrigin] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<EditableTransaction | null>(null);
  const [pendingTransactionId, setPendingTransactionId] = useState<
    string | null
  >(null);
  const [installmentDeleteRequest, setInstallmentDeleteRequest] =
    useState<InstallmentDeleteRequest | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(
    null,
  );
  const [advanceCount, setAdvanceCount] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isNextInvoiceVisible, setIsNextInvoiceVisible] =
    useState(showNextInvoice);

  return {
    isNewTransactionOpen,
    setIsNewTransactionOpen,
    selectedTransaction,
    setSelectedTransaction,
    invoiceOrigin,
    setInvoiceOrigin,
    formData,
    setFormData,
    pendingTransactionId,
    setPendingTransactionId,
    installmentDeleteRequest,
    setInstallmentDeleteRequest,
    confirmRequest,
    setConfirmRequest,
    advanceCount,
    setAdvanceCount,
    isPending,
    startTransition,
    isNextInvoiceVisible,
    setIsNextInvoiceVisible,
  };
}

type TransactionDialogsState = ReturnType<typeof useTransactionDialogsState>;

function resolveCategoryForType(
  type: TransactionType,
  currentCategory: string,
  { incomeCategoryId, categoryOptions }: { incomeCategoryId: string; categoryOptions: CategoryOption[] },
) {
  if (type === "income") return incomeCategoryId;

  const isCurrentCategoryStillValid = categoryOptions.some(
    (category) => category.value === currentCategory,
  );

  return isCurrentCategoryStillValid ? currentCategory : (categoryOptions[0]?.value ?? "none");
}

function useTransactionDialogNavigation({
  dialogsState,
  incomeCategoryId,
  categoryOptions,
}: {
  dialogsState: TransactionDialogsState;
  incomeCategoryId: string;
  categoryOptions: CategoryOption[];
}) {
  const {
    selectedTransaction,
    setSelectedTransaction,
    setFormData,
    invoiceOrigin,
    setInvoiceOrigin,
    isPending,
  } = dialogsState;

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
    if (invoiceOrigin) {
      setSelectedTransaction(invoiceOrigin);
      setFormData(null);
      setInvoiceOrigin(null);
      return;
    }
    setSelectedTransaction(null);
    setFormData(null);
  };

  const openInstallmentFromInvoice = (installmentTransaction: Transaction) => {
    /* c8 ignore next */
    if (!selectedTransaction) return;
    setInvoiceOrigin(selectedTransaction);
    openTransactionDialog(installmentTransaction);
  };

  const resolveCategory = (type: TransactionType, currentCategory: string) =>
    resolveCategoryForType(type, currentCategory, { incomeCategoryId, categoryOptions });

  return {
    resolveCategoryForType: resolveCategory,
    openTransactionDialog,
    closeTransactionDialog,
    openInstallmentFromInvoice,
  };
}

function useTransactionDeleteRequestHandlers(
  dialogsState: TransactionDialogsState,
) {
  const { setConfirmRequest, setInstallmentDeleteRequest } = dialogsState;

  const handleDeleteTransaction = (transaction: Transaction) => {
    setConfirmRequest({ kind: "delete-transaction", transaction });
  };

  const handleDeleteInstallments = (
    transaction: Transaction,
    scope: InstallmentDeleteScope,
  ) => {
    setInstallmentDeleteRequest({ scope, transaction });
  };

  const handleDeleteSubscriptionOccurrences = (
    transaction: Transaction,
    scope: DeleteSubscriptionOccurrencesInput["scope"],
  ) => {
    setConfirmRequest({ kind: "delete-subscription", transaction, scope });
  };

  return {
    handleDeleteTransaction,
    handleDeleteInstallments,
    handleDeleteSubscriptionOccurrences,
  };
}

function useAdvanceInstallmentsHandler({
  previewInstallmentPrepaymentAction,
  selectedMonth,
  t,
  dialogsState,
}: {
  previewInstallmentPrepaymentAction: TransactionsScreenProps["previewInstallmentPrepaymentAction"];
  selectedMonth: string;
  t: Translate;
  dialogsState: TransactionDialogsState;
}) {
  const {
    setPendingTransactionId,
    startTransition,
    setAdvanceCount,
    setConfirmRequest,
  } = dialogsState;

  const handleAdvanceInstallmentsById = (transactionId: string) => {
    // The server action looks the transaction up by id and validates it's
    // an installment itself, so this doesn't need to find it in the
    // currently loaded `transactions` page window first — that window only
    // covers the selected month and excludes next month's invoice purchases.
    setPendingTransactionId(transactionId);
    startTransition(async () => {
      try {
        const preview = await previewInstallmentPrepaymentAction({
          scope: "remaining",
          targetMonth: selectedMonth,
          transactionId,
        });

        if (preview.count === 0) {
          toast.error(t("transactions.installments.advanceNone"));
          return;
        }

        setAdvanceCount(preview.count);
        setConfirmRequest({
          kind: "advance-installments",
          preview,
          transactionId,
        });
      } catch (error) {
        console.error("Error advancing installments:", error);
        toast.error(t("transactions.installments.advanceError"));
      } finally {
        setPendingTransactionId(null);
      }
    });
  };

  return { handleAdvanceInstallmentsById };
}

function useConfirmInstallmentDeletion({
  deleteInstallmentsAction,
  dialogsState,
  closeTransactionDialog,
  router,
  t,
}: {
  deleteInstallmentsAction: TransactionsScreenProps["deleteInstallmentsAction"];
  dialogsState: TransactionDialogsState;
  closeTransactionDialog: () => void;
  router: ReturnType<typeof useRouter>;
  t: Translate;
}) {
  const {
    installmentDeleteRequest,
    setInstallmentDeleteRequest,
    setPendingTransactionId,
    startTransition,
  } = dialogsState;

  const confirmDeleteInstallments = () => {
    /* c8 ignore next */
    if (!installmentDeleteRequest) return;

    setPendingTransactionId(installmentDeleteRequest.transaction.id);
    startTransition(() =>
      runTransactionMutation(
        () =>
          deleteInstallmentsAction({
            scope: installmentDeleteRequest.scope,
            transactionId: installmentDeleteRequest.transaction.id,
          }),
        {
          successMessage: t("transaction.deleteSuccess"),
          errorLogLabel: "Error deleting installments:",
          errorMessage: t("transaction.deleteError"),
          onSuccess: () => {
            setInstallmentDeleteRequest(null);
            closeTransactionDialog();
            router.refresh();
          },
          onSettled: () => setPendingTransactionId(null),
        },
      ),
    );
  };

  return { confirmDeleteInstallments };
}

type ConfirmActionMutationActions = Pick<
  TransactionsScreenProps,
  "advanceInstallmentsAction" | "deleteSubscriptionOccurrencesAction" | "deleteTransactionAction"
>;

function useConfirmActionHandler({
  actions,
  dialogsState,
  closeTransactionDialog,
  router,
  t,
  selectedMonth,
}: {
  actions: ConfirmActionMutationActions;
  dialogsState: TransactionDialogsState;
  closeTransactionDialog: () => void;
  router: ReturnType<typeof useRouter>;
  t: Translate;
  selectedMonth: string;
}) {
  const {
    confirmRequest,
    advanceCount,
    setPendingTransactionId,
    setConfirmRequest,
    startTransition,
  } = dialogsState;

  const confirmAction = () => {
    /* c8 ignore next */
    if (!confirmRequest) return;

    if (confirmRequest.kind !== "advance-installments") {
      setPendingTransactionId(confirmRequest.transaction.id);
    }

    const mutation = buildConfirmActionMutation(
      confirmRequest,
      { advanceCount, selectedMonth, t },
      actions,
    );

    startTransition(() =>
      runTransactionMutation(mutation.action, {
        ...mutation,
        onSuccess: () => {
          setConfirmRequest(null);
          closeTransactionDialog();
          router.refresh();
        },
        onSettled:
          confirmRequest.kind === "advance-installments"
            ? undefined
            : () => setPendingTransactionId(null),
      }),
    );
  };

  return { confirmAction };
}

function useTransactionConfirmHandlers({
  deleteInstallmentsAction,
  actions,
  dialogsState,
  closeTransactionDialog,
  router,
  t,
  selectedMonth,
}: {
  deleteInstallmentsAction: TransactionsScreenProps["deleteInstallmentsAction"];
  actions: ConfirmActionMutationActions;
  dialogsState: TransactionDialogsState;
  closeTransactionDialog: () => void;
  router: ReturnType<typeof useRouter>;
  t: Translate;
  selectedMonth: string;
}) {
  const { confirmDeleteInstallments } = useConfirmInstallmentDeletion({
    deleteInstallmentsAction,
    dialogsState,
    closeTransactionDialog,
    router,
    t,
  });

  const { confirmAction } = useConfirmActionHandler({
    actions,
    dialogsState,
    closeTransactionDialog,
    router,
    t,
    selectedMonth,
  });

  return { confirmDeleteInstallments, confirmAction };
}

function buildNewTransactionInput(data: TransactionFormData): NewTransactionInput {
  return {
    amount: data.amount,
    category: data.category === "none" ? "" : data.category,
    date: data.date,
    description: data.description.trim(),
    installmentCount: data.installmentCount,
    notes: data.notes?.trim() || undefined,
    paymentMethod: data.paymentMethod === "none" ? "" : data.paymentMethod,
    type: data.type,
  };
}

function buildUpdateTransactionInput(
  selectedTransaction: Transaction,
  formData: EditableTransaction,
): UpdateTransactionInput {
  return {
    amount: formData.amount,
    category: formData.category,
    date: formData.date,
    description: formData.description,
    id: selectedTransaction.id,
    notes: formData.notes,
    paymentMethod: formData.paymentMethod,
    type: formData.type,
  };
}

function useTransactionSubmitHandlers({
  createTransactionAction,
  updateTransactionAction,
  dialogsState,
  closeTransactionDialog,
  router,
  t,
}: {
  createTransactionAction: TransactionsScreenProps["createTransactionAction"];
  updateTransactionAction: TransactionsScreenProps["updateTransactionAction"];
  dialogsState: TransactionDialogsState;
  closeTransactionDialog: () => void;
  router: ReturnType<typeof useRouter>;
  t: Translate;
}) {
  const {
    selectedTransaction,
    formData,
    setPendingTransactionId,
    startTransition,
  } = dialogsState;

  const handleNewTransactionSubmit = async (data: TransactionFormData) => {
    await createTransactionAction(buildNewTransactionInput(data));
  };

  const handleUpdateTransaction = () => {
    /* c8 ignore next */
    if (!selectedTransaction || !formData) return;

    setPendingTransactionId(selectedTransaction.id);
    startTransition(() =>
      runTransactionMutation(
        () => updateTransactionAction(buildUpdateTransactionInput(selectedTransaction, formData)),
        {
          successMessage: t("transaction.updateSuccess"),
          errorLogLabel: "Error updating transaction:",
          errorMessage: t("transaction.updateError"),
          onSuccess: () => {
            closeTransactionDialog();
            router.refresh();
          },
          onSettled: () => setPendingTransactionId(null),
        },
      ),
    );
  };

  return { handleNewTransactionSubmit, handleUpdateTransaction };
}

function useTransactionGroupOptions(t: Translate) {
  return useMemo(
    () => [
      { label: t("common.all"), value: "all" as const },
      { label: t("data.group.needs"), value: "needs" as const },
      { label: t("data.group.wants"), value: "wants" as const },
      { label: t("data.group.savings"), value: "savings" as const },
      { label: t("data.group.income"), value: "income" as const },
    ],
    [t],
  );
}

function useTransactionOptionsData({
  categories,
  paymentMethods,
  t,
}: Pick<TransactionsScreenProps, "categories" | "paymentMethods"> & {
  t: Translate;
}) {
  const groupOptions = useTransactionGroupOptions(t);
  const categoryOptions = useMemo(
    () =>
      [...categories]
        .filter(
          (category) => category.id !== "none" && category.group !== "income",
        )
        .sort(compareCategoriesByGroupOrder)
        .map((category) => ({ label: t(category.label), value: category.id })),
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

  const paymentMethodOptions = useMemo(
    () =>
      paymentMethods.map((paymentMethod) => ({
        label: t(paymentMethod.label),
        value: paymentMethod.id,
      })),
    [paymentMethods, t],
  );

  return {
    categoryOptions,
    incomeCategoryOption,
    incomeCategoryId: incomeCategoryOption.value,
    paymentMethodOptions,
    groupOptions,
  };
}

function useTransactionsScreenBaseState({
  categories,
  paymentMethods,
  monthlySummary: monthlySummaryTotals,
  showNextInvoice,
}: Pick<TransactionsScreenProps, "categories" | "paymentMethods" | "monthlySummary" | "showNextInvoice">) {
  const { formatCurrency, formatDate, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dialogsState = useTransactionDialogsState(showNextInvoice);
  const navigation = useTransactionsScreenNavigation({ searchParams, t, formatDate });

  const monthlySummary = useMemo(() => {
    const income = monthlySummaryTotals.totalIncome;
    const expenses = monthlySummaryTotals.totalExpenses;
    const savings = monthlySummaryTotals.totalSavings;
    return { income, expenses, savings, balance: income - expenses - savings };
  }, [monthlySummaryTotals]);

  const options = useTransactionOptionsData({ categories, paymentMethods, t });

  return {
    formatCurrency,
    formatDate,
    t,
    router,
    dialogsState,
    ...dialogsState,
    ...navigation,
    monthlySummary,
    ...options,
  };
}

type TransactionsScreenBaseState = ReturnType<typeof useTransactionsScreenBaseState>;

function useTransactionMutationOnlyHandlers({
  base,
  props,
  closeTransactionDialog,
}: {
  base: TransactionsScreenBaseState;
  props: TransactionsScreenProps;
  closeTransactionDialog: () => void;
}) {
  const { handleAdvanceInstallmentsById } = useAdvanceInstallmentsHandler({
    previewInstallmentPrepaymentAction: props.previewInstallmentPrepaymentAction,
    selectedMonth: base.selectedMonth,
    t: base.t,
    dialogsState: base.dialogsState,
  });

  const confirmHandlers = useTransactionConfirmHandlers({
    deleteInstallmentsAction: props.deleteInstallmentsAction,
    actions: {
      advanceInstallmentsAction: props.advanceInstallmentsAction,
      deleteSubscriptionOccurrencesAction: props.deleteSubscriptionOccurrencesAction,
      deleteTransactionAction: props.deleteTransactionAction,
    },
    dialogsState: base.dialogsState,
    closeTransactionDialog,
    router: base.router,
    t: base.t,
    selectedMonth: base.selectedMonth,
  });

  const submitHandlers = useTransactionSubmitHandlers({
    createTransactionAction: props.createTransactionAction,
    updateTransactionAction: props.updateTransactionAction,
    dialogsState: base.dialogsState,
    closeTransactionDialog,
    router: base.router,
    t: base.t,
  });

  return { handleAdvanceInstallmentsById, ...confirmHandlers, ...submitHandlers };
}

function useTransactionsScreenHandlers({
  base,
  props,
}: {
  base: TransactionsScreenBaseState;
  props: TransactionsScreenProps;
}) {
  const { resolveCategoryForType, openTransactionDialog, closeTransactionDialog, openInstallmentFromInvoice } =
    useTransactionDialogNavigation({
      dialogsState: base.dialogsState,
      incomeCategoryId: base.incomeCategoryId,
      categoryOptions: base.categoryOptions,
    });

  const deleteRequestHandlers = useTransactionDeleteRequestHandlers(base.dialogsState);
  const mutationHandlers = useTransactionMutationOnlyHandlers({ base, props, closeTransactionDialog });

  return {
    resolveCategoryForType,
    openTransactionDialog,
    closeTransactionDialog,
    openInstallmentFromInvoice,
    ...deleteRequestHandlers,
    ...mutationHandlers,
  };
}

function useTransactionsScreenState(props: TransactionsScreenProps) {
  const base = useTransactionsScreenBaseState(props);
  const filtering = useFilteredTransactions({
    transactions: props.transactions,
    nextInvoiceTransactions: props.nextInvoiceTransactions,
    selectedMonth: base.selectedMonth,
    t: base.t,
  });
  const handlers = useTransactionsScreenHandlers({ base, props });
  return { ...base, ...filtering, ...handlers };
}

type TransactionsScreenState = ReturnType<typeof useTransactionsScreenState>;

type TransactionsScreenMainSectionProps = Pick<TransactionsScreenProps, "showPrevious"> &
  Pick<
    TransactionsScreenState,
    | "t"
    | "formatCurrency"
    | "formatDate"
    | "setIsNewTransactionOpen"
    | "monthlySummary"
    | "filteredTransactions"
    | "searchQuery"
    | "setSearchQuery"
    | "groupFilter"
    | "setGroupFilter"
    | "groupOptions"
    | "sortOption"
    | "setSortOption"
    | "isNextInvoiceVisible"
    | "setIsNextInvoiceVisible"
    | "filteredNextInvoiceTransactions"
    | "openTransactionDialog"
    | "dateGroups"
    | "getDateGroupLabel"
    | "transactionsHref"
    | "previousTransactionsHref"
    | "today"
    | "isPending"
    | "pendingTransactionId"
    | "handleDeleteInstallments"
    | "handleDeleteSubscriptionOccurrences"
    | "handleDeleteTransaction"
  >;

function TransactionsScreenPageHeader({
  t,
  setIsNewTransactionOpen,
}: Pick<TransactionsScreenMainSectionProps, "t" | "setIsNewTransactionOpen">) {
  return (
    <PageHeader
      title={t("screen.transactions.title")}
      description={t("screen.transactions.description")}
      actions={
        <Button className="gap-2 text-background" onClick={() => setIsNewTransactionOpen(true)}>
          <Plus className="size-4" />
          {t("screen.transactions.add")}
        </Button>
      }
    />
  );
}

type TransactionsScreenListSectionProps = Pick<
  TransactionsScreenMainSectionProps,
  | "t"
  | "formatCurrency"
  | "formatDate"
  | "isNextInvoiceVisible"
  | "filteredNextInvoiceTransactions"
  | "openTransactionDialog"
  | "dateGroups"
  | "getDateGroupLabel"
  | "showPrevious"
  | "transactionsHref"
  | "previousTransactionsHref"
  | "today"
  | "isPending"
  | "pendingTransactionId"
  | "handleDeleteInstallments"
  | "handleDeleteSubscriptionOccurrences"
  | "handleDeleteTransaction"
>;

function TransactionsScreenListSection({
  t,
  formatCurrency,
  formatDate,
  isNextInvoiceVisible,
  filteredNextInvoiceTransactions,
  openTransactionDialog,
  dateGroups,
  getDateGroupLabel,
  showPrevious,
  transactionsHref,
  previousTransactionsHref,
  today,
  isPending,
  pendingTransactionId,
  handleDeleteInstallments,
  handleDeleteSubscriptionOccurrences,
  handleDeleteTransaction,
}: TransactionsScreenListSectionProps) {
  return (
    <>
      {isNextInvoiceVisible && (
        <NextInvoiceSection
          transactions={filteredNextInvoiceTransactions}
          t={t}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onOpen={openTransactionDialog}
        />
      )}

      <TransactionsTimelineList
        dateGroups={dateGroups}
        getDateGroupLabel={getDateGroupLabel}
        showPrevious={showPrevious}
        transactionsHref={transactionsHref}
        previousTransactionsHref={previousTransactionsHref}
        today={today}
        isPending={isPending}
        pendingTransactionId={pendingTransactionId}
        t={t}
        formatCurrency={formatCurrency}
        onOpen={openTransactionDialog}
        onDeleteInstallments={handleDeleteInstallments}
        onDeleteSubscriptionOccurrences={handleDeleteSubscriptionOccurrences}
        onDeleteTransaction={handleDeleteTransaction}
      />
    </>
  );
}

function TransactionsScreenMainSection(props: TransactionsScreenMainSectionProps) {
  const { t, formatCurrency, setIsNewTransactionOpen, monthlySummary, filteredTransactions } = props;
  return (
    <>
      <TransactionsScreenPageHeader t={t} setIsNewTransactionOpen={setIsNewTransactionOpen} />

      <SummaryChips monthlySummary={monthlySummary} t={t} formatCurrency={formatCurrency} />

      <TransactionsFiltersToolbar
        transactionCount={filteredTransactions.length}
        t={t}
        searchQuery={props.searchQuery}
        setSearchQuery={props.setSearchQuery}
        groupFilter={props.groupFilter}
        setGroupFilter={props.setGroupFilter}
        groupOptions={props.groupOptions}
        sortOption={props.sortOption}
        setSortOption={props.setSortOption}
        isNextInvoiceVisible={props.isNextInvoiceVisible}
        setIsNextInvoiceVisible={props.setIsNextInvoiceVisible}
      />

      <TransactionsScreenListSection {...props} />
    </>
  );
}

type TransactionsScreenDialogsSectionProps = Pick<
  TransactionsScreenProps,
  "categories" | "paymentMethods" | "createCategoryAction" | "createPaymentMethodAction" | "transactions"
> &
  Pick<
    TransactionsScreenState,
    | "selectedTransaction"
    | "formData"
    | "setFormData"
    | "categoryOptions"
    | "incomeCategoryOption"
    | "paymentMethodOptions"
    | "isPending"
    | "pendingTransactionId"
    | "t"
    | "formatCurrency"
    | "formatDate"
    | "closeTransactionDialog"
    | "handleUpdateTransaction"
    | "handleDeleteInstallments"
    | "handleDeleteSubscriptionOccurrences"
    | "handleDeleteTransaction"
    | "handleAdvanceInstallmentsById"
    | "openInstallmentFromInvoice"
    | "resolveCategoryForType"
    | "installmentDeleteRequest"
    | "confirmRequest"
    | "advanceCount"
    | "setAdvanceCount"
    | "setInstallmentDeleteRequest"
    | "setConfirmRequest"
    | "confirmDeleteInstallments"
    | "confirmAction"
    | "isNewTransactionOpen"
    | "setIsNewTransactionOpen"
    | "handleNewTransactionSubmit"
  >;

function TransactionsScreenDetailsDialog(
  props: Pick<
    TransactionsScreenDialogsSectionProps,
    | "selectedTransaction"
    | "formData"
    | "setFormData"
    | "transactions"
    | "categoryOptions"
    | "incomeCategoryOption"
    | "paymentMethodOptions"
    | "isPending"
    | "pendingTransactionId"
    | "t"
    | "formatCurrency"
    | "formatDate"
    | "closeTransactionDialog"
    | "handleUpdateTransaction"
    | "handleDeleteInstallments"
    | "handleDeleteSubscriptionOccurrences"
    | "handleDeleteTransaction"
    | "handleAdvanceInstallmentsById"
    | "openInstallmentFromInvoice"
    | "resolveCategoryForType"
  >,
) {
  return (
    <TransactionDetailsDialog
      selectedTransaction={props.selectedTransaction}
      formData={props.formData}
      setFormData={props.setFormData}
      transactions={props.transactions}
      categoryOptions={props.categoryOptions}
      incomeCategoryOption={props.incomeCategoryOption}
      paymentMethodOptions={props.paymentMethodOptions}
      isPending={props.isPending}
      pendingTransactionId={props.pendingTransactionId}
      t={props.t}
      formatCurrency={props.formatCurrency}
      formatDate={props.formatDate}
      onClose={props.closeTransactionDialog}
      onUpdate={props.handleUpdateTransaction}
      onDeleteInstallments={props.handleDeleteInstallments}
      onDeleteSubscriptionOccurrences={props.handleDeleteSubscriptionOccurrences}
      onDeleteTransaction={props.handleDeleteTransaction}
      onAdvanceInstallments={props.handleAdvanceInstallmentsById}
      onOpenInstallmentFromInvoice={props.openInstallmentFromInvoice}
      resolveCategoryForType={props.resolveCategoryForType}
    />
  );
}

function TransactionsScreenDialogsSection(props: TransactionsScreenDialogsSectionProps) {
  return (
    <>
      <TransactionsScreenDetailsDialog {...props} />

      <TransactionsScreenMutationDialogs
        installmentDeleteRequest={props.installmentDeleteRequest}
        confirmRequest={props.confirmRequest}
        advanceCount={props.advanceCount}
        setAdvanceCount={props.setAdvanceCount}
        isPending={props.isPending}
        t={props.t}
        formatCurrency={props.formatCurrency}
        formatDate={props.formatDate}
        setInstallmentDeleteRequest={props.setInstallmentDeleteRequest}
        setConfirmRequest={props.setConfirmRequest}
        confirmDeleteInstallments={props.confirmDeleteInstallments}
        confirmAction={props.confirmAction}
      />

      <AddTransactionDialog
        open={props.isNewTransactionOpen}
        onOpenChange={props.setIsNewTransactionOpen}
        categories={props.categories}
        paymentMethods={props.paymentMethods}
        createCategoryAction={props.createCategoryAction}
        createPaymentMethodAction={props.createPaymentMethodAction}
        onSubmit={props.handleNewTransactionSubmit}
      />
    </>
  );
}

export function TransactionsScreen(props: TransactionsScreenProps) {
  const state = useTransactionsScreenState(props);
  return (
    <>
      <TransactionsScreenMainSection showPrevious={props.showPrevious} {...state} />
      <TransactionsScreenDialogsSection
        categories={props.categories}
        paymentMethods={props.paymentMethods}
        createCategoryAction={props.createCategoryAction}
        createPaymentMethodAction={props.createPaymentMethodAction}
        transactions={props.transactions}
        {...state}
      />
    </>
  );
}
