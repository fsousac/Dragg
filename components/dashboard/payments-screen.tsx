"use client";

import {
  useEffect,
  useState,
  useTransition,
  type TransitionStartFunction,
} from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  PaymentMethodsTab,
  type EditablePaymentMethod,
} from "@/components/dashboard/payment-methods-tab";
import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
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
import { getSubscriptionMatchKey } from "@/lib/finance/subscriptions";
import {
  type CreateInvoiceAdvancePaymentInput,
  type CreatePaymentMethodInput,
  type CreateSubscriptionInput,
  type PaymentBillItem,
  type PaymentInvoiceItem,
  type PaymentsDueData,
  type PaymentsDueSummary,
  type PaymentMethodOverviewItem,
  type SubscriptionOverviewItem,
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
  type UpdatePaymentMethodInput,
  type UpdateSubscriptionInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

type PaymentsScreenProps = {
  readonly categories: TransactionFormCategory[];
  readonly createInvoiceAdvancePaymentAction: (
    data: CreateInvoiceAdvancePaymentInput,
  ) => Promise<void>;
  readonly createPaymentMethodAction: (
    data: CreatePaymentMethodInput,
  ) => Promise<void>;
  readonly createSubscriptionAction: (
    data: CreateSubscriptionInput,
  ) => Promise<void>;
  readonly deletePaymentMethodAction: (
    paymentMethodId: string,
  ) => Promise<void>;
  readonly deleteSubscriptionAction: (subscriptionId: string) => Promise<void>;
  readonly pauseSubscriptionAction: (subscriptionId: string) => Promise<void>;
  readonly paymentMethods: PaymentMethodOverviewItem[];
  readonly paymentsDueData: PaymentsDueData;
  readonly resumeSubscriptionAction: (subscriptionId: string) => Promise<void>;
  readonly selectedMonth: string;
  readonly subscriptions: SubscriptionOverviewItem[];
  readonly transactionPaymentMethods: TransactionFormPaymentMethod[];
  readonly updatePaymentMethodAction: (
    data: UpdatePaymentMethodInput,
  ) => Promise<void>;
  readonly updateSubscriptionAction: (
    data: UpdateSubscriptionInput,
  ) => Promise<void>;
};

type EditableSubscription = {
  amount: number;
  category: string;
  description: string;
  id: string;
  nextDate: string;
  paymentMethod: string;
};

type Translate = (key: string) => string;
type FormatDate = (
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
) => string;

type PaymentMethodFormState = {
  closingDay: string;
  creditLimit: number;
  dueDay: string;
  name: string;
  type: CreatePaymentMethodInput["type"];
};

type AddPaymentMethodDialogProps = {
  readonly isOpen: boolean;
  readonly setIsOpen: (open: boolean) => void;
  readonly paymentMethodForm: PaymentMethodFormState;
  readonly setPaymentMethodForm: (form: PaymentMethodFormState) => void;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onCreate: () => void;
};

type AddPaymentMethodFormFieldsProps = Pick<
  AddPaymentMethodDialogProps,
  "paymentMethodForm" | "setPaymentMethodForm" | "t"
>;

function ClosingDayInput({
  id,
  value,
  onChange,
  t,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly t: Translate;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("payments.closingDay")}</Label>
      <Input
        id={id}
        inputMode="numeric"
        min="1"
        max="31"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="7"
      />
    </div>
  );
}

function DueDayInput({
  id,
  value,
  onChange,
  t,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly t: Translate;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("payments.dueDay")}</Label>
      <Input
        id={id}
        inputMode="numeric"
        min="1"
        max="31"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="14"
      />
    </div>
  );
}

function PaymentMethodTypeSelect({
  value,
  onValueChange,
  t,
}: {
  readonly value: UpdatePaymentMethodInput["type"];
  readonly onValueChange: (type: UpdatePaymentMethodInput["type"]) => void;
  readonly t: Translate;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) =>
        onValueChange(v as UpdatePaymentMethodInput["type"])
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
  );
}

function AddPaymentMethodTypeFields({
  paymentMethodForm,
  setPaymentMethodForm,
  t,
}: AddPaymentMethodFormFieldsProps) {
  if (paymentMethodForm.type !== "credit") return null;

  return (
    <>
      <ClosingDayInput
        id="new-payment-method-closing-day"
        value={paymentMethodForm.closingDay}
        onChange={(closingDay) =>
          setPaymentMethodForm({ ...paymentMethodForm, closingDay })
        }
        t={t}
      />
      <DueDayInput
        id="new-payment-method-due-day"
        value={paymentMethodForm.dueDay}
        onChange={(dueDay) =>
          setPaymentMethodForm({ ...paymentMethodForm, dueDay })
        }
        t={t}
      />
    </>
  );
}

function AddPaymentMethodTypeAndLimitFields({
  paymentMethodForm,
  setPaymentMethodForm,
  t,
}: AddPaymentMethodFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{t("payments.methodType")}</Label>
        <PaymentMethodTypeSelect
          value={paymentMethodForm.type}
          onValueChange={(type) =>
            setPaymentMethodForm({
              ...paymentMethodForm,
              closingDay: type === "credit" ? paymentMethodForm.closingDay : "",
              dueDay: type === "credit" ? paymentMethodForm.dueDay : "",
              type,
            })
          }
          t={t}
        />
      </div>
      <div className="space-y-2">
        <CurrencyInput
          id="new-payment-method-limit"
          label={t("payments.methodLimit")}
          value={paymentMethodForm.creditLimit}
          onValueChange={(creditLimit) =>
            setPaymentMethodForm({ ...paymentMethodForm, creditLimit })
          }
          labelClassName="normal-case tracking-normal text-foreground"
        />
      </div>
      <AddPaymentMethodTypeFields
        paymentMethodForm={paymentMethodForm}
        setPaymentMethodForm={setPaymentMethodForm}
        t={t}
      />
    </div>
  );
}

function AddPaymentMethodFormFields({
  paymentMethodForm,
  setPaymentMethodForm,
  t,
}: AddPaymentMethodFormFieldsProps) {
  return (
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
      <AddPaymentMethodTypeAndLimitFields
        paymentMethodForm={paymentMethodForm}
        setPaymentMethodForm={setPaymentMethodForm}
        t={t}
      />
    </div>
  );
}

function AddPaymentMethodDialog({
  isOpen,
  setIsOpen,
  paymentMethodForm,
  setPaymentMethodForm,
  isPending,
  t,
  onCreate,
}: AddPaymentMethodDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="overflow-y-auto sm:h-[60vh] sm:w-[50vw] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{t("payments.addMethod")}</DialogTitle>
          <DialogDescription>
            {t("payments.addMethodDescription")}
          </DialogDescription>
        </DialogHeader>
        <AddPaymentMethodFormFields
          paymentMethodForm={paymentMethodForm}
          setPaymentMethodForm={setPaymentMethodForm}
          t={t}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={onCreate} disabled={isPending}>
            {isPending ? t("payments.methodSaving") : t("payments.addMethod")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeletePaymentMethodAlertDialogProps = {
  readonly deletingPaymentMethod: PaymentMethodOverviewItem | null;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
};

function DeletePaymentMethodAlertDialog({
  deletingPaymentMethod,
  isPending,
  t,
  onOpenChange,
  onConfirm,
}: DeletePaymentMethodAlertDialogProps) {
  return (
    <AlertDialog
      open={Boolean(deletingPaymentMethod)}
      onOpenChange={onOpenChange}
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
            onClick={onConfirm}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type DeleteSubscriptionAlertDialogProps = {
  readonly deletingSubscription: SubscriptionOverviewItem | null;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
};

function DeleteSubscriptionAlertDialog({
  deletingSubscription,
  isPending,
  t,
  onOpenChange,
  onConfirm,
}: DeleteSubscriptionAlertDialogProps) {
  return (
    <AlertDialog
      open={Boolean(deletingSubscription)}
      onOpenChange={onOpenChange}
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
            onClick={onConfirm}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type EditPaymentMethodDialogProps = {
  readonly editingPaymentMethod: EditablePaymentMethod | null;
  readonly setEditingPaymentMethod: (
    method: EditablePaymentMethod | null,
  ) => void;
  readonly isPending: boolean;
  readonly t: Translate;
  readonly onUpdate: () => void;
};

function EditPaymentMethodTypeFields({
  editingPaymentMethod,
  setEditingPaymentMethod,
  t,
}: Pick<
  EditPaymentMethodDialogProps,
  "editingPaymentMethod" | "setEditingPaymentMethod" | "t"
>) {
  if (editingPaymentMethod?.type !== "credit") return null;

  return (
    <>
      <ClosingDayInput
        id="payment-method-closing-day"
        value={editingPaymentMethod.closingDay}
        onChange={(closingDay) =>
          setEditingPaymentMethod({ ...editingPaymentMethod, closingDay })
        }
        t={t}
      />
      <DueDayInput
        id="payment-method-due-day"
        value={editingPaymentMethod.dueDay}
        onChange={(dueDay) =>
          setEditingPaymentMethod({ ...editingPaymentMethod, dueDay })
        }
        t={t}
      />
    </>
  );
}

type EditPaymentMethodTypeAndLimitFieldsProps = {
  readonly editingPaymentMethod: EditablePaymentMethod;
  readonly setEditingPaymentMethod: EditPaymentMethodDialogProps["setEditingPaymentMethod"];
  readonly t: Translate;
};

function EditPaymentMethodTypeSelect({
  editingPaymentMethod,
  setEditingPaymentMethod,
  t,
}: EditPaymentMethodTypeAndLimitFieldsProps) {
  return (
    <div className="space-y-2">
      <Label>{t("payments.methodType")}</Label>
      <PaymentMethodTypeSelect
        value={editingPaymentMethod.type}
        onValueChange={(type) =>
          setEditingPaymentMethod({
            ...editingPaymentMethod,
            closingDay:
              type === "credit" ? editingPaymentMethod.closingDay : "",
            dueDay: type === "credit" ? editingPaymentMethod.dueDay : "",
            type,
          })
        }
        t={t}
      />
    </div>
  );
}

function EditPaymentMethodTypeAndLimitFields({
  editingPaymentMethod,
  setEditingPaymentMethod,
  t,
}: EditPaymentMethodTypeAndLimitFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <EditPaymentMethodTypeSelect
        editingPaymentMethod={editingPaymentMethod}
        setEditingPaymentMethod={setEditingPaymentMethod}
        t={t}
      />
      <div className="space-y-2">
        <CurrencyInput
          id="payment-method-limit"
          label={t("payments.methodLimit")}
          value={editingPaymentMethod.creditLimit}
          onValueChange={(creditLimit) =>
            setEditingPaymentMethod({ ...editingPaymentMethod, creditLimit })
          }
          labelClassName="normal-case tracking-normal text-foreground"
        />
      </div>
      <EditPaymentMethodTypeFields
        editingPaymentMethod={editingPaymentMethod}
        setEditingPaymentMethod={setEditingPaymentMethod}
        t={t}
      />
    </div>
  );
}

function EditPaymentMethodFormFields({
  editingPaymentMethod,
  setEditingPaymentMethod,
  t,
}: Pick<
  EditPaymentMethodDialogProps,
  "editingPaymentMethod" | "setEditingPaymentMethod" | "t"
>) {
  if (!editingPaymentMethod) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="payment-method-name">{t("payments.methodName")}</Label>
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
      <EditPaymentMethodTypeAndLimitFields
        editingPaymentMethod={editingPaymentMethod}
        setEditingPaymentMethod={setEditingPaymentMethod}
        t={t}
      />
    </div>
  );
}

function EditPaymentMethodDialog({
  editingPaymentMethod,
  setEditingPaymentMethod,
  isPending,
  t,
  onUpdate,
}: EditPaymentMethodDialogProps) {
  return (
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
        <EditPaymentMethodFormFields
          editingPaymentMethod={editingPaymentMethod}
          setEditingPaymentMethod={setEditingPaymentMethod}
          t={t}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setEditingPaymentMethod(null)}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={onUpdate} disabled={isPending}>
            {isPending
              ? t("payments.methodSaving")
              : t("transaction.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const editablePaymentTypeOptions: UpdatePaymentMethodInput["type"][] = [
  "bank",
  "boleto",
  "credit",
  "debit",
  "other",
];

type PaymentsMutationOutcome = {
  successMessage: string;
  errorLogLabel: string;
  errorMessage: string;
  onSuccess?: () => void;
};

async function runPaymentsMutation(
  action: () => Promise<void>,
  {
    successMessage,
    errorLogLabel,
    errorMessage,
    onSuccess,
  }: PaymentsMutationOutcome,
) {
  try {
    await action();
    toast.success(successMessage);
    onSuccess?.();
  } catch (error) {
    console.error(errorLogLabel, error);
    toast.error(errorMessage);
  }
}

function resolveCreditDayValue(type: string, day: string) {
  return type === "credit" && day ? Number(day) : null;
}

type PaymentMethodDetailTransaction =
  PaymentMethodOverviewItem["detail"]["transactions"][number];

type PaymentMethodDetailTransactionRowProps = {
  readonly transaction: PaymentMethodDetailTransaction;
  readonly t: Translate;
  readonly formatCurrency: (value: number) => string;
  readonly formatDate: FormatDate;
};

function PaymentMethodDetailTransactionRow({
  transaction,
  t,
  formatCurrency,
  formatDate,
}: PaymentMethodDetailTransactionRowProps) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">
            {t(transaction.descriptionKey)}
          </p>
          {transaction.installmentLabel ? (
            <Badge variant="secondary" className="shrink-0">
              {t("payments.details.installment")} {transaction.installmentLabel}
            </Badge>
          ) : null}
          {transaction.status ? (
            <Badge variant="secondary" className="shrink-0">
              {t("common.planned")}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("payments.details.transactionDate")}:{" "}
          {formatDate(transaction.date, { day: "numeric", month: "short" })}
          {" · "}
          {t("payments.details.category")}: {t(transaction.categoryKey)}
          {transaction.invoiceDueDate ? (
            <>
              {" · "}
              {t("transaction.invoiceDueDate")}:{" "}
              {formatDate(transaction.invoiceDueDate, {
                day: "numeric",
                month: "short",
              })}
            </>
          ) : null}
        </p>
      </div>
      <div className="text-sm font-semibold tabular-nums sm:text-right">
        <p className="text-xs font-normal text-muted-foreground sm:hidden">
          {t("payments.details.amount")}
        </p>
        {formatCurrency(transaction.amount)}
      </div>
    </div>
  );
}

function useSubscriptionTabState() {
  const [activeTab, setActiveTab] = useState("payments");
  const [pendingSubscriptionHighlight, setPendingSubscriptionHighlight] =
    useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "subscriptions" || !pendingSubscriptionHighlight) return;
    const row = document.getElementById(pendingSubscriptionHighlight);
    if (!row) return;

    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("ring-2", "ring-primary/40");
    const timeout = setTimeout(() => {
      row.classList.remove("ring-2", "ring-primary/40");
      setPendingSubscriptionHighlight(null);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [activeTab, pendingSubscriptionHighlight]);

  const goToSubscription = (subscription: SubscriptionOverviewItem) => {
    setActiveTab("subscriptions");
    setPendingSubscriptionHighlight(
      `subscription-row-${getSubscriptionMatchKey(subscription)}`,
    );
  };

  return { activeTab, setActiveTab, goToSubscription };
}

function usePaymentMethodFormsState() {
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] =
    useState(false);
  const [paymentMethodForm, setPaymentMethodForm] =
    useState<PaymentMethodFormState>({
      closingDay: "",
      creditLimit: 0,
      dueDay: "",
      name: "",
      type: "credit",
    });
  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<EditablePaymentMethod | null>(null);
  const [deletingPaymentMethod, setDeletingPaymentMethod] =
    useState<PaymentMethodOverviewItem | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodOverviewItem | null>(null);

  return {
    isPaymentMethodDialogOpen,
    setIsPaymentMethodDialogOpen,
    paymentMethodForm,
    setPaymentMethodForm,
    editingPaymentMethod,
    setEditingPaymentMethod,
    deletingPaymentMethod,
    setDeletingPaymentMethod,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  };
}

function buildDefaultSubscriptionForm({
  categories,
  transactionPaymentMethods,
}: Pick<PaymentsScreenProps, "categories" | "transactionPaymentMethods">) {
  return {
    amount: 0,
    category: categories[0]?.id ?? "none",
    description: "",
    nextDate: new Date().toISOString().slice(0, 10),
    paymentMethod: transactionPaymentMethods[0]?.id ?? "none",
  };
}

function useSubscriptionFormsState({
  categories,
  transactionPaymentMethods,
}: Pick<PaymentsScreenProps, "categories" | "transactionPaymentMethods">) {
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] =
    useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState(() =>
    buildDefaultSubscriptionForm({ categories, transactionPaymentMethods }),
  );
  const [editingSubscription, setEditingSubscription] =
    useState<EditableSubscription | null>(null);
  const [deletingSubscription, setDeletingSubscription] =
    useState<SubscriptionOverviewItem | null>(null);

  return {
    isSubscriptionDialogOpen,
    setIsSubscriptionDialogOpen,
    subscriptionForm,
    setSubscriptionForm,
    editingSubscription,
    setEditingSubscription,
    deletingSubscription,
    setDeletingSubscription,
  };
}

function useInvoiceFormState({
  transactionPaymentMethods,
}: Pick<PaymentsScreenProps, "transactionPaymentMethods">) {
  const [selectedInvoice, setSelectedInvoice] =
    useState<PaymentInvoiceItem | null>(null);
  const invoicePaymentMethodOptions = transactionPaymentMethods.filter(
    (paymentMethod) => paymentMethod.type !== "credit",
  );
  const [invoicePaymentForm, setInvoicePaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    paymentMethod:
      invoicePaymentMethodOptions[0]?.id ??
      transactionPaymentMethods[0]?.id ??
      "none",
  });

  return {
    selectedInvoice,
    setSelectedInvoice,
    invoicePaymentMethodOptions,
    invoicePaymentForm,
    setInvoicePaymentForm,
  };
}

type PaymentMethodActions = Pick<
  PaymentsScreenProps,
  | "updatePaymentMethodAction"
  | "createPaymentMethodAction"
  | "deletePaymentMethodAction"
>;

function buildCreatePaymentMethodInput(
  form: PaymentMethodFormState,
): CreatePaymentMethodInput {
  return {
    closingDay: resolveCreditDayValue(form.type, form.closingDay),
    creditLimit: form.creditLimit,
    dueDay: resolveCreditDayValue(form.type, form.dueDay),
    name: form.name,
    type: form.type,
  };
}

type CreatePaymentMethodHandlerParams = {
  formsState: ReturnType<typeof usePaymentMethodFormsState>;
  createPaymentMethodAction: PaymentMethodActions["createPaymentMethodAction"];
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
};

function resetPaymentMethodForm(
  setPaymentMethodForm: CreatePaymentMethodHandlerParams["formsState"]["setPaymentMethodForm"],
) {
  setPaymentMethodForm({
    closingDay: "",
    creditLimit: 0,
    dueDay: "",
    name: "",
    type: "credit",
  });
}

function useCreatePaymentMethodHandler({
  formsState,
  createPaymentMethodAction,
  router,
  t,
  startTransition,
}: CreatePaymentMethodHandlerParams) {
  const {
    paymentMethodForm,
    setPaymentMethodForm,
    setIsPaymentMethodDialogOpen,
  } = formsState;

  const handleCreatePaymentMethod = () => {
    if (!paymentMethodForm.name.trim()) {
      toast.error(t("payments.methodNameRequired"));
      return;
    }

    startTransition(() =>
      runPaymentsMutation(
        () =>
          createPaymentMethodAction(
            buildCreatePaymentMethodInput(paymentMethodForm),
          ),
        {
          successMessage: t("payments.methodCreateSuccess"),
          errorLogLabel: "Error creating payment method:",
          errorMessage: t("payments.methodCreateError"),
          onSuccess: () => {
            resetPaymentMethodForm(setPaymentMethodForm);
            setIsPaymentMethodDialogOpen(false);
            router.refresh();
          },
        },
      ),
    );
  };

  return { handleCreatePaymentMethod };
}

function buildUpdatePaymentMethodInput(
  method: EditablePaymentMethod,
  submittedName: string,
): UpdatePaymentMethodInput {
  return {
    closingDay: resolveCreditDayValue(method.type, method.closingDay),
    creditLimit: method.creditLimit,
    dueDay: resolveCreditDayValue(method.type, method.dueDay),
    id: method.id,
    name: submittedName,
    type: method.type,
  };
}

function useUpdatePaymentMethodHandler({
  formsState,
  updatePaymentMethodAction,
  router,
  t,
  startTransition,
}: {
  formsState: ReturnType<typeof usePaymentMethodFormsState>;
  updatePaymentMethodAction: PaymentMethodActions["updatePaymentMethodAction"];
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
}) {
  const { editingPaymentMethod, setEditingPaymentMethod } = formsState;

  const handleUpdatePaymentMethod = () => {
    if (!editingPaymentMethod) return;

    const submittedName =
      editingPaymentMethod.name.trim() || editingPaymentMethod.originalName;
    if (!submittedName.trim()) {
      toast.error(t("payments.methodNameRequired"));
      return;
    }

    startTransition(() =>
      runPaymentsMutation(
        () =>
          updatePaymentMethodAction(
            buildUpdatePaymentMethodInput(editingPaymentMethod, submittedName),
          ),
        {
          successMessage: t("payments.methodUpdateSuccess"),
          errorLogLabel: "Error updating payment method:",
          errorMessage: t("payments.methodUpdateError"),
          onSuccess: () => {
            setEditingPaymentMethod(null);
            router.refresh();
          },
        },
      ),
    );
  };

  return { handleUpdatePaymentMethod };
}

function useDeletePaymentMethodHandler({
  formsState,
  deletePaymentMethodAction,
  t,
  startTransition,
}: {
  formsState: ReturnType<typeof usePaymentMethodFormsState>;
  deletePaymentMethodAction: PaymentMethodActions["deletePaymentMethodAction"];
  t: Translate;
  startTransition: TransitionStartFunction;
}) {
  const { deletingPaymentMethod, setDeletingPaymentMethod } = formsState;

  const handleDeletePaymentMethod = () => {
    if (!deletingPaymentMethod) return;

    startTransition(() =>
      runPaymentsMutation(
        () => deletePaymentMethodAction(deletingPaymentMethod.id),
        {
          successMessage: t("payments.methodDeleteSuccess"),
          errorLogLabel: "Error deleting payment method:",
          errorMessage: t("payments.methodDeleteError"),
          onSuccess: () => setDeletingPaymentMethod(null),
        },
      ),
    );
  };

  return { handleDeletePaymentMethod };
}

function usePaymentMethodHandlers({
  formsState,
  actions,
  router,
  t,
  startTransition,
}: {
  formsState: ReturnType<typeof usePaymentMethodFormsState>;
  actions: PaymentMethodActions;
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
}) {
  const { handleCreatePaymentMethod } = useCreatePaymentMethodHandler({
    formsState,
    createPaymentMethodAction: actions.createPaymentMethodAction,
    router,
    t,
    startTransition,
  });

  const { handleUpdatePaymentMethod } = useUpdatePaymentMethodHandler({
    formsState,
    updatePaymentMethodAction: actions.updatePaymentMethodAction,
    router,
    t,
    startTransition,
  });

  const { handleDeletePaymentMethod } = useDeletePaymentMethodHandler({
    formsState,
    deletePaymentMethodAction: actions.deletePaymentMethodAction,
    t,
    startTransition,
  });

  return {
    handleUpdatePaymentMethod,
    handleCreatePaymentMethod,
    handleDeletePaymentMethod,
  };
}

type SubscriptionActions = Pick<
  PaymentsScreenProps,
  | "createSubscriptionAction"
  | "updateSubscriptionAction"
  | "deleteSubscriptionAction"
  | "pauseSubscriptionAction"
  | "resumeSubscriptionAction"
>;

function useOpenSubscriptionDialog({
  formsState,
  categories,
  transactionPaymentMethods,
}: {
  formsState: ReturnType<typeof useSubscriptionFormsState>;
  categories: PaymentsScreenProps["categories"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
}) {
  const {
    setEditingSubscription,
    setSubscriptionForm,
    setIsSubscriptionDialogOpen,
  } = formsState;

  const openSubscriptionDialog = (subscription?: SubscriptionOverviewItem) => {
    if (subscription) {
      const editable = {
        amount: subscription.amount,
        category: subscription.categoryId ?? "none",
        description: subscription.name,
        id: subscription.id,
        nextDate: subscription.nextDate,
        paymentMethod: subscription.paymentMethodId ?? "none",
      };
      setEditingSubscription(editable);
      setSubscriptionForm(editable);
      setIsSubscriptionDialogOpen(true);
      return;
    }

    setEditingSubscription(null);
    setSubscriptionForm(
      buildDefaultSubscriptionForm({ categories, transactionPaymentMethods }),
    );
    setIsSubscriptionDialogOpen(true);
  };

  return { openSubscriptionDialog };
}

function useCreateSubscriptionHandler({
  formsState,
  createSubscriptionAction,
  categories,
  transactionPaymentMethods,
  router,
  t,
  startTransition,
}: {
  formsState: ReturnType<typeof useSubscriptionFormsState>;
  createSubscriptionAction: SubscriptionActions["createSubscriptionAction"];
  categories: PaymentsScreenProps["categories"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
}) {
  const { subscriptionForm, setSubscriptionForm, setIsSubscriptionDialogOpen } =
    formsState;

  const handleCreateSubscription = () => {
    if (!subscriptionForm.description.trim()) {
      toast.error(t("payments.subscriptionNameRequired"));
      return;
    }

    startTransition(() =>
      runPaymentsMutation(() => createSubscriptionAction(subscriptionForm), {
        successMessage: t("payments.subscriptionCreateSuccess"),
        errorLogLabel: "Error creating subscription:",
        errorMessage: t("payments.subscriptionCreateError"),
        onSuccess: () => {
          setSubscriptionForm(
            buildDefaultSubscriptionForm({
              categories,
              transactionPaymentMethods,
            }),
          );
          setIsSubscriptionDialogOpen(false);
          router.refresh();
        },
      }),
    );
  };

  return { handleCreateSubscription };
}

type UpdateSubscriptionHandlerArgs = {
  formsState: ReturnType<typeof useSubscriptionFormsState>;
  updateSubscriptionAction: SubscriptionActions["updateSubscriptionAction"];
  categories: PaymentsScreenProps["categories"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
};

function useUpdateSubscriptionHandler({
  formsState,
  updateSubscriptionAction,
  categories,
  transactionPaymentMethods,
  router,
  t,
  startTransition,
}: UpdateSubscriptionHandlerArgs) {
  const {
    subscriptionForm,
    setSubscriptionForm,
    editingSubscription,
    setEditingSubscription,
    setIsSubscriptionDialogOpen,
  } = formsState;

  const handleUpdateSubscription = () => {
    if (!editingSubscription) return;

    if (!subscriptionForm.description.trim()) {
      toast.error(t("payments.subscriptionNameRequired"));
      return;
    }

    startTransition(() =>
      runPaymentsMutation(
        () =>
          updateSubscriptionAction({
            ...subscriptionForm,
            id: editingSubscription.id,
          }),
        {
          successMessage: t("payments.subscriptionUpdateSuccess"),
          errorLogLabel: "Error updating subscription:",
          errorMessage: t("payments.subscriptionUpdateError"),
          onSuccess: () => {
            setEditingSubscription(null);
            setSubscriptionForm(
              buildDefaultSubscriptionForm({
                categories,
                transactionPaymentMethods,
              }),
            );
            setIsSubscriptionDialogOpen(false);
            router.refresh();
          },
        },
      ),
    );
  };

  return { handleUpdateSubscription };
}

function useToggleSubscriptionStatusHandler({
  pauseSubscriptionAction,
  resumeSubscriptionAction,
  router,
  t,
  startTransition,
}: {
  pauseSubscriptionAction: SubscriptionActions["pauseSubscriptionAction"];
  resumeSubscriptionAction: SubscriptionActions["resumeSubscriptionAction"];
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
}) {
  const handleToggleSubscriptionStatus = (
    subscription: SubscriptionOverviewItem,
  ) => {
    const isPaused = subscription.status === "paused";
    startTransition(() =>
      runPaymentsMutation(
        () =>
          isPaused
            ? resumeSubscriptionAction(subscription.id)
            : pauseSubscriptionAction(subscription.id),
        {
          successMessage: t(
            isPaused
              ? "payments.subscriptionResumeSuccess"
              : "payments.subscriptionPauseSuccess",
          ),
          errorLogLabel: "Error updating subscription status:",
          errorMessage: t("payments.subscriptionStatusError"),
          onSuccess: () => router.refresh(),
        },
      ),
    );
  };

  return { handleToggleSubscriptionStatus };
}

function useDeleteSubscriptionHandler({
  formsState,
  deleteSubscriptionAction,
  router,
  t,
  startTransition,
}: {
  formsState: ReturnType<typeof useSubscriptionFormsState>;
  deleteSubscriptionAction: SubscriptionActions["deleteSubscriptionAction"];
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
}) {
  const { deletingSubscription, setDeletingSubscription } = formsState;

  const handleDeleteSubscription = () => {
    if (!deletingSubscription) return;

    startTransition(() =>
      runPaymentsMutation(
        () => deleteSubscriptionAction(deletingSubscription.id),
        {
          successMessage: t("payments.subscriptionDeleteSuccess"),
          errorLogLabel: "Error deleting subscription:",
          errorMessage: t("payments.subscriptionDeleteError"),
          onSuccess: () => {
            setDeletingSubscription(null);
            router.refresh();
          },
        },
      ),
    );
  };

  return { handleDeleteSubscription };
}

type SubscriptionHandlersArgs = {
  formsState: ReturnType<typeof useSubscriptionFormsState>;
  actions: SubscriptionActions;
  categories: PaymentsScreenProps["categories"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
};

function useSubscriptionHandlers({
  formsState,
  actions,
  categories,
  transactionPaymentMethods,
  router,
  t,
  startTransition,
}: SubscriptionHandlersArgs) {
  const shared = {
    categories,
    transactionPaymentMethods,
    router,
    t,
    startTransition,
  };
  const { openSubscriptionDialog } = useOpenSubscriptionDialog({
    formsState,
    ...shared,
  });
  const { handleCreateSubscription } = useCreateSubscriptionHandler({
    formsState,
    createSubscriptionAction: actions.createSubscriptionAction,
    ...shared,
  });
  const { handleUpdateSubscription } = useUpdateSubscriptionHandler({
    formsState,
    updateSubscriptionAction: actions.updateSubscriptionAction,
    ...shared,
  });
  const { handleToggleSubscriptionStatus } = useToggleSubscriptionStatusHandler(
    {
      pauseSubscriptionAction: actions.pauseSubscriptionAction,
      resumeSubscriptionAction: actions.resumeSubscriptionAction,
      ...shared,
    },
  );
  const { handleDeleteSubscription } = useDeleteSubscriptionHandler({
    formsState,
    deleteSubscriptionAction: actions.deleteSubscriptionAction,
    ...shared,
  });

  return {
    openSubscriptionDialog,
    handleCreateSubscription,
    handleUpdateSubscription,
    handleToggleSubscriptionStatus,
    handleDeleteSubscription,
  };
}

function useDueStatusHelpers({
  t,
  formatDate,
}: {
  t: Translate;
  formatDate: FormatDate;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const dueThreshold = (() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 3);
    return threshold.toISOString().slice(0, 10);
  })();

  const getDueStatusLabel = (status: "planned" | "next") =>
    status === "next" ? t("common.next") : t("common.planned");
  const getDueStatusStyle = (status: "planned" | "next") =>
    status === "next"
      ? "bg-yellow text-black"
      : "bg-muted text-muted-foreground";
  const shouldShowDueBadge = (dateValue: string) => dateValue > today;
  const formatInvoicePurchaseCount = (count: number) =>
    t("payments.invoicePurchaseCount").replace("{count}", String(count));
  const formatSelectedMonth = (month: string) =>
    formatDate(`${month}-01`, { month: "long", year: "numeric" });

  const getSubscriptionStatus = (subscription: SubscriptionOverviewItem) => {
    if (subscription.status === "paused") return "paused" as const;
    if (subscription.nextDate > today && subscription.nextDate <= dueThreshold)
      return "next" as const;
    return "planned" as const;
  };

  return {
    today,
    getDueStatusLabel,
    getDueStatusStyle,
    shouldShowDueBadge,
    formatInvoicePurchaseCount,
    formatSelectedMonth,
    getSubscriptionStatus,
  };
}

function validateInvoiceAdvanceAmount(
  amount: number,
  invoiceAmount: number,
  t: Translate,
) {
  if (amount <= 0) return t("payments.invoiceAdvanceAmountRequired");
  if (amount > invoiceAmount) return t("payments.invoiceAdvanceAmountTooHigh");
  return null;
}

type InvoiceHandlersArgs = {
  formsState: ReturnType<typeof useInvoiceFormState>;
  createInvoiceAdvancePaymentAction: PaymentsScreenProps["createInvoiceAdvancePaymentAction"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  today: string;
  router: ReturnType<typeof useRouter>;
  t: Translate;
  startTransition: TransitionStartFunction;
};

function useOpenInvoiceDialog({
  formsState,
  transactionPaymentMethods,
  today,
}: Pick<
  InvoiceHandlersArgs,
  "formsState" | "transactionPaymentMethods" | "today"
>) {
  const {
    setSelectedInvoice,
    invoicePaymentMethodOptions,
    setInvoicePaymentForm,
  } = formsState;

  const resetInvoicePaymentForm = () => {
    setInvoicePaymentForm({
      amount: 0,
      date: today,
      paymentMethod:
        invoicePaymentMethodOptions[0]?.id ??
        transactionPaymentMethods[0]?.id ??
        "none",
    });
  };

  const openInvoiceDialog = (invoice: PaymentInvoiceItem) => {
    setSelectedInvoice(invoice);
    resetInvoicePaymentForm();
  };

  return { resetInvoicePaymentForm, openInvoiceDialog };
}

function useInvoiceHandlers({
  formsState,
  createInvoiceAdvancePaymentAction,
  transactionPaymentMethods,
  today,
  router,
  t,
  startTransition,
}: InvoiceHandlersArgs) {
  const { selectedInvoice, setSelectedInvoice, invoicePaymentForm } =
    formsState;
  const { resetInvoicePaymentForm, openInvoiceDialog } = useOpenInvoiceDialog({
    formsState,
    transactionPaymentMethods,
    today,
  });

  const handleCreateInvoiceAdvancePayment = () => {
    if (!selectedInvoice) return;

    const validationError = validateInvoiceAdvanceAmount(
      invoicePaymentForm.amount,
      selectedInvoice.amount,
      t,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const action = () =>
      createInvoiceAdvancePaymentAction({
        ...invoicePaymentForm,
        invoiceId: selectedInvoice.id,
      });

    startTransition(() =>
      runPaymentsMutation(action, {
        successMessage: t("payments.invoiceAdvanceSuccess"),
        errorLogLabel: "Error creating invoice advance payment:",
        errorMessage: t("payments.invoiceAdvanceError"),
        onSuccess: () => {
          setSelectedInvoice(null);
          resetInvoicePaymentForm();
          router.refresh();
        },
      }),
    );
  };

  return { openInvoiceDialog, handleCreateInvoiceAdvancePayment };
}

type PaymentsDueSummaryCardProps = {
  readonly summary: PaymentsDueSummary;
  readonly t: Translate;
  readonly formatCurrency: (value: number) => string;
  readonly formatDate: FormatDate;
};

function NextDueTile({
  summary,
  t,
  formatDate,
}: Pick<PaymentsDueSummaryCardProps, "summary" | "t" | "formatDate">) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{t("payments.nextDue")}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        {summary.nextDueDate
          ? formatDate(summary.nextDueDate, { day: "numeric", month: "short" })
          : t("payments.noDueDate")}
      </p>
    </div>
  );
}

function PaymentsDueSummaryCard({
  summary,
  t,
  formatCurrency,
  formatDate,
}: PaymentsDueSummaryCardProps) {
  return (
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
        <NextDueTile summary={summary} t={t} formatDate={formatDate} />
      </CardContent>
    </Card>
  );
}

type DueStatusHelpers = ReturnType<typeof useDueStatusHelpers>;

type InvoiceRowProps = {
  readonly invoice: PaymentInvoiceItem;
  readonly t: Translate;
  readonly formatCurrency: (value: number) => string;
  readonly formatDate: FormatDate;
  readonly formatInvoicePurchaseCount: DueStatusHelpers["formatInvoicePurchaseCount"];
  readonly getDueStatusLabel: DueStatusHelpers["getDueStatusLabel"];
  readonly getDueStatusStyle: DueStatusHelpers["getDueStatusStyle"];
  readonly shouldShowDueBadge: DueStatusHelpers["shouldShowDueBadge"];
  readonly openInvoiceDialog: (invoice: PaymentInvoiceItem) => void;
};

function InvoiceRowInfo({
  invoice,
  t,
  formatDate,
  formatInvoicePurchaseCount,
}: Pick<
  InvoiceRowProps,
  "invoice" | "t" | "formatDate" | "formatInvoicePurchaseCount"
>) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/40 text-foreground">
        <CreditCard className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {t("transaction.creditCardInvoiceFor")} {t(invoice.paymentMethodKey)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("transaction.invoiceDueDate")}:{" "}
          <span className="text-foreground">
            {formatDate(invoice.dueDate, { day: "numeric", month: "short" })}
          </span>
          {" · "}
          {formatInvoicePurchaseCount(invoice.purchaseCount)}
        </p>
      </div>
    </div>
  );
}

function InvoiceRow({
  invoice,
  t,
  formatCurrency,
  formatDate,
  formatInvoicePurchaseCount,
  getDueStatusLabel,
  getDueStatusStyle,
  shouldShowDueBadge,
  openInvoiceDialog,
}: InvoiceRowProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-foreground transition-colors hover:bg-accent/50"
      onClick={() => openInvoiceDialog(invoice)}
    >
      <InvoiceRowInfo
        invoice={invoice}
        t={t}
        formatDate={formatDate}
        formatInvoicePurchaseCount={formatInvoicePurchaseCount}
      />
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
  );
}

function PaymentsInvoicesCard({
  invoices,
  ...rowProps
}: { invoices: PaymentInvoiceItem[] } & Omit<InvoiceRowProps, "invoice">) {
  const { t } = rowProps;
  return (
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
              <InvoiceRow key={invoice.id} invoice={invoice} {...rowProps} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            {t("payments.noInvoices")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionDueBadge({
  status,
  nextDate,
  t,
  getDueStatusLabel,
  getDueStatusStyle,
  shouldShowDueBadge,
}: {
  readonly status: ReturnType<DueStatusHelpers["getSubscriptionStatus"]>;
  readonly nextDate: string;
  readonly t: Translate;
  readonly getDueStatusLabel: DueStatusHelpers["getDueStatusLabel"];
  readonly getDueStatusStyle: DueStatusHelpers["getDueStatusStyle"];
  readonly shouldShowDueBadge: DueStatusHelpers["shouldShowDueBadge"];
}) {
  if (status !== "paused" && !shouldShowDueBadge(nextDate)) return null;

  return (
    <Badge
      variant="secondary"
      className={
        status === "paused" ? "bg-yellow text-black" : getDueStatusStyle(status)
      }
    >
      {status === "paused" ? t("common.paused") : getDueStatusLabel(status)}
    </Badge>
  );
}

type SubscriptionDueRowProps = {
  readonly subscription: SubscriptionOverviewItem;
  readonly t: Translate;
  readonly formatCurrency: (value: number) => string;
  readonly formatDate: FormatDate;
  readonly getDueStatusLabel: DueStatusHelpers["getDueStatusLabel"];
  readonly getDueStatusStyle: DueStatusHelpers["getDueStatusStyle"];
  readonly shouldShowDueBadge: DueStatusHelpers["shouldShowDueBadge"];
  readonly getSubscriptionStatus: DueStatusHelpers["getSubscriptionStatus"];
  readonly goToSubscription: (subscription: SubscriptionOverviewItem) => void;
};

function SubscriptionDueRow({
  subscription,
  t,
  formatCurrency,
  formatDate,
  getDueStatusLabel,
  getDueStatusStyle,
  shouldShowDueBadge,
  getSubscriptionStatus,
  goToSubscription,
}: SubscriptionDueRowProps) {
  const status = getSubscriptionStatus(subscription);
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      onClick={() => goToSubscription(subscription)}
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
        <SubscriptionDueBadge
          status={status}
          nextDate={subscription.nextDate}
          t={t}
          getDueStatusLabel={getDueStatusLabel}
          getDueStatusStyle={getDueStatusStyle}
          shouldShowDueBadge={shouldShowDueBadge}
        />
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(subscription.amount)}
        </span>
      </div>
    </button>
  );
}

function PaymentsSubscriptionsDueCard({
  dueSubscriptions,
  ...rowProps
}: { dueSubscriptions: SubscriptionOverviewItem[] } & Omit<
  SubscriptionDueRowProps,
  "subscription"
>) {
  const { t } = rowProps;
  return (
    <Card className="border-border bg-card card-shadow">
      <CardHeader>
        <CardTitle className="text-base">
          {t("payments.subscriptionsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {dueSubscriptions.length ? (
          <div className="divide-y divide-border">
            {dueSubscriptions.map((subscription) => (
              <SubscriptionDueRow
                key={subscription.id}
                subscription={subscription}
                {...rowProps}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            {t("payments.noSubscriptions")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type BillRowProps = {
  readonly bill: PaymentBillItem;
  readonly t: Translate;
  readonly formatCurrency: (value: number) => string;
  readonly formatDate: FormatDate;
  readonly getDueStatusLabel: DueStatusHelpers["getDueStatusLabel"];
  readonly getDueStatusStyle: DueStatusHelpers["getDueStatusStyle"];
  readonly shouldShowDueBadge: DueStatusHelpers["shouldShowDueBadge"];
};

function BillRow({
  bill,
  t,
  formatCurrency,
  formatDate,
  getDueStatusLabel,
  getDueStatusStyle,
  shouldShowDueBadge,
}: BillRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {t(bill.descriptionKey)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(bill.categoryKey)}
          {bill.paymentMethodKey ? ` · ${t(bill.paymentMethodKey)}` : ""}
          {" · "}
          {formatDate(bill.date, { day: "numeric", month: "short" })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {shouldShowDueBadge(bill.date) ? (
          <Badge variant="secondary" className={getDueStatusStyle(bill.status)}>
            {getDueStatusLabel(bill.status)}
          </Badge>
        ) : null}
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(bill.amount)}
        </span>
      </div>
    </div>
  );
}

function PaymentsBillsCard({
  bills,
  t,
  formatCurrency,
  formatDate,
  getDueStatusLabel,
  getDueStatusStyle,
  shouldShowDueBadge,
}: {
  readonly bills: PaymentBillItem[];
  readonly t: Translate;
  readonly formatCurrency: (value: number) => string;
  readonly formatDate: FormatDate;
  readonly getDueStatusLabel: DueStatusHelpers["getDueStatusLabel"];
  readonly getDueStatusStyle: DueStatusHelpers["getDueStatusStyle"];
  readonly shouldShowDueBadge: DueStatusHelpers["shouldShowDueBadge"];
}) {
  return (
    <Card className="border-border bg-card card-shadow">
      <CardHeader>
        <CardTitle className="text-base">{t("payments.billsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {bills.length ? (
          <div className="divide-y divide-border">
            {bills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                t={t}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getDueStatusLabel={getDueStatusLabel}
                getDueStatusStyle={getDueStatusStyle}
                shouldShowDueBadge={shouldShowDueBadge}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            {t("payments.noBills")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type PaymentsDueOverviewSectionProps = {
  readonly paymentsDueData: Pick<
    PaymentsDueData,
    "summary" | "invoices" | "bills"
  > & {
    dueSubscriptions: SubscriptionOverviewItem[];
  };
  readonly t: Translate;
  readonly formatCurrency: (value: number) => string;
  readonly formatDate: FormatDate;
  readonly dueStatus: Omit<DueStatusHelpers, "today">;
  readonly openInvoiceDialog: (invoice: PaymentInvoiceItem) => void;
  readonly goToSubscription: (subscription: SubscriptionOverviewItem) => void;
};

function PaymentsInvoicesAndSubscriptionsRow({
  invoices,
  dueSubscriptions,
  t,
  formatCurrency,
  formatDate,
  dueStatus,
  openInvoiceDialog,
  goToSubscription,
}: Pick<
  PaymentsDueOverviewSectionProps,
  | "t"
  | "formatCurrency"
  | "formatDate"
  | "dueStatus"
  | "openInvoiceDialog"
  | "goToSubscription"
> & {
  invoices: PaymentInvoiceItem[];
  dueSubscriptions: SubscriptionOverviewItem[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <PaymentsInvoicesCard
        invoices={invoices}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        formatInvoicePurchaseCount={dueStatus.formatInvoicePurchaseCount}
        getDueStatusLabel={dueStatus.getDueStatusLabel}
        getDueStatusStyle={dueStatus.getDueStatusStyle}
        shouldShowDueBadge={dueStatus.shouldShowDueBadge}
        openInvoiceDialog={openInvoiceDialog}
      />
      <PaymentsSubscriptionsDueCard
        dueSubscriptions={dueSubscriptions}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getDueStatusLabel={dueStatus.getDueStatusLabel}
        getDueStatusStyle={dueStatus.getDueStatusStyle}
        shouldShowDueBadge={dueStatus.shouldShowDueBadge}
        getSubscriptionStatus={dueStatus.getSubscriptionStatus}
        goToSubscription={goToSubscription}
      />
    </div>
  );
}

function PaymentsDueOverviewSection({
  paymentsDueData,
  t,
  formatCurrency,
  formatDate,
  dueStatus,
  openInvoiceDialog,
  goToSubscription,
}: PaymentsDueOverviewSectionProps) {
  const { summary, invoices, bills, dueSubscriptions } = paymentsDueData;
  return (
    <section className="mb-8 grid gap-4">
      <PaymentsDueSummaryCard
        summary={summary}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      <PaymentsInvoicesAndSubscriptionsRow
        invoices={invoices}
        dueSubscriptions={dueSubscriptions}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        dueStatus={dueStatus}
        openInvoiceDialog={openInvoiceDialog}
        goToSubscription={goToSubscription}
      />

      <PaymentsBillsCard
        bills={bills}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getDueStatusLabel={dueStatus.getDueStatusLabel}
        getDueStatusStyle={dueStatus.getDueStatusStyle}
        shouldShowDueBadge={dueStatus.shouldShowDueBadge}
      />
    </section>
  );
}

function usePaymentsScreenBaseState({
  categories,
  transactionPaymentMethods,
  paymentsDueData,
}: Pick<
  PaymentsScreenProps,
  "categories" | "transactionPaymentMethods" | "paymentsDueData"
>) {
  const router = useRouter();
  const { formatCurrency, formatDate, t } = useI18n();
  const {
    bills,
    invoices,
    subscriptions: dueSubscriptions,
    summary,
  } = paymentsDueData;
  const tab = useSubscriptionTabState();
  const [isPending, startTransition] = useTransition();
  const paymentMethodForms = usePaymentMethodFormsState();
  const subscriptionForms = useSubscriptionFormsState({
    categories,
    transactionPaymentMethods,
  });
  const invoiceForm = useInvoiceFormState({ transactionPaymentMethods });
  const dueStatus = useDueStatusHelpers({ t, formatDate });

  return {
    router,
    formatCurrency,
    formatDate,
    t,
    bills,
    invoices,
    dueSubscriptions,
    summary,
    ...tab,
    isPending,
    startTransition,
    ...paymentMethodForms,
    ...subscriptionForms,
    ...invoiceForm,
    ...dueStatus,
    paymentMethodForms,
    subscriptionForms,
    invoiceForm,
  };
}

type PaymentsScreenBaseState = ReturnType<typeof usePaymentsScreenBaseState>;

function useInvoiceAndPaymentMethodHandlers({
  props,
  base,
}: {
  props: PaymentsScreenProps;
  base: PaymentsScreenBaseState;
}) {
  const { openInvoiceDialog, handleCreateInvoiceAdvancePayment } =
    useInvoiceHandlers({
      formsState: base.invoiceForm,
      createInvoiceAdvancePaymentAction:
        props.createInvoiceAdvancePaymentAction,
      transactionPaymentMethods: props.transactionPaymentMethods,
      today: base.today,
      router: base.router,
      t: base.t,
      startTransition: base.startTransition,
    });

  const {
    handleUpdatePaymentMethod,
    handleCreatePaymentMethod,
    handleDeletePaymentMethod,
  } = usePaymentMethodHandlers({
    formsState: base.paymentMethodForms,
    actions: {
      updatePaymentMethodAction: props.updatePaymentMethodAction,
      createPaymentMethodAction: props.createPaymentMethodAction,
      deletePaymentMethodAction: props.deletePaymentMethodAction,
    },
    router: base.router,
    t: base.t,
    startTransition: base.startTransition,
  });

  return {
    openInvoiceDialog,
    handleCreateInvoiceAdvancePayment,
    handleUpdatePaymentMethod,
    handleCreatePaymentMethod,
    handleDeletePaymentMethod,
  };
}

function usePaymentsScreenSubscriptionHandlers({
  props,
  base,
}: {
  props: PaymentsScreenProps;
  base: PaymentsScreenBaseState;
}) {
  return useSubscriptionHandlers({
    formsState: base.subscriptionForms,
    actions: {
      createSubscriptionAction: props.createSubscriptionAction,
      updateSubscriptionAction: props.updateSubscriptionAction,
      deleteSubscriptionAction: props.deleteSubscriptionAction,
      pauseSubscriptionAction: props.pauseSubscriptionAction,
      resumeSubscriptionAction: props.resumeSubscriptionAction,
    },
    categories: props.categories,
    transactionPaymentMethods: props.transactionPaymentMethods,
    router: base.router,
    t: base.t,
    startTransition: base.startTransition,
  });
}

function usePaymentsScreenState(props: PaymentsScreenProps) {
  const base = usePaymentsScreenBaseState(props);
  const invoiceAndMethodHandlers = useInvoiceAndPaymentMethodHandlers({
    props,
    base,
  });
  const subscriptionHandlers = usePaymentsScreenSubscriptionHandlers({
    props,
    base,
  });
  return { ...base, ...invoiceAndMethodHandlers, ...subscriptionHandlers };
}

type PaymentsScreenState = ReturnType<typeof usePaymentsScreenState>;

export function PaymentsScreen(props: PaymentsScreenProps) {
  const state = usePaymentsScreenState(props);
  return <PaymentsScreenView {...props} {...state} />;
}

function PaymentsScreenView(props: PaymentsScreenProps & PaymentsScreenState) {
  return (
    <>
      <PaymentsScreenMainSection {...props} />
      <PaymentsScreenDialogsSection {...props} />
    </>
  );
}

type PaymentsTabsHeaderProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  t: Translate;
  openSubscriptionDialog: (subscription?: SubscriptionOverviewItem) => void;
  setIsPaymentMethodDialogOpen: (open: boolean) => void;
};

function PaymentsTabsHeader({
  activeTab,
  setActiveTab,
  t,
  openSubscriptionDialog,
  setIsPaymentMethodDialogOpen,
}: PaymentsTabsHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="payments">
            {t("payments.methodsTitle")}
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            {t("screen.payments.activeSubscriptions")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Button
        className="gap-2 w-auto text-background"
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
    </div>
  );
}

type PaymentsActiveTabContentProps = {
  activeTab: string;
  paymentMethods: PaymentMethodOverviewItem[];
  subscriptions: SubscriptionOverviewItem[];
  isPending: boolean;
  setDeletingPaymentMethod: (method: PaymentMethodOverviewItem | null) => void;
  setEditingPaymentMethod: (method: EditablePaymentMethod | null) => void;
  setSelectedPaymentMethod: (method: PaymentMethodOverviewItem | null) => void;
  setDeletingSubscription: (
    subscription: SubscriptionOverviewItem | null,
  ) => void;
  openSubscriptionDialog: (subscription?: SubscriptionOverviewItem) => void;
  handleToggleSubscriptionStatus: (
    subscription: SubscriptionOverviewItem,
  ) => void;
};

function PaymentsActiveTabContent({
  activeTab,
  paymentMethods,
  subscriptions,
  isPending,
  setDeletingPaymentMethod,
  setEditingPaymentMethod,
  setSelectedPaymentMethod,
  setDeletingSubscription,
  openSubscriptionDialog,
  handleToggleSubscriptionStatus,
}: PaymentsActiveTabContentProps) {
  if (activeTab === "payments") {
    return (
      <PaymentMethodsTab
        onDeletePaymentMethod={setDeletingPaymentMethod}
        onEditPaymentMethod={setEditingPaymentMethod}
        onViewPaymentMethod={setSelectedPaymentMethod}
        paymentMethods={paymentMethods}
      />
    );
  }

  return (
    <SubscriptionsTab
      isPending={isPending}
      onDeleteSubscription={setDeletingSubscription}
      onEditSubscription={openSubscriptionDialog}
      onToggleSubscriptionStatus={handleToggleSubscriptionStatus}
      subscriptions={subscriptions}
    />
  );
}

function PaymentsScreenMainSection(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  const {
    formatCurrency,
    formatDate,
    t,
    bills,
    invoices,
    dueSubscriptions,
    summary,
    goToSubscription,
    getDueStatusLabel,
    getDueStatusStyle,
    shouldShowDueBadge,
    formatInvoicePurchaseCount,
    formatSelectedMonth,
    getSubscriptionStatus,
    openInvoiceDialog,
  } = props;

  return (
    <>
      <PageHeader
        title={t("screen.payments.title")}
        description={t("screen.payments.description")}
      />

      <PaymentsDueOverviewSection
        paymentsDueData={{ summary, invoices, bills, dueSubscriptions }}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        dueStatus={{
          getDueStatusLabel,
          getDueStatusStyle,
          shouldShowDueBadge,
          formatInvoicePurchaseCount,
          formatSelectedMonth,
          getSubscriptionStatus,
        }}
        openInvoiceDialog={openInvoiceDialog}
        goToSubscription={goToSubscription}
      />

      <PaymentsTabsHeader {...props} />
      <PaymentsActiveTabContent {...props} />
    </>
  );
}

type PaymentMethodDetailsDialogProps = {
  selectedPaymentMethod: PaymentMethodOverviewItem | null;
  setSelectedPaymentMethod: (method: PaymentMethodOverviewItem | null) => void;
  selectedMonth: string;
  t: Translate;
  formatCurrency: (value: number) => string;
  formatDate: FormatDate;
  formatSelectedMonth: DueStatusHelpers["formatSelectedMonth"];
};

function PaymentMethodDetailsInfoGrid({
  selectedPaymentMethod,
  selectedMonth,
  t,
  formatSelectedMonth,
}: {
  selectedPaymentMethod: PaymentMethodOverviewItem;
  selectedMonth: string;
  t: Translate;
  formatSelectedMonth: DueStatusHelpers["formatSelectedMonth"];
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">
          {t("payments.details.paymentMethod")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {t(selectedPaymentMethod.label)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t("common.type")}</p>
        <p className="mt-1 text-sm font-medium">
          {t(`payments.type.${selectedPaymentMethod.type}`)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t("common.month")}</p>
        <p className="mt-1 text-sm font-medium">
          {formatSelectedMonth(selectedMonth)}
        </p>
      </div>
    </div>
  );
}

function PaymentMethodDetailsPurchasesList({
  selectedPaymentMethod,
  t,
  formatCurrency,
  formatDate,
}: {
  selectedPaymentMethod: PaymentMethodOverviewItem;
  t: Translate;
  formatCurrency: (value: number) => string;
  formatDate: FormatDate;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border bg-muted/30 px-4 py-3 text-sm font-medium">
        <span>{t("payments.details.relatedPurchases")}</span>
        <span className="tabular-nums">
          {t("payments.details.total")}:{" "}
          {formatCurrency(selectedPaymentMethod.detail.totalAmount)}
        </span>
      </div>
      {selectedPaymentMethod.detail.transactions.length ? (
        <div className="divide-y divide-border">
          {selectedPaymentMethod.detail.transactions.map((transaction) => (
            <PaymentMethodDetailTransactionRow
              key={transaction.id}
              transaction={transaction}
              t={t}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          {t("payments.details.noPurchases")}
        </div>
      )}
    </div>
  );
}

function PaymentMethodDetailsDialog({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  selectedMonth,
  t,
  formatCurrency,
  formatDate,
  formatSelectedMonth,
}: PaymentMethodDetailsDialogProps) {
  return (
    <Dialog
      open={Boolean(selectedPaymentMethod)}
      onOpenChange={(open) => {
        if (!open) setSelectedPaymentMethod(null);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("payments.details.title")}</DialogTitle>
          <DialogDescription>
            {selectedPaymentMethod
              ? t(selectedPaymentMethod.label)
              : t("payments.details.paymentMethod")}
          </DialogDescription>
        </DialogHeader>

        {selectedPaymentMethod ? (
          <div className="grid gap-4">
            <PaymentMethodDetailsInfoGrid
              selectedPaymentMethod={selectedPaymentMethod}
              selectedMonth={selectedMonth}
              t={t}
              formatSelectedMonth={formatSelectedMonth}
            />
            <PaymentMethodDetailsPurchasesList
              selectedPaymentMethod={selectedPaymentMethod}
              t={t}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type InvoiceFormState = ReturnType<typeof useInvoiceFormState>;

function InvoiceDetailsInfoGrid({
  selectedInvoice,
  t,
  formatDate,
}: {
  selectedInvoice: PaymentInvoiceItem;
  t: Translate;
  formatDate: FormatDate;
}) {
  return (
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
  );
}

function InvoicePaidAmountSummary({
  selectedInvoice,
  t,
  formatCurrency,
}: {
  selectedInvoice: PaymentInvoiceItem;
  t: Translate;
  formatCurrency: (value: number) => string;
}) {
  if (selectedInvoice.paidAmount <= 0) return null;

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">
          {t("payments.invoiceTotal")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {formatCurrency(selectedInvoice.totalAmount)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {t("payments.invoicePaid")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {formatCurrency(selectedInvoice.paidAmount)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          {t("payments.invoiceRemaining")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {formatCurrency(selectedInvoice.amount)}
        </p>
      </div>
    </div>
  );
}

function InvoicePurchasesList({
  selectedInvoice,
  t,
  formatCurrency,
  formatDate,
}: {
  selectedInvoice: PaymentInvoiceItem;
  t: Translate;
  formatCurrency: (value: number) => string;
  formatDate: FormatDate;
}) {
  return (
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
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(purchase.date, { day: "numeric", month: "short" })}{" "}
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
  );
}

type InvoiceAdvancePaymentFormProps = {
  invoicePaymentForm: InvoiceFormState["invoicePaymentForm"];
  setInvoicePaymentForm: InvoiceFormState["setInvoicePaymentForm"];
  invoicePaymentMethodOptions: InvoiceFormState["invoicePaymentMethodOptions"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  t: Translate;
};

function InvoiceAdvanceMethodField({
  invoicePaymentForm,
  setInvoicePaymentForm,
  invoicePaymentMethodOptions,
  transactionPaymentMethods,
  t,
}: InvoiceAdvancePaymentFormProps) {
  const paymentMethodOptions = invoicePaymentMethodOptions.length
    ? invoicePaymentMethodOptions
    : transactionPaymentMethods;

  return (
    <div className="grid gap-2">
      <Label>{t("payments.details.paymentMethod")}</Label>
      <Select
        value={invoicePaymentForm.paymentMethod}
        onValueChange={(value) =>
          setInvoicePaymentForm((current) => ({
            ...current,
            paymentMethod: value,
          }))
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentMethodOptions.map((paymentMethod) => (
            <SelectItem key={paymentMethod.id} value={paymentMethod.id}>
              {t(paymentMethod.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InvoiceAdvanceDateField({
  invoicePaymentForm,
  setInvoicePaymentForm,
  t,
}: Pick<
  InvoiceAdvancePaymentFormProps,
  "invoicePaymentForm" | "setInvoicePaymentForm" | "t"
>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="invoice-advance-date">
        {t("payments.details.transactionDate")}
      </Label>
      <Input
        id="invoice-advance-date"
        type="date"
        value={invoicePaymentForm.date}
        onChange={(event) =>
          setInvoicePaymentForm((current) => ({
            ...current,
            date: event.target.value,
          }))
        }
        className="w-full max-w-full min-w-0 appearance-none overflow-hidden pr-3 text-left [&::-webkit-calendar-picker-indicator]:shrink-0 [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:overflow-hidden [&::-webkit-date-and-time-value]:text-left"
      />
    </div>
  );
}

function InvoiceAdvanceMethodAndDateFields(
  props: InvoiceAdvancePaymentFormProps,
) {
  return (
    <>
      <InvoiceAdvanceMethodField {...props} />
      <InvoiceAdvanceDateField {...props} />
    </>
  );
}

function InvoiceAdvancePaymentForm({
  invoicePaymentForm,
  setInvoicePaymentForm,
  invoicePaymentMethodOptions,
  transactionPaymentMethods,
  t,
}: InvoiceAdvancePaymentFormProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">
          {t("payments.invoiceAdvanceTitle")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("payments.invoiceAdvanceDescription")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="grid gap-2">
          <CurrencyInput
            id="invoice-advance-amount"
            label={t("payments.details.amount")}
            value={invoicePaymentForm.amount}
            onValueChange={(amount) =>
              setInvoicePaymentForm((current) => ({ ...current, amount }))
            }
            labelClassName="normal-case tracking-normal text-foreground"
          />
        </div>
        <InvoiceAdvanceMethodAndDateFields
          invoicePaymentForm={invoicePaymentForm}
          setInvoicePaymentForm={setInvoicePaymentForm}
          invoicePaymentMethodOptions={invoicePaymentMethodOptions}
          transactionPaymentMethods={transactionPaymentMethods}
          t={t}
        />
      </div>
    </div>
  );
}

type InvoiceDetailsDialogProps = {
  selectedInvoice: PaymentInvoiceItem | null;
  setSelectedInvoice: InvoiceFormState["setSelectedInvoice"];
  invoicePaymentForm: InvoiceFormState["invoicePaymentForm"];
  setInvoicePaymentForm: InvoiceFormState["setInvoicePaymentForm"];
  invoicePaymentMethodOptions: InvoiceFormState["invoicePaymentMethodOptions"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  isPending: boolean;
  t: Translate;
  formatCurrency: (value: number) => string;
  formatDate: FormatDate;
  onConfirmAdvance: () => void;
};

function InvoiceDetailsDialogBody({
  selectedInvoice,
  invoicePaymentForm,
  setInvoicePaymentForm,
  invoicePaymentMethodOptions,
  transactionPaymentMethods,
  t,
  formatCurrency,
  formatDate,
}: Omit<
  InvoiceDetailsDialogProps,
  "selectedInvoice" | "isPending" | "setSelectedInvoice" | "onConfirmAdvance"
> & {
  selectedInvoice: PaymentInvoiceItem;
}) {
  return (
    <div className="grid gap-4">
      <InvoiceDetailsInfoGrid
        selectedInvoice={selectedInvoice}
        t={t}
        formatDate={formatDate}
      />
      <InvoicePaidAmountSummary
        selectedInvoice={selectedInvoice}
        t={t}
        formatCurrency={formatCurrency}
      />
      <InvoicePurchasesList
        selectedInvoice={selectedInvoice}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />
      <InvoiceAdvancePaymentForm
        invoicePaymentForm={invoicePaymentForm}
        setInvoicePaymentForm={setInvoicePaymentForm}
        invoicePaymentMethodOptions={invoicePaymentMethodOptions}
        transactionPaymentMethods={transactionPaymentMethods}
        t={t}
      />
    </div>
  );
}

function InvoiceDetailsDialog(props: InvoiceDetailsDialogProps) {
  const {
    selectedInvoice,
    setSelectedInvoice,
    isPending,
    t,
    onConfirmAdvance,
  } = props;
  return (
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
          <InvoiceDetailsDialogBody
            {...props}
            selectedInvoice={selectedInvoice}
          />
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedInvoice(null)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={isPending} onClick={onConfirmAdvance}>
            {isPending
              ? t("payments.invoiceAdvanceSaving")
              : t("payments.invoiceAdvanceConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SubscriptionFormState = ReturnType<
  typeof useSubscriptionFormsState
>["subscriptionForm"];
type SetSubscriptionFormState = ReturnType<
  typeof useSubscriptionFormsState
>["setSubscriptionForm"];

type SubscriptionFormFieldsProps = {
  subscriptionForm: SubscriptionFormState;
  setSubscriptionForm: SetSubscriptionFormState;
  t: Translate;
};

function SubscriptionAmountAndDateFields({
  subscriptionForm,
  setSubscriptionForm,
  t,
}: SubscriptionFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <CurrencyInput
          id="subscription-amount"
          label={t("common.amount")}
          value={subscriptionForm.amount}
          onValueChange={(amount) =>
            setSubscriptionForm({ ...subscriptionForm, amount })
          }
          labelClassName="normal-case tracking-normal text-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subscription-next-date">{t("common.next")}</Label>
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
          className="w-full max-w-full min-w-0 appearance-none overflow-hidden pr-3 text-left [&::-webkit-calendar-picker-indicator]:shrink-0 [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:overflow-hidden [&::-webkit-date-and-time-value]:text-left"
        />
      </div>
    </div>
  );
}

function SubscriptionNameAndAmountFields({
  subscriptionForm,
  setSubscriptionForm,
  t,
}: SubscriptionFormFieldsProps) {
  return (
    <>
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
      <SubscriptionAmountAndDateFields
        subscriptionForm={subscriptionForm}
        setSubscriptionForm={setSubscriptionForm}
        t={t}
      />
    </>
  );
}

function SubscriptionCategoryField({
  subscriptionForm,
  setSubscriptionForm,
  categories,
  t,
}: {
  subscriptionForm: SubscriptionFormState;
  setSubscriptionForm: SetSubscriptionFormState;
  categories: PaymentsScreenProps["categories"];
  t: Translate;
}) {
  return (
    <div className="space-y-2">
      <Label>{t("common.category")}</Label>
      <Select
        value={subscriptionForm.category}
        onValueChange={(value) =>
          setSubscriptionForm({ ...subscriptionForm, category: value })
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
  );
}

function SubscriptionPaymentMethodField({
  subscriptionForm,
  setSubscriptionForm,
  transactionPaymentMethods,
  t,
}: {
  subscriptionForm: SubscriptionFormState;
  setSubscriptionForm: SetSubscriptionFormState;
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  t: Translate;
}) {
  return (
    <div className="space-y-2">
      <Label>{t("transaction.paymentMethod")}</Label>
      <Select
        value={subscriptionForm.paymentMethod}
        onValueChange={(value) =>
          setSubscriptionForm({ ...subscriptionForm, paymentMethod: value })
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
  );
}

function SubscriptionCategoryAndMethodFields({
  subscriptionForm,
  setSubscriptionForm,
  categories,
  transactionPaymentMethods,
  t,
}: {
  subscriptionForm: SubscriptionFormState;
  setSubscriptionForm: SetSubscriptionFormState;
  categories: PaymentsScreenProps["categories"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  t: Translate;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SubscriptionCategoryField
        subscriptionForm={subscriptionForm}
        setSubscriptionForm={setSubscriptionForm}
        categories={categories}
        t={t}
      />
      <SubscriptionPaymentMethodField
        subscriptionForm={subscriptionForm}
        setSubscriptionForm={setSubscriptionForm}
        transactionPaymentMethods={transactionPaymentMethods}
        t={t}
      />
    </div>
  );
}

type SubscriptionDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  subscriptionForm: SubscriptionFormState;
  setSubscriptionForm: SetSubscriptionFormState;
  editingSubscription: ReturnType<
    typeof useSubscriptionFormsState
  >["editingSubscription"];
  setEditingSubscription: ReturnType<
    typeof useSubscriptionFormsState
  >["setEditingSubscription"];
  categories: PaymentsScreenProps["categories"];
  transactionPaymentMethods: PaymentsScreenProps["transactionPaymentMethods"];
  isPending: boolean;
  t: Translate;
  onCreate: () => void;
  onUpdate: () => void;
};

function SubscriptionDialogFooter({
  editingSubscription,
  isPending,
  t,
  onCancel,
  onSubmit,
}: {
  editingSubscription: SubscriptionDialogProps["editingSubscription"];
  isPending: boolean;
  t: Translate;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={isPending}>
        {t("common.cancel")}
      </Button>
      <Button onClick={onSubmit} disabled={isPending}>
        {(() => {
          if (isPending) return t("payments.subscriptionCreating");
          return editingSubscription
            ? t("transaction.saveChanges")
            : t("screen.payments.addSubscription");
        })()}
      </Button>
    </DialogFooter>
  );
}

function SubscriptionDialogHeader({
  editingSubscription,
  t,
}: Pick<SubscriptionDialogProps, "editingSubscription" | "t">) {
  return (
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
  );
}

function SubscriptionDialogFields(
  props: Pick<
    SubscriptionDialogProps,
    | "subscriptionForm"
    | "setSubscriptionForm"
    | "categories"
    | "transactionPaymentMethods"
    | "t"
  >,
) {
  return (
    <div className="space-y-4">
      <SubscriptionNameAndAmountFields {...props} />
      <SubscriptionCategoryAndMethodFields {...props} />
    </div>
  );
}

function SubscriptionDialog(props: SubscriptionDialogProps) {
  const {
    isOpen,
    setIsOpen,
    setSubscriptionForm,
    editingSubscription,
    setEditingSubscription,
    categories,
    transactionPaymentMethods,
    isPending,
    t,
    onCreate,
    onUpdate,
  } = props;
  const resetOnClose = () => {
    setEditingSubscription(null);
    setSubscriptionForm(
      buildDefaultSubscriptionForm({ categories, transactionPaymentMethods }),
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetOnClose();
      }}
    >
      <DialogContent className="overflow-y-auto sm:h-[60vh] sm:w-[50vw] sm:max-w-none">
        <SubscriptionDialogHeader
          editingSubscription={editingSubscription}
          t={t}
        />
        <SubscriptionDialogFields {...props} />
        <SubscriptionDialogFooter
          editingSubscription={editingSubscription}
          isPending={isPending}
          t={t}
          onCancel={() => {
            setIsOpen(false);
            resetOnClose();
          }}
          onSubmit={editingSubscription ? onUpdate : onCreate}
        />
      </DialogContent>
    </Dialog>
  );
}

function PaymentMethodDetailsAndCreateDialogs(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  const {
    selectedMonth,
    t,
    formatCurrency,
    formatDate,
    formatSelectedMonth,
    isPending,
    isPaymentMethodDialogOpen,
    setIsPaymentMethodDialogOpen,
    paymentMethodForm,
    setPaymentMethodForm,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleCreatePaymentMethod,
  } = props;

  return (
    <>
      <PaymentMethodDetailsDialog
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        selectedMonth={selectedMonth}
        t={t}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        formatSelectedMonth={formatSelectedMonth}
      />

      <AddPaymentMethodDialog
        isOpen={isPaymentMethodDialogOpen}
        setIsOpen={setIsPaymentMethodDialogOpen}
        paymentMethodForm={paymentMethodForm}
        setPaymentMethodForm={setPaymentMethodForm}
        isPending={isPending}
        t={t}
        onCreate={handleCreatePaymentMethod}
      />
    </>
  );
}

function PaymentMethodEditAndDeleteDialogs(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  const {
    t,
    isPending,
    editingPaymentMethod,
    setEditingPaymentMethod,
    deletingPaymentMethod,
    setDeletingPaymentMethod,
    handleUpdatePaymentMethod,
    handleDeletePaymentMethod,
  } = props;

  return (
    <>
      <EditPaymentMethodDialog
        editingPaymentMethod={editingPaymentMethod}
        setEditingPaymentMethod={setEditingPaymentMethod}
        isPending={isPending}
        t={t}
        onUpdate={handleUpdatePaymentMethod}
      />

      <DeletePaymentMethodAlertDialog
        deletingPaymentMethod={deletingPaymentMethod}
        isPending={isPending}
        t={t}
        onOpenChange={(open) => {
          if (!open) setDeletingPaymentMethod(null);
        }}
        onConfirm={handleDeletePaymentMethod}
      />
    </>
  );
}

function PaymentMethodDialogsGroup(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  return (
    <>
      <PaymentMethodDetailsAndCreateDialogs {...props} />
      <PaymentMethodEditAndDeleteDialogs {...props} />
    </>
  );
}

function InvoiceDetailsDialogWrapper(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  const {
    transactionPaymentMethods,
    t,
    formatCurrency,
    formatDate,
    isPending,
    selectedInvoice,
    setSelectedInvoice,
    invoicePaymentMethodOptions,
    invoicePaymentForm,
    setInvoicePaymentForm,
    handleCreateInvoiceAdvancePayment,
  } = props;

  return (
    <InvoiceDetailsDialog
      selectedInvoice={selectedInvoice}
      setSelectedInvoice={setSelectedInvoice}
      invoicePaymentForm={invoicePaymentForm}
      setInvoicePaymentForm={setInvoicePaymentForm}
      invoicePaymentMethodOptions={invoicePaymentMethodOptions}
      transactionPaymentMethods={transactionPaymentMethods}
      isPending={isPending}
      t={t}
      formatCurrency={formatCurrency}
      formatDate={formatDate}
      onConfirmAdvance={handleCreateInvoiceAdvancePayment}
    />
  );
}

function SubscriptionDialogWrapper(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  const {
    categories,
    transactionPaymentMethods,
    t,
    isPending,
    isSubscriptionDialogOpen,
    setIsSubscriptionDialogOpen,
    subscriptionForm,
    setSubscriptionForm,
    editingSubscription,
    setEditingSubscription,
    handleCreateSubscription,
    handleUpdateSubscription,
  } = props;

  return (
    <SubscriptionDialog
      isOpen={isSubscriptionDialogOpen}
      setIsOpen={setIsSubscriptionDialogOpen}
      subscriptionForm={subscriptionForm}
      setSubscriptionForm={setSubscriptionForm}
      editingSubscription={editingSubscription}
      setEditingSubscription={setEditingSubscription}
      categories={categories}
      transactionPaymentMethods={transactionPaymentMethods}
      isPending={isPending}
      t={t}
      onCreate={handleCreateSubscription}
      onUpdate={handleUpdateSubscription}
    />
  );
}

function InvoiceDetailsAndSubscriptionDialogs(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  return (
    <>
      <InvoiceDetailsDialogWrapper {...props} />
      <SubscriptionDialogWrapper {...props} />
    </>
  );
}

function DeleteSubscriptionDialogWrapper(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  const {
    t,
    isPending,
    deletingSubscription,
    setDeletingSubscription,
    handleDeleteSubscription,
  } = props;

  return (
    <DeleteSubscriptionAlertDialog
      deletingSubscription={deletingSubscription}
      isPending={isPending}
      t={t}
      onOpenChange={(open) => {
        if (!open) setDeletingSubscription(null);
      }}
      onConfirm={handleDeleteSubscription}
    />
  );
}

function InvoiceAndSubscriptionDialogsGroup(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  return (
    <>
      <InvoiceDetailsAndSubscriptionDialogs {...props} />
      <DeleteSubscriptionDialogWrapper {...props} />
    </>
  );
}

function PaymentsScreenDialogsSection(
  props: PaymentsScreenProps & PaymentsScreenState,
) {
  return (
    <>
      <PaymentMethodDialogsGroup {...props} />
      <InvoiceAndSubscriptionDialogsGroup {...props} />
    </>
  );
}
