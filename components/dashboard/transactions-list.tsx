"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { type Transaction, type TransactionGroup } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { withSelectedMonth } from "./month-route";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const groupColors: Record<TransactionGroup, string> = {
  needs: "bg-[#F97316]/10 text-[#F97316]",
  wants: "bg-[#EC4899]/10 text-[#EC4899]",
  savings: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  income: "bg-[#22C55E]/10 text-[#22C55E]",
};

const amountColors = {
  income: "text-[#22C55E]",
  expense: "text-[#FB7185]",
  saving: "text-[#8B5CF6]",
};

type TransactionsListProps = {
  transactions: Transaction[];
};

export function TransactionsList({ transactions }: TransactionsListProps) {
  const { formatCurrency, formatDate, t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card className="h-fit bg-card border-border card-shadow flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
            {t("dashboard.latestTransactions.title")}
          </CardTitle>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">
            {t("dashboard.latestTransactions.description")}
          </p>
        </div>
        <Link
          href={withSelectedMonth("/transactions", searchParams)}
          prefetch
          onMouseEnter={() =>
            router.prefetch(withSelectedMonth("/transactions", searchParams))
          }
          onFocus={() =>
            router.prefetch(withSelectedMonth("/transactions", searchParams))
          }
          className="flex items-center gap-3 rounded-xl transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
          >
            {t("common.viewAll")}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="divide-y divide-border">
          {transactions.map((transaction) => {
            const shouldPresentAsPlanned =
              Boolean(transaction.isPlanned) && transaction.date > today;

            return (
              <div
                key={transaction.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50 lg:gap-4 lg:px-6 lg:py-4",
                  shouldPresentAsPlanned && "opacity-70",
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xl lg:h-12 lg:w-12 lg:text-2xl">
                  {transaction.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {transaction.isCreditCardInvoice
                      ? (() => {
                          const invoiceKey =
                            transaction.invoice?.paymentMethodKey ??
                            transaction.paymentMethodKey;

                          return invoiceKey
                            ? `${t("transaction.creditCardInvoiceFor")} ${t(invoiceKey)}`
                            : t("transaction.creditCardInvoice");
                        })()
                      : t(transaction.descriptionKey)}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize lg:text-xs",
                        groupColors[transaction.group],
                      )}
                    >
                      {t(`data.group.${transaction.group}`)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transaction.date, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums lg:text-base",
                    amountColors[transaction.type],
                  )}
                >
                  {transaction.amount > 0 ? "+" : ""}
                  {formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
