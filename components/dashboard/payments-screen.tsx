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
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PaymentsScreenProps = {
  categories: TransactionFormCategory[];
  createPaymentMethodAction: (data: CreatePaymentMethodInput) => Promise<void>;
  createSubscriptionAction: (data: CreateSubscriptionInput) => Promise<void>;
  deletePaymentMethodAction: (paymentMethodId: string) => Promise<void>;
  paymentMethods: PaymentMethodOverviewItem[];
  subscriptions: SubscriptionOverviewItem[];
  transactionPaymentMethods: TransactionFormPaymentMethod[];
  updatePaymentMethodAction: (data: UpdatePaymentMethodInput) => Promise<void>;
};

type EditablePaymentMethod = {
  creditLimit: string;
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
  paymentMethods,
  subscriptions,
  transactionPaymentMethods,
  updatePaymentMethodAction,
}: PaymentsScreenProps) {
  const router = useRouter();
  const { formatCurrency, formatDate, t } = useI18n();
  const [activeTab, setActiveTab] = useState("payments");
  const [isPending, startTransition] = useTransition();
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] =
    useState(false);
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    creditLimit: "",
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
          creditLimit: parseCurrencyInput(editingPaymentMethod.creditLimit),
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
      creditLimit: "",
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
          creditLimit: parseCurrencyInput(paymentMethodForm.creditLimit),
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
                setIsSubscriptionDialogOpen(true);
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
                            creditLimit: paymentMethod.creditLimit
                              ? String(paymentMethod.creditLimit).replace(".", ",")
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
            {activeSubscriptions.map((payment) => (
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
        onOpenChange={setIsSubscriptionDialogOpen}
      >
        <DialogContent className="overflow-y-auto sm:h-[60vh] sm:w-[50vw] sm:max-w-none">
          <DialogHeader>
            <DialogTitle>{t("screen.payments.addSubscription")}</DialogTitle>
            <DialogDescription>
              {t("payments.subscriptionCreateDescription")}
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
              onClick={() => setIsSubscriptionDialogOpen(false)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateSubscription} disabled={isPending}>
              {isPending
                ? t("payments.subscriptionCreating")
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
