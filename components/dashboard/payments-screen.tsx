"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  CreditCard,
  MoreVertical,
  Pause,
  Pencil,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type CreatePaymentMethodInput,
  type CreateSubscriptionInput,
  type PaymentMethodOverviewItem,
  type SubscriptionOverviewItem,
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
  type UpdatePaymentMethodInput,
  type UpdateSubscriptionInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PaymentsScreenProps = {
  categories: TransactionFormCategory[];
  createPaymentMethodAction: (data: CreatePaymentMethodInput) => Promise<void>;
  createSubscriptionAction: (data: CreateSubscriptionInput) => Promise<void>;
  deletePaymentMethodAction: (paymentMethodId: string) => Promise<void>;
  deleteSubscriptionAction: (subscriptionId: string) => Promise<void>;
  pauseSubscriptionAction: (subscriptionId: string) => Promise<void>;
  paymentMethods: PaymentMethodOverviewItem[];
  resumeSubscriptionAction: (subscriptionId: string) => Promise<void>;
  subscriptions: SubscriptionOverviewItem[];
  transactionPaymentMethods: TransactionFormPaymentMethod[];
  updatePaymentMethodAction: (data: UpdatePaymentMethodInput) => Promise<void>;
  updateSubscriptionAction: (data: UpdateSubscriptionInput) => Promise<void>;
};

type EditablePaymentMethod = {
  closingDay: string;
  creditLimit: string;
  dueDay: string;
  id: string;
  name: string;
  originalName: string;
  type: UpdatePaymentMethodInput["type"];
};

type EditableSubscription = {
  amount: string;
  category: string;
  description: string;
  id: string;
  nextDate: string;
  paymentMethod: string;
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
  resumeSubscriptionAction,
  subscriptions,
  transactionPaymentMethods,
  updatePaymentMethodAction,
  updateSubscriptionAction,
}: PaymentsScreenProps) {
  const router = useRouter();
  const { formatCurrency, formatDate, t } = useI18n();
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

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active",
  );
  const monthlyTotal = activeSubscriptions
    .filter((subscription) => subscription.frequency === "monthly")
    .reduce((acc, subscription) => acc + subscription.amount, 0);

  const statusColor = {
    active: "bg-income text-white",
    cancelled: "bg-destructive text-white",
    paused: "bg-yellow text-black",
  };
  const totalSpentByPaymentMethod = paymentMethods.reduce(
    (sum, paymentMethod) => sum + paymentMethod.spent,
    0,
  );
  const totalCreditLimit = paymentMethods.reduce(
    (sum, paymentMethod) => sum + paymentMethod.creditLimit,
    0,
  );

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
            editingPaymentMethod.type === "credit" && editingPaymentMethod.dueDay
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

  const handleToggleSubscriptionStatus = (subscription: SubscriptionOverviewItem) => {
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="payments">{t("payments.methodsTitle")}</TabsTrigger>
          <TabsTrigger value="subscriptions">
            {t("screen.payments.activeSubscriptions")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "payments" ? (
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
                formatCurrency(Math.max(totalCreditLimit - totalSpentByPaymentMethod, 0)),
                t("payments.availableLimitDescription"),
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
                          setEditingPaymentMethod({
                            closingDay: paymentMethod.closingDay
                              ? String(paymentMethod.closingDay)
                              : "",
                            creditLimit: paymentMethod.creditLimit
                              ? String(paymentMethod.creditLimit).replace(".", ",")
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
        </>
      ) : (
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
            {subscriptions.map((payment) => (
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
                    <DropdownMenuItem onClick={() => openSubscriptionDialog(payment)}>
                      <Pencil className="mr-2 size-4" />
                      {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isPending}
                      onClick={() => handleToggleSubscriptionStatus(payment)}
                    >
                      <Pause className="mr-2 size-4" />
                      {payment.status === "paused"
                        ? t("common.resume")
                        : t("common.pause")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeletingSubscription(payment)}
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
      )}

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
                      <SelectItem key={paymentMethod.id} value={paymentMethod.id}>
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
