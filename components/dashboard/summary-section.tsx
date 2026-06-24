"use client";

import { useState } from "react";
import { SummaryCards } from "./summary-cards";
import { AddTransactionDialog } from "./add-transaction-dialog";
import type {
  CreateCategoryInput,
  CreatePaymentMethodInput,
  SummaryData,
  TransactionFormCategory,
  TransactionFormPaymentMethod,
} from "@/lib/finance/transactions";
import type { TransactionFormData } from "./transaction-form";

interface SummarySectionProps {
  summaryData: SummaryData;
  categories: TransactionFormCategory[];
  paymentMethods: TransactionFormPaymentMethod[];
  createCategoryAction?: (data: CreateCategoryInput) => Promise<void>;
  createPaymentMethodAction?: (data: CreatePaymentMethodInput) => Promise<void>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

export function SummarySection({
  summaryData,
  categories,
  paymentMethods,
  createCategoryAction,
  createPaymentMethodAction,
  onSubmit,
}: SummarySectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <SummaryCards
        summaryData={summaryData}
        onAddTransaction={() => setDialogOpen(true)}
      />
      <AddTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        paymentMethods={paymentMethods}
        createCategoryAction={createCategoryAction}
        createPaymentMethodAction={createPaymentMethodAction}
        onSubmit={onSubmit}
      />
    </>
  );
}
