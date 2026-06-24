"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionForm, type TransactionFormData } from "./transaction-form";
import type {
  CreateCategoryInput,
  CreatePaymentMethodInput,
  TransactionFormCategory,
  TransactionFormPaymentMethod,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TransactionFormCategory[];
  paymentMethods: TransactionFormPaymentMethod[];
  createCategoryAction?: (data: CreateCategoryInput) => Promise<void>;
  createPaymentMethodAction?: (data: CreatePaymentMethodInput) => Promise<void>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  categories,
  paymentMethods,
  createCategoryAction,
  createPaymentMethodAction,
  onSubmit,
}: AddTransactionDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90dvw] max-w-[90dvw] sm:max-w-[90dvw] overflow-x-hidden overflow-y-auto max-h-[90dvh] lg:w-[90dvw] lg:max-w-none lg:max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>{t("transaction.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("transaction.addDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 w-full overflow-x-hidden">
          <TransactionForm
            categories={categories}
            paymentMethods={paymentMethods}
            createCategoryAction={createCategoryAction}
            createPaymentMethodAction={createPaymentMethodAction}
            onSubmit={async (data) => {
              await onSubmit(data);
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
