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
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: NewTransactionFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      toast.success("Transaction recorded successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to record transaction");
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
