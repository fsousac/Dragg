"use client";

import {
  Building2,
  CreditCard,
  MoreVertical,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type PaymentMethodOverviewItem,
  type UpdatePaymentMethodInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

type PaymentMethodsTabProps = {
  readonly paymentMethods: PaymentMethodOverviewItem[];
  readonly onDeletePaymentMethod: (
    paymentMethod: PaymentMethodOverviewItem,
  ) => void;
  readonly onEditPaymentMethod: (paymentMethod: EditablePaymentMethod) => void;
  readonly onViewPaymentMethod: (
    paymentMethod: PaymentMethodOverviewItem,
  ) => void;
};

export type EditablePaymentMethod = {
  closingDay: string;
  creditLimit: number;
  dueDay: string;
  id: string;
  name: string;
  originalName: string;
  type: UpdatePaymentMethodInput["type"];
};

const paymentTypeIcons = {
  bank: Building2,
  boleto: Wallet,
  cash: Wallet,
  credit: CreditCard,
  debit: CreditCard,
  pix: Wallet,
  other: Wallet,
} as const;

function buildEditablePaymentMethod(
  paymentMethod: PaymentMethodOverviewItem,
): EditablePaymentMethod {
  return {
    closingDay: paymentMethod.closingDay
      ? String(paymentMethod.closingDay)
      : "",
    creditLimit: paymentMethod.creditLimit,
    dueDay: paymentMethod.dueDay ? String(paymentMethod.dueDay) : "",
    id: paymentMethod.id,
    name:
      paymentMethod.isDefault || paymentMethod.label !== paymentMethod.name
        ? ""
        : paymentMethod.name,
    originalName: paymentMethod.name,
    type:
      paymentMethod.type === "boleto" ||
      paymentMethod.type === "credit" ||
      paymentMethod.type === "debit" ||
      paymentMethod.type === "other"
        ? paymentMethod.type
        : "credit",
  };
}

type SummaryCardsProps = {
  readonly totalCreditLimit: number;
  readonly totalSpentByPaymentMethod: number;
};

function SummaryCards({
  totalCreditLimit,
  totalSpentByPaymentMethod,
}: SummaryCardsProps) {
  const { formatCurrency, t } = useI18n();

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {[
        [
          t("payments.totalSpent"),
          formatCurrency(totalSpentByPaymentMethod),
          t("payments.totalSpentDescription"),
        ],
        [
          t("payments.totalLimit"),
          formatCurrency(totalCreditLimit),
          t("payments.totalLimitDescription"),
        ],
        [
          t("payments.availableLimit"),
          formatCurrency(
            Math.max(totalCreditLimit - totalSpentByPaymentMethod, 0),
          ),
          t("payments.availableLimitDescription"),
        ],
      ].map(([label, value, note]) => (
        <Card key={label} className="border-border bg-card card-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type PaymentMethodRowProps = {
  readonly onDeletePaymentMethod: (
    paymentMethod: PaymentMethodOverviewItem,
  ) => void;
  readonly onEditPaymentMethod: (paymentMethod: EditablePaymentMethod) => void;
  readonly onViewPaymentMethod: (
    paymentMethod: PaymentMethodOverviewItem,
  ) => void;
  readonly paymentMethod: PaymentMethodOverviewItem;
};

type PaymentMethodInfoProps = {
  readonly label: string;
  readonly paymentMethod: PaymentMethodOverviewItem;
};

function PaymentMethodDesktopSummary({
  paymentMethod,
}: {
  readonly paymentMethod: PaymentMethodOverviewItem;
}) {
  const { formatCurrency, t } = useI18n();

  return (
    <div className="hidden text-right sm:block">
      <p className="text-sm font-semibold text-foreground">
        {formatCurrency(paymentMethod.spent)}
      </p>
      <p className="text-xs text-muted-foreground">
        {paymentMethod.creditLimit > 0
          ? `${t("payments.limit")}: ${formatCurrency(paymentMethod.creditLimit)}`
          : t("payments.noLimit")}
      </p>
      {paymentMethod.type === "credit" ? (
        <>
          <p className="text-xs text-muted-foreground">
            {paymentMethod.closingDay
              ? `${t("payments.closingDay")}: ${paymentMethod.closingDay}`
              : t("payments.noClosingDay")}
          </p>
          <p className="text-xs text-muted-foreground">
            {paymentMethod.dueDay
              ? `${t("payments.dueDay")}: ${paymentMethod.dueDay}`
              : t("payments.noDueDay")}
          </p>
        </>
      ) : null}
    </div>
  );
}

function PaymentMethodInfo({ label, paymentMethod }: PaymentMethodInfoProps) {
  const { formatCurrency, t } = useI18n();
  const Icon = paymentTypeIcons[paymentMethod.type] ?? Wallet;

  return (
    <>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{label}</p>
          {!paymentMethod.canModify ? (
            <Badge variant="secondary" className="text-xs">
              {t("payments.protectedMethod")}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`payments.type.${paymentMethod.type}`)}
        </p>
      </div>
      <PaymentMethodDesktopSummary paymentMethod={paymentMethod} />
      <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums sm:hidden">
        {formatCurrency(paymentMethod.spent)}
      </p>
    </>
  );
}

type PaymentMethodActionsProps = {
  readonly onDeletePaymentMethod: (
    paymentMethod: PaymentMethodOverviewItem,
  ) => void;
  readonly onEditPaymentMethod: (paymentMethod: EditablePaymentMethod) => void;
  readonly paymentMethod: PaymentMethodOverviewItem;
};

function PaymentMethodActions({
  onDeletePaymentMethod,
  onEditPaymentMethod,
  paymentMethod,
}: PaymentMethodActionsProps) {
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={!paymentMethod.canModify}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            onEditPaymentMethod(buildEditablePaymentMethod(paymentMethod))
          }
        >
          <Pencil className="mr-2 size-4" />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => onDeletePaymentMethod(paymentMethod)}
        >
          <Trash2 className="mr-2 size-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PaymentMethodRow({
  onDeletePaymentMethod,
  onEditPaymentMethod,
  onViewPaymentMethod,
  paymentMethod,
}: PaymentMethodRowProps) {
  const { t } = useI18n();
  const label = t(paymentMethod.label);

  return (
    <div className="flex items-center gap-2 p-2 transition-colors hover:bg-accent/50 sm:gap-4 sm:p-4">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-4 rounded-md p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onViewPaymentMethod(paymentMethod)}
        aria-label={`${t("payments.details.title")}: ${label}`}
      >
        <PaymentMethodInfo label={label} paymentMethod={paymentMethod} />
      </button>
      <PaymentMethodActions
        onDeletePaymentMethod={onDeletePaymentMethod}
        onEditPaymentMethod={onEditPaymentMethod}
        paymentMethod={paymentMethod}
      />
    </div>
  );
}

export function PaymentMethodsTab({
  onDeletePaymentMethod,
  onEditPaymentMethod,
  onViewPaymentMethod,
  paymentMethods,
}: PaymentMethodsTabProps) {
  const { t } = useI18n();
  const totalSpentByPaymentMethod = paymentMethods.reduce(
    (sum, paymentMethod) => sum + paymentMethod.spent,
    0,
  );
  const totalCreditLimit = paymentMethods.reduce(
    (sum, paymentMethod) => sum + paymentMethod.creditLimit,
    0,
  );

  return (
    <>
      <SummaryCards
        totalCreditLimit={totalCreditLimit}
        totalSpentByPaymentMethod={totalSpentByPaymentMethod}
      />

      <Card className="mb-6 border-border bg-card card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">
            {t("payments.methodsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {paymentMethods.map((paymentMethod) => (
              <PaymentMethodRow
                key={paymentMethod.id}
                onDeletePaymentMethod={onDeletePaymentMethod}
                onEditPaymentMethod={onEditPaymentMethod}
                onViewPaymentMethod={onViewPaymentMethod}
                paymentMethod={paymentMethod}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
