"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  NewTransactionForm,
  type NewTransactionFormData,
} from "@/components/dashboard/new-transaction-form";
import {
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type DashboardTransactionFormProps = {
  categories: TransactionFormCategory[];
  onSubmit: (data: NewTransactionFormData) => Promise<void>;
  paymentMethods: TransactionFormPaymentMethod[];
};

export function DashboardTransactionForm({
  categories,
  onSubmit,
  paymentMethods,
}: DashboardTransactionFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: NewTransactionFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      toast.success(t("transaction.recordSuccess"));
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("transaction.recordError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NewTransactionForm
      categories={categories}
      onSubmit={handleSubmit}
      paymentMethods={paymentMethods}
      isLoading={isLoading}
      compact={true}
    />
  );
}
