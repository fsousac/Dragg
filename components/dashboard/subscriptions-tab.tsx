"use client";

import { useMemo } from "react";

import { Calendar, MoreVertical, Pause, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type SubscriptionOverviewItem } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SubscriptionsTabProps = {
  isPending: boolean;
  onDeleteSubscription: (subscription: SubscriptionOverviewItem) => void;
  onEditSubscription: (subscription: SubscriptionOverviewItem) => void;
  onToggleSubscriptionStatus: (subscription: SubscriptionOverviewItem) => void;
  subscriptions: SubscriptionOverviewItem[];
};

const statusColor = {
  active: "bg-income text-white",
  cancelled: "bg-destructive text-white",
  paused: "bg-yellow text-black",
};

export function SubscriptionsTab({
  isPending,
  onDeleteSubscription,
  onEditSubscription,
  onToggleSubscriptionStatus,
  subscriptions,
}: SubscriptionsTabProps) {
  const { formatCurrency, formatDate, t } = useI18n();
  const activeSubscriptions = useMemo(
    () =>
      subscriptions.filter((subscription) => subscription.status === "active"),
    [subscriptions],
  );
  const monthlyTotal = useMemo(
    () =>
      activeSubscriptions
        .filter((subscription) => subscription.frequency === "monthly")
        .reduce((acc, subscription) => acc + subscription.amount, 0),
    [activeSubscriptions],
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          [
            t("screen.payments.monthlySubscriptions"),
            formatCurrency(monthlyTotal),
            `${activeSubscriptions.length} ${t("common.active")}`,
          ],
          [
            t("screen.payments.yearlySubscriptions"),
            formatCurrency(0),
            `${formatCurrency(0)}/${t("screen.payments.monthlyAverage")}`,
          ],
          [
            t("screen.payments.annualCost"),
            formatCurrency(monthlyTotal * 12),
            t("screen.payments.combined"),
          ],
        ].map(([label, value, note]) => (
          <Card key={label} className="border-border bg-card card-shadow">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6 border-border bg-card card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">
            {t("screen.payments.activeSubscriptions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {subscriptions.map((payment) => (
              <div
                key={payment.id}
                className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(5.75rem,7.5rem)_2.25rem] items-start gap-1 p-4 transition-colors hover:bg-accent/50 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(7rem,max-content)_2.25rem] sm:items-center sm:gap-4"
              >
                <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-2xl">
                  {payment.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 max-w-full wrap-break-words text-sm font-medium text-foreground sm:truncate sm:text-base">
                      {payment.name}
                    </p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 text-xs",
                        statusColor[payment.status],
                      )}
                    >
                      {t(`common.${payment.status}`)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                    <span className="min-w-0 max-w-full truncate">
                      {t(payment.categoryKey)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0">
                      {t(`data.frequency.${payment.frequency}`)}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 text-right">
                  <p className="font-semibold text-foreground">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="mt-0.5 flex min-w-0 flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
                    <Calendar className="size-3 shrink-0" />
                    <span>{t("common.next")}:</span>
                    <span className="min-w-0 break-words text-right">
                      {formatDate(payment.nextDate, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 self-start justify-self-end sm:self-center"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEditSubscription(payment)}
                    >
                      <Pencil className="mr-2 size-4" />
                      {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isPending}
                      onClick={() => onToggleSubscriptionStatus(payment)}
                    >
                      <Pause className="mr-2 size-4" />
                      {payment.status === "paused"
                        ? t("common.resume")
                        : t("common.pause")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteSubscription(payment)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
