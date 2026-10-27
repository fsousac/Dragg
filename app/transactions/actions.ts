"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  advanceInstallments,
  amortizeDebt,
  createCategory,
  createInvoiceAdvancePayment,
  createPaymentMethod,
  createSubscription,
  createTransaction,
  deleteCategory,
  deleteInstallments,
  deletePaymentMethod,
  deleteSubscription,
  deleteSubscriptionOccurrences,
  deleteTransaction,
  getFinancingBreakdown,
  getFundingContext,
  listGoals,
  previewInstallmentPrepayment,
  replaceTransaction,
  setSubscriptionPaused,
  type CreateCategoryInput,
  type CreateInvoiceAdvancePaymentInput,
  type CreatePaymentMethodInput,
  type CreateSubscriptionInput,
  type AdvanceInstallmentsInput,
  type AmortizeDebtInput,
  type DeleteInstallmentsInput,
  type DeleteSubscriptionOccurrencesInput,
  type NewTransactionInput,
  type UpdateCategoryInput,
  type UpdatePaymentMethodInput,
  type UpdateSubscriptionInput,
  updateCategory,
  updatePaymentMethod,
  updateSubscription,
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

const financingSchema = z
  .object({
    downPayment: z.number().finite().min(0).max(1_000_000_000).default(0),
    fees: z.number().finite().min(0).max(1_000_000_000).default(0),
    installmentAmount: z.number().finite().positive().max(1_000_000_000).optional(),
    interestSystem: z.enum(["simple", "price", "sac"]),
    operationType: z.enum(["purchase", "loan"]),
    rate: z.number().finite().min(0).max(1000).optional(),
    rateInputMode: z.enum(["rate", "installment"]),
    ratePeriod: z.enum(["monthly", "annual"]),
  })
  .strict();

type FinancingActionInput = z.infer<typeof financingSchema>;

// Cross-field rules the per-field schema cannot express.
function getFinancingIssues(
  financing: FinancingActionInput,
  data: { amount: number; type: string },
) {
  const issues: string[] = [];

  if (data.type !== "expense") issues.push("Financing requires an expense");
  if (financing.downPayment >= data.amount) issues.push("Down payment too high");
  if (financing.operationType === "loan" && financing.downPayment > 0) {
    issues.push("Loans have no down payment");
  }
  if (financing.rateInputMode === "rate") {
    if (financing.rate == null) issues.push("Rate required");
    return issues;
  }
  if (financing.interestSystem !== "price") {
    issues.push("Installment mode requires Price");
  }
  if (financing.installmentAmount == null) {
    issues.push("Installment amount required");
  }
  return issues;
}

const createTransactionActionSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
    category: z.string().trim().min(0).max(64),
    date: dateSchema,
    description: safeShortTextSchema,
    financing: financingSchema.optional(),
    goalId: uuidSchema.optional(),
    installmentCount: z.number().int().min(1).max(120),
    notes: safeOptionalNotesSchema,
    paymentMethod: z.string().trim().min(0).max(64),
    savingsFundedAmount: z.number().finite().min(0).max(1_000_000_000).optional(),
    type: z.enum(["income", "expense", "saving"]),
  })
  .strict()
  .superRefine((data, context) => {
    const issues = data.financing
      ? getFinancingIssues(data.financing, data)
      : [];

    // With interest the rows sum past the amount; the allocation checks that.
    if (
      !data.financing &&
      data.savingsFundedAmount != null &&
      data.savingsFundedAmount > data.amount
    ) {
      issues.push("Savings funded amount exceeds the amount");
    }

    if (
      data.goalId &&
      (data.type !== "expense" || data.financing?.operationType === "loan")
    ) {
      issues.push("Only expenses can be linked to a goal");
    }

    for (const message of issues) {
      context.addIssue({ code: "custom", message });
    }
  });

const replaceTransactionActionSchema = z
  .object({
    id: uuidSchema,
    transaction: createTransactionActionSchema,
  })
  .strict();

const createSubscriptionActionSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
    category: z.string().trim().min(0).max(64),
    description: safeShortTextSchema,
    nextDate: dateSchema,
    paymentMethod: z.string().trim().min(0).max(64),
  })
  .strict();

const updateSubscriptionActionSchema = createSubscriptionActionSchema
  .extend({
    id: uuidSchema,
  })
  .strict();

const updateCategoryActionSchema = createCategoryActionSchema
  .extend({
    id: uuidSchema,
  })
  .strict();

const updatePaymentMethodActionSchema = z
  .object({
    creditLimit: z.number().finite().min(0).max(1_000_000_000).optional(),
    closingDay: z.number().int().min(1).max(31).nullable().optional(),
    dueDay: z.number().int().min(1).max(31).nullable().optional(),
    id: uuidSchema,
    name: safeShortTextSchema,
    type: z.enum(["bank", "boleto", "credit", "debit", "other"]),
  })
  .strict();

const createPaymentMethodActionSchema = updatePaymentMethodActionSchema
  .omit({ id: true })
  .strict();

const createInvoiceAdvancePaymentActionSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
    date: dateSchema,
    invoiceId: z
      .string()
      .trim()
      .regex(
        /^credit-card-invoice:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:\d{4}-\d{2}$/i,
        "Invalid invoice",
      ),
    paymentMethod: z.string().trim().min(0).max(64),
  })
  .strict();

const updateTransactionActionSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
    category: z.string().trim().min(0).max(64),
    date: dateSchema,
    description: safeShortTextSchema,
    goalId: uuidSchema.nullable().optional(),
    id: uuidSchema,
    notes: safeOptionalNotesSchema,
    paymentMethod: z.string().trim().min(0).max(64),
    type: z.enum(["expense", "income", "saving"]),
  })
  .strict();

const deleteInstallmentsActionSchema = z
  .object({
    scope: z.enum(["single", "this_and_following", "all"]),
    transactionId: uuidSchema,
  })
  .strict();

const advanceInstallmentsActionSchema = z
  .object({
    scope: z.enum(["remaining", "selected_and_remaining"]).optional(),
    targetMonth: z.string().trim().regex(/^\d{4}-\d{2}$/, "Invalid month"),
    transactionId: uuidSchema,
  })
  .strict();

const deleteSubscriptionOccurrencesActionSchema = z
  .object({
    scope: z.enum(["single", "this_and_following_unpaid"]),
    transactionId: uuidSchema,
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

export async function updateCategoryAction(data: UpdateCategoryInput) {
  const parsed = updateCategoryActionSchema.parse(data);

  await updateCategory(parsed);

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
}

export async function deleteCategoryAction(categoryId: string) {
  const parsedCategoryId = uuidSchema.parse(categoryId);

  await deleteCategory(parsedCategoryId);

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

export async function createInvoiceAdvancePaymentAction(
  data: CreateInvoiceAdvancePaymentInput,
) {
  const parsed = createInvoiceAdvancePaymentActionSchema.parse(data);

  await createInvoiceAdvancePayment({
    ...parsed,
    paymentMethod: parsed.paymentMethod || "none",
  });

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
}

export async function createSubscriptionAction(data: CreateSubscriptionInput) {
  const parsed = createSubscriptionActionSchema.parse(data);

  await createSubscription({
    ...parsed,
    category: parsed.category || "none",
    paymentMethod: parsed.paymentMethod || "none",
  });

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
}

export async function updateSubscriptionAction(data: UpdateSubscriptionInput) {
  const parsed = updateSubscriptionActionSchema.parse(data);

  await updateSubscription({
    ...parsed,
    category: parsed.category || "none",
    paymentMethod: parsed.paymentMethod || "none",
  });

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
}

export async function pauseSubscriptionAction(subscriptionId: string) {
  const parsedSubscriptionId = uuidSchema.parse(subscriptionId);

  await setSubscriptionPaused(parsedSubscriptionId, true);

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
}

export async function resumeSubscriptionAction(subscriptionId: string) {
  const parsedSubscriptionId = uuidSchema.parse(subscriptionId);

  await setSubscriptionPaused(parsedSubscriptionId, false);

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
}

export async function deleteSubscriptionAction(subscriptionId: string) {
  const parsedSubscriptionId = uuidSchema.parse(subscriptionId);

  await deleteSubscription(parsedSubscriptionId);

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
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

export async function createPaymentMethodAction(
  data: CreatePaymentMethodInput,
) {
  const parsed = createPaymentMethodActionSchema.parse(data);

  await createPaymentMethod(parsed);

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

export async function replaceTransactionAction(data: {
  id: string;
  transaction: NewTransactionInput;
}) {
  const { id, transaction } = replaceTransactionActionSchema.parse(data);

  await replaceTransaction(id, {
    ...transaction,
    category: transaction.category || "none",
    paymentMethod: transaction.paymentMethod || "none",
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

export async function deleteInstallmentsAction(data: DeleteInstallmentsInput) {
  const parsed = deleteInstallmentsActionSchema.parse(data);

  await deleteInstallments(parsed);

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
}

export async function advanceInstallmentsAction(data: AdvanceInstallmentsInput) {
  const parsed = advanceInstallmentsActionSchema.parse(data);

  await advanceInstallments(parsed);

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
}

export async function previewInstallmentPrepaymentAction(
  data: AdvanceInstallmentsInput,
) {
  const parsed = advanceInstallmentsActionSchema.parse(data);

  return previewInstallmentPrepayment(parsed);
}

export async function deleteSubscriptionOccurrencesAction(
  data: DeleteSubscriptionOccurrencesInput,
) {
  const parsed = deleteSubscriptionOccurrencesActionSchema.parse(data);

  await deleteSubscriptionOccurrences(parsed);

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/transactions");
}

const amortizeDebtActionSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
    description: safeShortTextSchema,
    mode: z.enum(["installment", "term"]),
    planId: uuidSchema,
    source: z.enum(["savings", "balance"]),
  })
  .strict();

export async function amortizeDebtAction(data: AmortizeDebtInput) {
  await amortizeDebt(amortizeDebtActionSchema.parse(data));

  revalidatePath("/dashboard");
  revalidatePath("/debts");
  revalidatePath("/transactions");
}

export async function getFinancingBreakdownAction(planId: string) {
  return getFinancingBreakdown(uuidSchema.parse(planId));
}

export async function getFundingContextAction() {
  return getFundingContext();
}

// Goals the advanced options can link an expense to; ownership is enforced
// again by createTransaction.
export async function getGoalOptionsAction() {
  const goals = await listGoals();
  return goals.map(({ id, name, icon }) => ({ id, name, icon }));
}
