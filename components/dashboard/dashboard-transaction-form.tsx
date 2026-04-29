"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  NewTransactionForm,
  type NewTransactionFormData,
} from "@/components/dashboard/new-transaction-form";
import { toast } from "sonner";

export function DashboardTransactionForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: NewTransactionFormData) => {
    setIsLoading(true);
    try {
      // TODO: Save to Supabase
      console.log("New transaction:", data);
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
      onSubmit={handleSubmit}
      isLoading={isLoading}
      compact={true}
    />
  );
}
