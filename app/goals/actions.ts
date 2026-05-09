"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  addGoalFunds,
  createGoal,
  deleteGoal,
  type CreateGoalInput,
  type UpdateGoalInput,
  updateGoal,
} from "@/lib/finance/transactions";

const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Invalid UUID",
  );

const goalSchema = z
  .object({
    color: z.string().trim().regex(/^#[0-9a-f]{6}$/i),
    currentAmount: z.number().finite().min(0).max(1_000_000_000).optional(),
    deadline: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    icon: z.string().trim().min(1).max(32),
    name: z.string().trim().min(1).max(160),
    targetAmount: z.number().finite().positive().max(1_000_000_000),
  })
  .strict();

const updateGoalSchema = goalSchema.extend({ id: uuidSchema }).strict();

export async function createGoalAction(data: CreateGoalInput) {
  const parsed = goalSchema.parse(data);
  await createGoal(parsed);
  revalidatePath("/dashboard");
  revalidatePath("/goals");
}

export async function updateGoalAction(data: UpdateGoalInput) {
  const parsed = updateGoalSchema.parse(data);
  await updateGoal(parsed);
  revalidatePath("/dashboard");
  revalidatePath("/goals");
}

export async function addGoalFundsAction(goalId: string, amount: number) {
  const parsedGoalId = uuidSchema.parse(goalId);
  const parsedAmount = z.number().finite().positive().max(1_000_000_000).parse(amount);
  await addGoalFunds(parsedGoalId, parsedAmount);
  revalidatePath("/dashboard");
  revalidatePath("/goals");
}

export async function deleteGoalAction(goalId: string) {
  const parsedGoalId = uuidSchema.parse(goalId);
  await deleteGoal(parsedGoalId);
  revalidatePath("/dashboard");
  revalidatePath("/goals");
}
