"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  Calendar,
  CreditCard,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
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
import { payments } from "@/lib/data";
import {
  type PaymentMethodOverviewItem,
  type UpdatePaymentMethodInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PaymentsScreenProps = {
  deletePaymentMethodAction: (paymentMethodId: string) => Promise<void>;
  paymentMethods: PaymentMethodOverviewItem[];
  updatePaymentMethodAction: (data: UpdatePaymentMethodInput) => Promise<void>;
};

type EditablePaymentMethod = {
  id: string;
  name: string;
  type: UpdatePaymentMethodInput["type"];
};

const paymentTypeIcons = {
  bank: Building2,
  cash: Wallet,
  credit: CreditCard,
  debit: CreditCard,
  pix: Wallet,
  other: Wallet,
} as const;

const editablePaymentTypeOptions: UpdatePaymentMethodInput["type"][] = [
  "credit",
  "debit",
  "other",
];

export function PaymentsScreen({
  deletePaymentMethodAction,
  paymentMethods,
  updatePaymentMethodAction,
}: PaymentsScreenProps) {
  const { formatCurrency, formatDate, t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<EditablePaymentMethod | null>(null);
  const [deletingPaymentMethod, setDeletingPaymentMethod] =
    useState<PaymentMethodOverviewItem | null>(null);

  const activePayments = payments.filter(
    (payment) => payment.status === "active",
  );
  const pausedPayments = payments.filter(
    (payment) => payment.status === "paused",
  );
  const monthlyTotal = activePayments
    .filter((payment) => payment.frequency === "monthly")
    .reduce((acc, payment) => acc + payment.amount, 0);
  const yearlyTotal = activePayments
    .filter((payment) => payment.frequency === "yearly")
    .reduce((acc, payment) => acc + payment.amount, 0);

  const statusColor = {
    active: "bg-income text-white",
    cancelled: "bg-destructive text-white",
    paused: "bg-yellow text-black",
  };

  const handleUpdatePaymentMethod = () => {
    if (!editingPaymentMethod?.name.trim()) {
      toast.error(t("payments.methodNameRequired"));
      return;
    }

    startTransition(async () => {
      try {
        await updatePaymentMethodAction(editingPaymentMethod);
        toast.success(t("payments.methodUpdateSuccess"));
        setEditingPaymentMethod(null);
      } catch (error) {
        console.error("Error updating payment method:", error);
        toast.error(t("payments.methodUpdateError"));
      }
    });
  };

  const handleDeletePaymentMethod = () => {
    if (!deletingPaymentMethod) return;

    startTransition(async () => {
      try {
        await deletePaymentMethodAction(deletingPaymentMethod.id);
        toast.success(t("payments.methodDeleteSuccess"));
        setDeletingPaymentMethod(null);
      } catch (error) {
        console.error("Error deleting payment method:", error);
        toast.error(t("payments.methodDeleteError"));
      }
    });
  };

  return (
    <>
      <PageHeader
        title={t("screen.payments.title")}
        description={t("screen.payments.description")}
        actions={
          <Button className="gap-2">
            <Plus className="size-4" />
            {t("screen.payments.addSubscription")}
          </Button>
        }
      />

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
                          setEditingPaymentMethod({
                            id: paymentMethod.id,
                            name: paymentMethod.name,
                            type:
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
                        onClick={() => setDeletingPaymentMethod(paymentMethod)}
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          [
            t("screen.payments.monthlySubscriptions"),
            formatCurrency(monthlyTotal),
            `${activePayments.filter((payment) => payment.frequency === "monthly").length} ${t("common.active")}`,
          ],
          [
            t("screen.payments.yearlySubscriptions"),
            formatCurrency(yearlyTotal),
            `${formatCurrency(yearlyTotal / 12)}/${t("screen.payments.monthlyAverage")}`,
          ],
          [
            t("screen.payments.annualCost"),
            formatCurrency(monthlyTotal * 12 + yearlyTotal),
            t("screen.payments.combined"),
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
            {t("screen.payments.activeSubscriptions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {activePayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-2xl">
                  {payment.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {payment.name}
                    </p>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", statusColor[payment.status])}
                    >
                      {t(`common.${payment.status}`)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{t(payment.categoryKey)}</span>
                    <span>·</span>
                    <span>{t(`data.frequency.${payment.frequency}`)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    {t("common.next")}:{" "}
                    {formatDate(payment.nextDate, {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pause className="mr-2 size-4" />
                      {t("common.pause")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 size-4" />
                      {t("common.cancel")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pausedPayments.length > 0 && (
        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("screen.payments.pausedSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {pausedPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center gap-4 p-4 opacity-70 transition-opacity hover:opacity-100"
                >
                  <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-2xl">
                    {payment.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {payment.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(payment.categoryKey)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`data.frequency.${payment.frequency}`)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Play className="size-3" />
                    {t("common.resume")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(editingPaymentMethod)}
        onOpenChange={(open) => {
          if (!open) setEditingPaymentMethod(null);
        }}
      >
        <DialogContent className="overflow-y-auto sm:h-[50vh] sm:w-[50vw] sm:max-w-none">
          <DialogHeader>
            <DialogTitle>{t("payments.editMethod")}</DialogTitle>
            <DialogDescription>
              {t("payments.editMethodDescription")}
            </DialogDescription>
          </DialogHeader>
          {editingPaymentMethod ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method-name">
                  {t("payments.methodName")}
                </Label>
                <Input
                  id="payment-method-name"
                  value={editingPaymentMethod.name}
                  onChange={(event) =>
                    setEditingPaymentMethod({
                      ...editingPaymentMethod,
                      name: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("payments.methodType")}</Label>
                <Select
                  value={editingPaymentMethod.type}
                  onValueChange={(value) =>
                    setEditingPaymentMethod({
                      ...editingPaymentMethod,
                      type: value as UpdatePaymentMethodInput["type"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editablePaymentTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`payments.type.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPaymentMethod(null)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdatePaymentMethod} disabled={isPending}>
              {isPending
                ? t("payments.methodSaving")
                : t("transaction.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingPaymentMethod)}
        onOpenChange={(open) => {
          if (!open) setDeletingPaymentMethod(null);
        }}
      >
        <AlertDialogContent className="sm:h-[50vh] sm:w-[50vw] sm:max-w-none">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("payments.deleteMethod")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("payments.deleteMethodDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={handleDeletePaymentMethod}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
