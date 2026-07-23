"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { type CreatePaymentMethodInput } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

type NewPaymentMethodDialogProps = {
  children?: ReactNode;
  createPaymentMethodAction: (data: CreatePaymentMethodInput) => Promise<void>;
  onCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const paymentTypes = ["debit", "credit", "bank", "boleto", "other"] as const;

function useControlledOpen(
  controlledOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    setInternalOpen(nextOpen);
  };

  return { open, setOpen };
}

function usePaymentMethodDialogFields(open: boolean) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CreatePaymentMethodInput["type"]>("debit");
  const [closingDay, setClosingDay] = useState("");
  const [creditLimit, setCreditLimit] = useState(0);
  const [dueDay, setDueDay] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setType("debit");
      setClosingDay("");
      setCreditLimit(0);
      setDueDay("");
    }
  }, [open]);

  return {
    name,
    setName,
    type,
    setType,
    closingDay,
    setClosingDay,
    creditLimit,
    setCreditLimit,
    dueDay,
    setDueDay,
  };
}

type PaymentMethodDialogFields = ReturnType<typeof usePaymentMethodDialogFields>;

function useCreatePaymentMethodSubmit({
  fields,
  setOpen,
  setIsSaving,
  createPaymentMethodAction,
  onCreated,
  router,
  t,
}: {
  fields: PaymentMethodDialogFields;
  setOpen: (open: boolean) => void;
  setIsSaving: (value: boolean) => void;
  createPaymentMethodAction: NewPaymentMethodDialogProps["createPaymentMethodAction"];
  onCreated?: () => void;
  router: ReturnType<typeof useRouter>;
  t: (key: string) => string;
}) {
  const { name, type, closingDay, creditLimit, dueDay } = fields;

  return async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submittedName = name.trim();
    if (!submittedName) {
      toast.error(t("paymentMethod.createValidationError"));
      return;
    }

    setIsSaving(true);
    try {
      await createPaymentMethodAction({
        name: submittedName,
        type: type,
        creditLimit: type === "credit" ? creditLimit : undefined,
        closingDay:
          type === "credit" && closingDay ? Number(closingDay) : undefined,
        dueDay: type === "credit" && dueDay ? Number(dueDay) : undefined,
      });

      toast.success(t("paymentMethod.createSuccess"));
      setOpen(false);
      onCreated?.();
      router.refresh();
    } catch (err) {
      console.error("Error creating payment method:", err);
      toast.error(t("paymentMethod.createError"));
    } finally {
      setIsSaving(false);
    }
  };
}

function PaymentMethodNameField({
  name,
  setName,
  t,
}: Pick<PaymentMethodDialogFields, "name" | "setName"> & {
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="payment-name">{t("common.name")}</Label>
      <Input
        id="payment-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("paymentMethod.namePlaceholder")}
        autoComplete="off"
      />
    </div>
  );
}

function PaymentMethodTypeField({
  type,
  setType,
  t,
}: Pick<PaymentMethodDialogFields, "type" | "setType"> & {
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-2">
      <Label>{t("paymentMethod.type")}</Label>
      <Select
        value={type}
        onValueChange={(v) => setType(v as CreatePaymentMethodInput["type"])}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentTypes.map((pt) => (
            <SelectItem key={pt} value={pt}>
              {t(`transaction.paymentMethods.${pt}`) || pt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DayNumberField({
  id,
  labelKey,
  placeholder,
  value,
  onChange,
  t,
}: {
  id: string;
  labelKey: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      <Input
        id={id}
        inputMode="numeric"
        max="31"
        min="1"
        placeholder={placeholder}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PaymentMethodCreditFields({
  creditLimit,
  setCreditLimit,
  closingDay,
  setClosingDay,
  dueDay,
  setDueDay,
  t,
}: Pick<
  PaymentMethodDialogFields,
  "creditLimit" | "setCreditLimit" | "closingDay" | "setClosingDay" | "dueDay" | "setDueDay"
> & { t: (key: string) => string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <CurrencyInput
          id="credit-limit"
          label={t("paymentMethod.creditLimit")}
          value={creditLimit}
          onValueChange={setCreditLimit}
          labelClassName="normal-case tracking-normal text-foreground"
        />
      </div>
      <DayNumberField
        id="credit-closing-day"
        labelKey="payments.closingDay"
        placeholder="7"
        value={closingDay}
        onChange={setClosingDay}
        t={t}
      />
      <DayNumberField
        id="credit-due-day"
        labelKey="payments.dueDay"
        placeholder="14"
        value={dueDay}
        onChange={setDueDay}
        t={t}
      />
    </div>
  );
}

function PaymentMethodDialogFooter({
  isSaving,
  setOpen,
  t,
}: {
  isSaving: boolean;
  setOpen: (open: boolean) => void;
  t: (key: string) => string;
}) {
  return (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={isSaving}
      >
        {t("common.cancel")}
      </Button>
      <Button type="submit" disabled={isSaving}>
        <Plus className="size-4" />
        {isSaving ? t("paymentMethod.saving") : t("paymentMethod.create")}
      </Button>
    </DialogFooter>
  );
}

export function NewPaymentMethodDialog({
  children,
  createPaymentMethodAction,
  onCreated,
  open: controlledOpen,
  onOpenChange,
}: NewPaymentMethodDialogProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);
  const { open, setOpen } = useControlledOpen(controlledOpen, onOpenChange);
  const fields = usePaymentMethodDialogFields(open);

  const handleSubmit = useCreatePaymentMethodSubmit({
    fields,
    setOpen,
    setIsSaving,
    createPaymentMethodAction,
    onCreated,
    router,
    t,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="overflow-y-auto sm:h-[50vh] sm:w-[40vw] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{t("screen.payments.newPayment")}</DialogTitle>
          <DialogDescription>
            {t("paymentMethod.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentMethodNameField {...fields} t={t} />
          <PaymentMethodTypeField {...fields} t={t} />

          {fields.type === "credit" ? (
            <PaymentMethodCreditFields {...fields} t={t} />
          ) : null}

          <PaymentMethodDialogFooter
            isSaving={isSaving}
            setOpen={setOpen}
            t={t}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
