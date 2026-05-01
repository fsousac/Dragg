"use server";

import { revalidatePath } from "next/cache";

import {
  createTransaction,
  deleteTransaction,
  type NewTransactionInput,
  updateTransaction,
  type UpdateTransactionInput,
} from "@/lib/finance/transactions";

export async function createTransactionAction(data: NewTransactionInput) {
  await createTransaction(data);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
}

export async function updateTransactionAction(data: UpdateTransactionInput) {
  await updateTransaction(data);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function deleteTransactionAction(transactionId: string) {
  await deleteTransaction(transactionId);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}
