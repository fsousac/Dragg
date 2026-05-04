"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createCategory,
  createTransaction,
  deletePaymentMethod,
  deleteTransaction,
  type CreateCategoryInput,
  type NewTransactionInput,
  type UpdatePaymentMethodInput,
  updatePaymentMethod,
  updateTransaction,
  type UpdateTransactionInput,
} from "@/lib/finance/transactions";

const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Invalid UUID",
  );

const safeShortTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: "Invalid control characters",
  });

const safeOptionalNotesSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: "Invalid control characters",
  })
  .optional();

const dateSchema = z
  .string()
  .trim()
  .regex(/^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/, "Invalid date");

const createCategoryActionSchema = z
  .object({
    group: z.enum(["needs", "wants", "savings"]),
    icon: z.string().trim().max(32),
    monthlyLimit: z.number().finite().min(0).max(1_000_000_000).optional(),
    name: safeShortTextSchema,
  })
  .strict();

const createTransactionActionSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
    category: z.string().trim().min(0).max(64),
    date: dateSchema,
    description: safeShortTextSchema,
    installmentCount: z.number().int().min(1).max(120),
    notes: safeOptionalNotesSchema,
    paymentMethod: z.string().trim().min(0).max(64),
    type: z.enum(["income", "expense"]),
  })
  .strict();

const updatePaymentMethodActionSchema = z
  .object({
    id: uuidSchema,
    name: safeShortTextSchema,
    type: z.enum(["bank", "credit", "debit"]),
  })
  .strict();

const updateTransactionActionSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
    category: z.string().trim().min(0).max(64),
    date: dateSchema,
    description: safeShortTextSchema,
    id: uuidSchema,
    notes: safeOptionalNotesSchema,
    paymentMethod: z.string().trim().min(0).max(64),
    type: z.enum(["expense", "income", "saving"]),
  })
  .strict();

export async function createCategoryAction(data: CreateCategoryInput) {
  const parsed = createCategoryActionSchema.parse(data);

  await createCategory(parsed);

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
}

export async function createTransactionAction(data: NewTransactionInput) {
  const parsed = createTransactionActionSchema.parse(data);

  await createTransaction({
    ...parsed,
    category: parsed.category || "none",
    paymentMethod: parsed.paymentMethod || "none",
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
}

export async function updatePaymentMethodAction(
  data: UpdatePaymentMethodInput,
) {
  const parsed = updatePaymentMethodActionSchema.parse(data);

  await updatePaymentMethod(parsed);

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
}

export async function deletePaymentMethodAction(paymentMethodId: string) {
  const parsedPaymentMethodId = uuidSchema.parse(paymentMethodId);

  await deletePaymentMethod(parsedPaymentMethodId);

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
}

export async function updateTransactionAction(data: UpdateTransactionInput) {
  const parsed = updateTransactionActionSchema.parse(data);

  await updateTransaction({
    ...parsed,
    category: parsed.category || "none",
    paymentMethod: parsed.paymentMethod || "none",
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function deleteTransactionAction(transactionId: string) {
  const parsedTransactionId = uuidSchema.parse(transactionId);

  await deleteTransaction(parsedTransactionId);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}
