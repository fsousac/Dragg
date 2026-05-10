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
  paymentMethods: PaymentMethodOverviewItem[];
  onDeletePaymentMethod: (paymentMethod: PaymentMethodOverviewItem) => void;
  onEditPaymentMethod: (paymentMethod: EditablePaymentMethod) => void;
};

export type EditablePaymentMethod = {
  closingDay: string;
  creditLimit: string;
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

export function PaymentMethodsTab({
  onDeletePaymentMethod,
  onEditPaymentMethod,
  paymentMethods,
}: PaymentMethodsTabProps) {
  const { formatCurrency, t } = useI18n();
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

      <Card className="mb-6 border-border bg-card card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">
            {t("payments.methodsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {paymentMethods.map((paymentMethod) => {
              const Icon = paymentTypeIcons[paymentMethod.type] ?? Wallet;
              const label = t(paymentMethod.label);

              return (
                <div
                  key={paymentMethod.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-foreground">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{label}</p>
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
                          onEditPaymentMethod({
                            closingDay: paymentMethod.closingDay
                              ? String(paymentMethod.closingDay)
                              : "",
                            creditLimit: paymentMethod.creditLimit
                              ? String(paymentMethod.creditLimit).replace(
                                  ".",
                                  ",",
                                )
                              : "",
                            dueDay: paymentMethod.dueDay
                              ? String(paymentMethod.dueDay)
                              : "",
                            id: paymentMethod.id,
                            name:
                              paymentMethod.isDefault ||
                              paymentMethod.label !== paymentMethod.name
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
                          })
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
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
