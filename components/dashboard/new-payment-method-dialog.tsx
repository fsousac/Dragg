"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Plus, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export function NewPaymentMethodDialog({
  children,
  createPaymentMethodAction,
  onCreated,
  open: controlledOpen,
  onOpenChange,
}: NewPaymentMethodDialogProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CreatePaymentMethodInput["type"]>("debit");
  const [creditLimit, setCreditLimit] = useState("");
  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    setInternalOpen(nextOpen);
  };

  useEffect(() => {
    if (open) {
      setName("");
      setType("debit");
      setCreditLimit("");
    }
  }, [open]);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
        creditLimit:
          type === "credit" ? parseCurrencyInput(creditLimit) : undefined,
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

          <div className="space-y-2">
            <Label>{t("paymentMethod.type")}</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                setType(v as CreatePaymentMethodInput["type"])
              }
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

          {type === "credit" ? (
            <div className="space-y-2">
              <Label htmlFor="credit-limit">
                {t("paymentMethod.creditLimit")}
              </Label>
              <Input
                id="credit-limit"
                inputMode="decimal"
                pattern="[0-9]*[,.]?[0-9]*"
                placeholder="0,00"
                value={creditLimit}
                onChange={(e) =>
                  setCreditLimit(sanitizeCurrencyInput(e.target.value))
                }
              />
            </div>
          ) : null}

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
        </form>
      </DialogContent>
    </Dialog>
  );
}
