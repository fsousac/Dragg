"use server";

import { revalidatePath } from "next/cache";

import { createTransaction, type NewTransactionInput } from "@/lib/finance/transactions";

export async function createTransactionAction(data: NewTransactionInput) {
  await createTransaction(data);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
}
