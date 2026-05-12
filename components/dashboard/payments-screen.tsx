"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  PaymentMethodsTab,
  type EditablePaymentMethod,
} from "@/components/dashboard/payment-methods-tab";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubscriptionsTab } from "@/components/dashboard/subscriptions-tab";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type CreatePaymentMethodInput,
  type CreateSubscriptionInput,
  type PaymentInvoiceItem,
  type PaymentsDueData,
  type PaymentMethodOverviewItem,
  type SubscriptionOverviewItem,
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
  type UpdatePaymentMethodInput,
  type UpdateSubscriptionInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

type PaymentsScreenProps = {
  categories: TransactionFormCategory[];
  createPaymentMethodAction: (data: CreatePaymentMethodInput) => Promise<void>;
  createSubscriptionAction: (data: CreateSubscriptionInput) => Promise<void>;
  deletePaymentMethodAction: (paymentMethodId: string) => Promise<void>;
  deleteSubscriptionAction: (subscriptionId: string) => Promise<void>;
  pauseSubscriptionAction: (subscriptionId: string) => Promise<void>;
  paymentMethods: PaymentMethodOverviewItem[];
  paymentsDueData: PaymentsDueData;
  resumeSubscriptionAction: (subscriptionId: string) => Promise<void>;
  subscriptions: SubscriptionOverviewItem[];
  transactionPaymentMethods: TransactionFormPaymentMethod[];
  updatePaymentMethodAction: (data: UpdatePaymentMethodInput) => Promise<void>;
  updateSubscriptionAction: (data: UpdateSubscriptionInput) => Promise<void>;
};

type EditableSubscription = {
  amount: string;
  category: string;
  description: string;
  id: string;
  nextDate: string;
  paymentMethod: string;
};

const editablePaymentTypeOptions: UpdatePaymentMethodInput["type"][] = [
  "bank",
  "boleto",
  "credit",
  "debit",
  "other",
];

function sanitizeCurrencyInput(value: string) {
  const normalizedSeparator = value.replace(/\./g, ",");
  const sanitizedValue = normalizedSeparator.replace(/[^\d,]/g, "");
  const [integerPart, ...decimalParts] = sanitizedValue.split(",");

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart},${decimalParts.join("")}`;
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function formatCurrencyInput(value: string) {
  if (!value) return "";

  return parseCurrencyInput(value).toFixed(2).replace(".", ",");
}

export function PaymentsScreen({
  categories,
  createPaymentMethodAction,
  createSubscriptionAction,
  deletePaymentMethodAction,
  deleteSubscriptionAction,
  pauseSubscriptionAction,
  paymentMethods,
  paymentsDueData,
  resumeSubscriptionAction,
  subscriptions,
  transactionPaymentMethods,
  updatePaymentMethodAction,
  updateSubscriptionAction,
}: PaymentsScreenProps) {
  const router = useRouter();
  const { formatCurrency, formatDate, t } = useI18n();
  const {
    bills,
    invoices,
    subscriptions: dueSubscriptions,
    summary,
  } = paymentsDueData;
  const [activeTab, setActiveTab] = useState("payments");
  const [isPending, startTransition] = useTransition();
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] =
    useState(false);
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    closingDay: "",
    creditLimit: "",
    dueDay: "",
    name: "",
    type: "credit" as CreatePaymentMethodInput["type"],
  });
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] =
    useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({
    amount: "",
    category: categories[0]?.id ?? "none",
    description: "",
    nextDate: new Date().toISOString().slice(0, 10),
    paymentMethod: transactionPaymentMethods[0]?.id ?? "none",
  });
  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<EditablePaymentMethod | null>(null);
  const [deletingPaymentMethod, setDeletingPaymentMethod] =
    useState<PaymentMethodOverviewItem | null>(null);
  const [editingSubscription, setEditingSubscription] =
    useState<EditableSubscription | null>(null);
  const [deletingSubscription, setDeletingSubscription] =
    useState<SubscriptionOverviewItem | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<PaymentInvoiceItem | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const dueThreshold = (() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 3);
    return threshold.toISOString().slice(0, 10);
  })();

  const getDueStatusLabel = (status: "planned" | "next") => {
    if (status === "next") return t("common.next");
    return t("common.planned");
  };

  const formatInvoicePurchaseCount = (count: number) =>
    t("payments.invoicePurchaseCount").replace("{count}", String(count));

  const getDueStatusStyle = (status: "planned" | "next") => {
    if (status === "next") return "bg-yellow text-black";
    return "bg-muted text-muted-foreground";
  };

  const shouldShowDueBadge = (dateValue: string) => dateValue > today;

  const getSubscriptionStatus = (subscription: SubscriptionOverviewItem) => {
    if (subscription.status === "paused") return "paused" as const;
    if (
      subscription.nextDate > today &&
      subscription.nextDate <= dueThreshold
    ) {
      return "next" as const;
    }
    return "planned" as const;
  };

  const handleUpdatePaymentMethod = () => {
    if (!editingPaymentMethod) return;

    const submittedName =
      editingPaymentMethod.name.trim() || editingPaymentMethod.originalName;

    if (!submittedName.trim()) {
      toast.error(t("payments.methodNameRequired"));
      return;
    }

    startTransition(async () => {
      try {
        await updatePaymentMethodAction({
          closingDay:
            editingPaymentMethod.type === "credit" &&
            editingPaymentMethod.closingDay
              ? Number(editingPaymentMethod.closingDay)
              : null,
          creditLimit: parseCurrencyInput(editingPaymentMethod.creditLimit),
          dueDay:
            editingPaymentMethod.type === "credit" &&
            editingPaymentMethod.dueDay
              ? Number(editingPaymentMethod.dueDay)
              : null,
          id: editingPaymentMethod.id,
          name: submittedName,
          type: editingPaymentMethod.type,
        });
        toast.success(t("payments.methodUpdateSuccess"));
        setEditingPaymentMethod(null);
        router.refresh();
      } catch (error) {
        console.error("Error updating payment method:", error);
        toast.error(t("payments.methodUpdateError"));
      }
    });
  };

  const resetPaymentMethodForm = () => {
    setPaymentMethodForm({
      closingDay: "",
      creditLimit: "",
      dueDay: "",
      name: "",
      type: "credit",
    });
  };

  const handleCreatePaymentMethod = () => {
    if (!paymentMethodForm.name.trim()) {
      toast.error(t("payments.methodNameRequired"));
      return;
    }

    startTransition(async () => {
      try {
        await createPaymentMethodAction({
          closingDay:
            paymentMethodForm.type === "credit" && paymentMethodForm.closingDay
              ? Number(paymentMethodForm.closingDay)
              : null,
          creditLimit: parseCurrencyInput(paymentMethodForm.creditLimit),
          dueDay:
            paymentMethodForm.type === "credit" && paymentMethodForm.dueDay
              ? Number(paymentMethodForm.dueDay)
              : null,
          name: paymentMethodForm.name,
          type: paymentMethodForm.type,
        });
        toast.success(t("payments.methodCreateSuccess"));
        resetPaymentMethodForm();
        setIsPaymentMethodDialogOpen(false);
        router.refresh();
      } catch (error) {
        console.error("Error creating payment method:", error);
        toast.error(t("payments.methodCreateError"));
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

  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      amount: "",
      category: categories[0]?.id ?? "none",
      description: "",
      nextDate: new Date().toISOString().slice(0, 10),
      paymentMethod: transactionPaymentMethods[0]?.id ?? "none",
    });
  };

  const handleCreateSubscription = () => {
    if (!subscriptionForm.description.trim()) {
      toast.error(t("payments.subscriptionNameRequired"));
      return;
    }

    startTransition(async () => {
      try {
        await createSubscriptionAction({
          amount: parseCurrencyInput(subscriptionForm.amount),
          category: subscriptionForm.category,
          description: subscriptionForm.description,
          nextDate: subscriptionForm.nextDate,
          paymentMethod: subscriptionForm.paymentMethod,
        });
        toast.success(t("payments.subscriptionCreateSuccess"));
        resetSubscriptionForm();
        setIsSubscriptionDialogOpen(false);
        router.refresh();
      } catch (error) {
        console.error("Error creating subscription:", error);
        toast.error(t("payments.subscriptionCreateError"));
      }
    });
  };

  const openSubscriptionDialog = (subscription?: SubscriptionOverviewItem) => {
    if (subscription) {
      setEditingSubscription({
        amount: String(subscription.amount).replace(".", ","),
        category: subscription.categoryId ?? "none",
        description: subscription.name,
        id: subscription.id,
        nextDate: subscription.nextDate,
        paymentMethod: subscription.paymentMethodId ?? "none",
      });
      setSubscriptionForm({
        amount: String(subscription.amount).replace(".", ","),
        category: subscription.categoryId ?? "none",
        description: subscription.name,
        nextDate: subscription.nextDate,
        paymentMethod: subscription.paymentMethodId ?? "none",
      });
      setIsSubscriptionDialogOpen(true);
      return;
    }

    setEditingSubscription(null);
    resetSubscriptionForm();
    setIsSubscriptionDialogOpen(true);
  };

  const handleUpdateSubscription = () => {
    if (!editingSubscription) return;

    if (!subscriptionForm.description.trim()) {
      toast.error(t("payments.subscriptionNameRequired"));
      return;
    }

    startTransition(async () => {
      try {
        await updateSubscriptionAction({
          amount: parseCurrencyInput(subscriptionForm.amount),
          category: subscriptionForm.category,
          description: subscriptionForm.description,
          id: editingSubscription.id,
          nextDate: subscriptionForm.nextDate,
          paymentMethod: subscriptionForm.paymentMethod,
        });
        toast.success(t("payments.subscriptionUpdateSuccess"));
        setEditingSubscription(null);
        resetSubscriptionForm();
        setIsSubscriptionDialogOpen(false);
        router.refresh();
      } catch (error) {
        console.error("Error updating subscription:", error);
        toast.error(t("payments.subscriptionUpdateError"));
      }
    });
  };

  const handleToggleSubscriptionStatus = (
    subscription: SubscriptionOverviewItem,
  ) => {
    startTransition(async () => {
      try {
        if (subscription.status === "paused") {
          await resumeSubscriptionAction(subscription.id);
          toast.success(t("payments.subscriptionResumeSuccess"));
        } else {
          await pauseSubscriptionAction(subscription.id);
          toast.success(t("payments.subscriptionPauseSuccess"));
        }
        router.refresh();
      } catch (error) {
        console.error("Error updating subscription status:", error);
        toast.error(t("payments.subscriptionStatusError"));
      }
    });
  };

  const handleDeleteSubscription = () => {
    if (!deletingSubscription) return;

    startTransition(async () => {
      try {
        await deleteSubscriptionAction(deletingSubscription.id);
        toast.success(t("payments.subscriptionDeleteSuccess"));
        setDeletingSubscription(null);
        router.refresh();
      } catch (error) {
        console.error("Error deleting subscription:", error);
        toast.error(t("payments.subscriptionDeleteError"));
      }
    });
  };

  return (
    <>
      <PageHeader
        title={t("screen.payments.title")}
        description={t("screen.payments.description")}
        actions={
          <Button
            className="gap-2"
            onClick={() => {
              if (activeTab === "subscriptions") {
                openSubscriptionDialog();
              } else {
                setIsPaymentMethodDialogOpen(true);
              }
            }}
          >
            <Plus className="size-4" />
            {activeTab === "subscriptions"
              ? t("screen.payments.addSubscription")
              : t("payments.addMethod")}
          </Button>
        }
      />

      <section className="mb-8 grid gap-4">
        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("payments.monthlyDueTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("payments.monthlyDueDescription")}
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {[
              [t("payments.totalDue"), summary.totalDue],
              [t("payments.totalInvoices"), summary.totalInvoices],
              [t("payments.totalSubscriptions"), summary.totalSubscriptions],
              [t("payments.totalBills"), summary.totalBills],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-border/70 bg-muted/20 p-4"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatCurrency(Number(value))}
                </p>
              </div>
            ))}
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                {t("payments.nextDue")}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {summary.nextDueDate
                  ? formatDate(summary.nextDueDate, {
                      day: "numeric",
                      month: "short",
                    })
                  : t("payments.noDueDate")}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-border bg-card card-shadow">
            <CardHeader>
              <CardTitle className="text-base">
                {t("payments.invoicesTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length ? (
                <div className="divide-y divide-border">
                  {invoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {t("transaction.creditCardInvoiceFor")}{" "}
                          {t(invoice.paymentMethodKey)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("transaction.invoiceDueDate")}:{" "}
                          {formatDate(invoice.dueDate, {
                            day: "numeric",
                            month: "short",
                          })}
                          {" · "}
                          {formatInvoicePurchaseCount(invoice.purchaseCount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {shouldShowDueBadge(invoice.dueDate) ? (
                          <Badge
                            variant="secondary"
                            className={getDueStatusStyle(invoice.status)}
                          >
                            {getDueStatusLabel(invoice.status)}
                          </Badge>
                        ) : null}
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {formatCurrency(invoice.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  {t("payments.noInvoices")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card card-shadow">
            <CardHeader>
              <CardTitle className="text-base">
                {t("payments.subscriptionsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dueSubscriptions.length ? (
                <div className="divide-y divide-border">
                  {dueSubscriptions.map((subscription) => {
                    const status = getSubscriptionStatus(subscription);
                    return (
                      <div
                        key={subscription.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {subscription.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t(subscription.categoryKey)}
                            {" · "}
                            {t(`data.frequency.${subscription.frequency}`)}
                            {" · "}
                            {formatDate(subscription.nextDate, {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {status === "paused" ||
                          shouldShowDueBadge(subscription.nextDate) ? (
                            <Badge
                              variant="secondary"
                              className={
                                status === "paused"
                                  ? "bg-yellow text-black"
                                  : getDueStatusStyle(status)
                              }
                            >
                              {status === "paused"
                                ? t("common.paused")
                                : getDueStatusLabel(status)}
                            </Badge>
                          ) : null}
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {formatCurrency(subscription.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  {t("payments.noSubscriptions")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card card-shadow">
          <CardHeader>
            <CardTitle className="text-base">
              {t("payments.billsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bills.length ? (
              <div className="divide-y divide-border">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t(bill.descriptionKey)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(bill.categoryKey)}
                        {bill.paymentMethodKey
                          ? ` · ${t(bill.paymentMethodKey)}`
                          : ""}
                        {" · "}
                        {formatDate(bill.date, {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {shouldShowDueBadge(bill.date) ? (
                        <Badge
                          variant="secondary"
                          className={getDueStatusStyle(bill.status)}
                        >
                          {getDueStatusLabel(bill.status)}
                        </Badge>
                      ) : null}
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                {t("payments.noBills")}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="payments">
            {t("payments.methodsTitle")}
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            {t("screen.payments.activeSubscriptions")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "payments" ? (
        <PaymentMethodsTab
          onDeletePaymentMethod={setDeletingPaymentMethod}
          onEditPaymentMethod={setEditingPaymentMethod}
          paymentMethods={paymentMethods}
        />
      ) : (
        <SubscriptionsTab
          isPending={isPending}
          onDeleteSubscription={setDeletingSubscription}
          onEditSubscription={openSubscriptionDialog}
          onToggleSubscriptionStatus={handleToggleSubscriptionStatus}
          subscriptions={subscriptions}
        />
      )}

      <Dialog
        open={Boolean(selectedInvoice)}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoice(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice
                ? `${t("transaction.creditCardInvoiceFor")} ${t(selectedInvoice.paymentMethodKey)}`
                : t("transaction.creditCardInvoice")}
            </DialogTitle>
            <DialogDescription>
              {t("transaction.invoiceDetailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice ? (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("transaction.paymentMethod")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {t(selectedInvoice.paymentMethodKey)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("transaction.invoiceCycle")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(selectedInvoice.invoice.startsAt, {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    -{" "}
                    {formatDate(selectedInvoice.invoice.closingDate, {
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
                    {formatDate(selectedInvoice.invoice.dueDate, {
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
                    {formatCurrency(selectedInvoice.amount)}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {selectedInvoice.invoice.purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
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
                      <p className="text-sm font-semibold tabular-nums sm:text-right">
                        {formatCurrency(purchase.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPaymentMethodDialogOpen}
        onOpenChange={setIsPaymentMethodDialogOpen}
      >
        <DialogContent className="overflow-y-auto sm:h-[60vh] sm:w-[50vw] sm:max-w-none">
          <DialogHeader>
            <DialogTitle>{t("payments.addMethod")}</DialogTitle>
            <DialogDescription>
              {t("payments.addMethodDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-payment-method-name">
                {t("payments.methodName")}
              </Label>
              <Input
                id="new-payment-method-name"
                value={paymentMethodForm.name}
                onChange={(event) =>
                  setPaymentMethodForm({
                    ...paymentMethodForm,
                    name: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("payments.methodType")}</Label>
                <Select
                  value={paymentMethodForm.type}
                  onValueChange={(value) =>
                    setPaymentMethodForm({
                      ...paymentMethodForm,
                      closingDay:
                        value === "credit" ? paymentMethodForm.closingDay : "",
                      dueDay:
                        value === "credit" ? paymentMethodForm.dueDay : "",
                      type: value as CreatePaymentMethodInput["type"],
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
              <div className="space-y-2">
                <Label htmlFor="new-payment-method-limit">
                  {t("payments.methodLimit")}
                </Label>
                <Input
                  id="new-payment-method-limit"
                  inputMode="decimal"
                  pattern="[0-9]*[,.]?[0-9]*"
                  value={paymentMethodForm.creditLimit}
                  onBlur={() =>
                    setPaymentMethodForm((currentValue) => ({
                      ...currentValue,
                      creditLimit: formatCurrencyInput(
                        currentValue.creditLimit,
                      ),
                    }))
                  }
                  onChange={(event) =>
                    setPaymentMethodForm({
                      ...paymentMethodForm,
                      creditLimit: sanitizeCurrencyInput(event.target.value),
                    })
                  }
                  placeholder="0,00"
                />
              </div>
              {paymentMethodForm.type === "credit" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-payment-method-closing-day">
                      {t("payments.closingDay")}
                    </Label>
                    <Input
                      id="new-payment-method-closing-day"
                      inputMode="numeric"
                      min="1"
                      max="31"
                      type="number"
                      value={paymentMethodForm.closingDay}
                      onChange={(event) =>
                        setPaymentMethodForm({
                          ...paymentMethodForm,
                          closingDay: event.target.value,
                        })
                      }
                      placeholder="7"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-payment-method-due-day">
                      {t("payments.dueDay")}
                    </Label>
                    <Input
                      id="new-payment-method-due-day"
                      inputMode="numeric"
                      min="1"
                      max="31"
                      type="number"
                      value={paymentMethodForm.dueDay}
                      onChange={(event) =>
                        setPaymentMethodForm({
                          ...paymentMethodForm,
                          dueDay: event.target.value,
                        })
                      }
                      placeholder="14"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentMethodDialogOpen(false)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreatePaymentMethod} disabled={isPending}>
              {isPending ? t("payments.methodSaving") : t("payments.addMethod")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSubscriptionDialogOpen}
        onOpenChange={(open) => {
          setIsSubscriptionDialogOpen(open);
          if (!open) {
            setEditingSubscription(null);
            resetSubscriptionForm();
          }
        }}
      >
        <DialogContent className="overflow-y-auto sm:h-[60vh] sm:w-[50vw] sm:max-w-none">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription
                ? t("payments.editSubscription")
                : t("screen.payments.addSubscription")}
            </DialogTitle>
            <DialogDescription>
              {editingSubscription
                ? t("payments.editSubscriptionDescription")
                : t("payments.subscriptionCreateDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscription-name">
                {t("payments.subscriptionName")}
              </Label>
              <Input
                id="subscription-name"
                value={subscriptionForm.description}
                onChange={(event) =>
                  setSubscriptionForm({
                    ...subscriptionForm,
                    description: event.target.value,
                  })
                }
                placeholder={t("payments.subscriptionNamePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subscription-amount">
                  {t("common.amount")}
                </Label>
                <Input
                  id="subscription-amount"
                  inputMode="decimal"
                  pattern="[0-9]*[,.]?[0-9]*"
                  value={subscriptionForm.amount}
                  onBlur={() =>
                    setSubscriptionForm((currentValue) => ({
                      ...currentValue,
                      amount: formatCurrencyInput(currentValue.amount),
                    }))
                  }
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      amount: sanitizeCurrencyInput(event.target.value),
                    })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription-next-date">
                  {t("common.next")}
                </Label>
                <Input
                  id="subscription-next-date"
                  type="date"
                  value={subscriptionForm.nextDate}
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      nextDate: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("common.category")}</Label>
                <Select
                  value={subscriptionForm.category}
                  onValueChange={(value) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      category: value,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {t(category.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("transaction.paymentMethod")}</Label>
                <Select
                  value={subscriptionForm.paymentMethod}
                  onValueChange={(value) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      paymentMethod: value,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionPaymentMethods.map((paymentMethod) => (
                      <SelectItem
                        key={paymentMethod.id}
                        value={paymentMethod.id}
                      >
                        {t(paymentMethod.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubscriptionDialogOpen(false);
                setEditingSubscription(null);
                resetSubscriptionForm();
              }}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={
                editingSubscription
                  ? handleUpdateSubscription
                  : handleCreateSubscription
              }
              disabled={isPending}
            >
              {isPending
                ? t("payments.subscriptionCreating")
                : editingSubscription
                  ? t("transaction.saveChanges")
                  : t("screen.payments.addSubscription")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("payments.methodType")}</Label>
                  <Select
                    value={editingPaymentMethod.type}
                    onValueChange={(value) =>
                      setEditingPaymentMethod({
                        ...editingPaymentMethod,
                        closingDay:
                          value === "credit"
                            ? editingPaymentMethod.closingDay
                            : "",
                        dueDay:
                          value === "credit" ? editingPaymentMethod.dueDay : "",
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
                <div className="space-y-2">
                  <Label htmlFor="payment-method-limit">
                    {t("payments.methodLimit")}
                  </Label>
                  <Input
                    id="payment-method-limit"
                    inputMode="decimal"
                    pattern="[0-9]*[,.]?[0-9]*"
                    value={editingPaymentMethod.creditLimit}
                    onBlur={() =>
                      setEditingPaymentMethod((currentValue) =>
                        currentValue
                          ? {
                              ...currentValue,
                              creditLimit: formatCurrencyInput(
                                currentValue.creditLimit,
                              ),
                            }
                          : currentValue,
                      )
                    }
                    onChange={(event) =>
                      setEditingPaymentMethod({
                        ...editingPaymentMethod,
                        creditLimit: sanitizeCurrencyInput(event.target.value),
                      })
                    }
                    placeholder="0,00"
                  />
                </div>
                {editingPaymentMethod.type === "credit" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="payment-method-closing-day">
                        {t("payments.closingDay")}
                      </Label>
                      <Input
                        id="payment-method-closing-day"
                        inputMode="numeric"
                        min="1"
                        max="31"
                        type="number"
                        value={editingPaymentMethod.closingDay}
                        onChange={(event) =>
                          setEditingPaymentMethod({
                            ...editingPaymentMethod,
                            closingDay: event.target.value,
                          })
                        }
                        placeholder="7"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-method-due-day">
                        {t("payments.dueDay")}
                      </Label>
                      <Input
                        id="payment-method-due-day"
                        inputMode="numeric"
                        min="1"
                        max="31"
                        type="number"
                        value={editingPaymentMethod.dueDay}
                        onChange={(event) =>
                          setEditingPaymentMethod({
                            ...editingPaymentMethod,
                            dueDay: event.target.value,
                          })
                        }
                        placeholder="14"
                      />
                    </div>
                  </>
                ) : null}
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

      <AlertDialog
        open={Boolean(deletingSubscription)}
        onOpenChange={(open) => {
          if (!open) setDeletingSubscription(null);
        }}
      >
        <AlertDialogContent className="sm:h-[50vh] sm:w-[50vw] sm:max-w-none">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("payments.deleteSubscription")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("payments.deleteSubscriptionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={handleDeleteSubscription}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
