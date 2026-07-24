import { describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const {
  advanceInstallments,
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
  previewInstallmentPrepayment,
  setSubscriptionPaused,
  updateCategory,
  updatePaymentMethod,
  updateSubscription,
  updateTransaction,
} = vi.hoisted(() => ({
  advanceInstallments: vi.fn().mockResolvedValue(undefined),
  createCategory: vi.fn().mockResolvedValue(undefined),
  createInvoiceAdvancePayment: vi.fn().mockResolvedValue(undefined),
  createPaymentMethod: vi.fn().mockResolvedValue(undefined),
  createSubscription: vi.fn().mockResolvedValue(undefined),
  createTransaction: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  deleteInstallments: vi.fn().mockResolvedValue(undefined),
  deletePaymentMethod: vi.fn().mockResolvedValue(undefined),
  deleteSubscription: vi.fn().mockResolvedValue(undefined),
  deleteSubscriptionOccurrences: vi.fn().mockResolvedValue(undefined),
  deleteTransaction: vi.fn().mockResolvedValue(undefined),
  previewInstallmentPrepayment: vi.fn().mockResolvedValue({
    count: 1,
    installments: [],
    targetMonth: "2026-07",
    totalAmount: 0,
  }),
  setSubscriptionPaused: vi.fn().mockResolvedValue(undefined),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  updatePaymentMethod: vi.fn().mockResolvedValue(undefined),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
  updateTransaction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/finance/transactions", () => ({
  advanceInstallments,
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
  previewInstallmentPrepayment,
  setSubscriptionPaused,
  updateCategory,
  updatePaymentMethod,
  updateSubscription,
  updateTransaction,
}));

import {
  advanceInstallmentsAction,
  createCategoryAction,
  createInvoiceAdvancePaymentAction,
  createPaymentMethodAction,
  createSubscriptionAction,
  createTransactionAction,
  deleteCategoryAction,
  deleteInstallmentsAction,
  deletePaymentMethodAction,
  deleteSubscriptionAction,
  deleteSubscriptionOccurrencesAction,
  deleteTransactionAction,
  pauseSubscriptionAction,
  previewInstallmentPrepaymentAction,
  resumeSubscriptionAction,
  updateCategoryAction,
  updatePaymentMethodAction,
  updateSubscriptionAction,
  updateTransactionAction,
} from "@/app/transactions/actions";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("createTransactionAction", () => {
  it("accepts investment (saving) transactions", async () => {
    await createTransactionAction({
      amount: 100,
      category: "some-category-id",
      date: "2026-07-07",
      description: "Aporte",
      installmentCount: 1,
      notes: "monthly contribution",
      paymentMethod: "some-payment-method-id",
      type: "saving",
    });

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "some-category-id",
        paymentMethod: "some-payment-method-id",
        type: "saving",
      }),
    );
  });

  it("falls back to 'none' when category/paymentMethod are blank", async () => {
    await createTransactionAction({
      amount: 50,
      category: "",
      date: "2026-07-07",
      description: "Sem categoria",
      installmentCount: 1,
      paymentMethod: "",
      type: "expense",
    });

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ category: "none", paymentMethod: "none" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
  });
});

describe("createCategoryAction / updateCategoryAction / deleteCategoryAction", () => {
  it("creates a category", async () => {
    await createCategoryAction({
      group: "needs",
      icon: "🏠",
      monthlyLimit: 500,
      name: "Rent",
    });

    expect(createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Rent" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/categories");
  });

  it("updates a category", async () => {
    await updateCategoryAction({
      id: uuid,
      group: "wants",
      icon: "🎬",
      name: "Fun",
    });

    expect(updateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: uuid, name: "Fun" }),
    );
  });

  it("deletes a category", async () => {
    await deleteCategoryAction(uuid);

    expect(deleteCategory).toHaveBeenCalledWith(uuid);
    expect(revalidatePath).toHaveBeenCalledWith("/categories");
  });
});

describe("createInvoiceAdvancePaymentAction", () => {
  it("forwards the payment method when provided", async () => {
    await createInvoiceAdvancePaymentAction({
      amount: 100,
      date: "2026-07-07",
      invoiceId: `credit-card-invoice:${uuid}:2026-07`,
      paymentMethod: "pm-card",
    });

    expect(createInvoiceAdvancePayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: "pm-card" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/payments");
  });

  it("falls back to 'none' when the payment method is blank", async () => {
    await createInvoiceAdvancePaymentAction({
      amount: 100,
      date: "2026-07-07",
      invoiceId: `credit-card-invoice:${uuid}:2026-07`,
      paymentMethod: "",
    });

    expect(createInvoiceAdvancePayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: "none" }),
    );
  });
});

describe("createSubscriptionAction / updateSubscriptionAction", () => {
  it("creates a subscription with real category/payment method ids", async () => {
    await createSubscriptionAction({
      amount: 30,
      category: "cat-wants",
      description: "Streaming",
      nextDate: "2026-08-01",
      paymentMethod: "pm-card",
    });

    expect(createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ category: "cat-wants", paymentMethod: "pm-card" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/payments");
  });

  it("creates a subscription falling back to 'none' when blank", async () => {
    await createSubscriptionAction({
      amount: 30,
      category: "",
      description: "Streaming",
      nextDate: "2026-08-01",
      paymentMethod: "",
    });

    expect(createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ category: "none", paymentMethod: "none" }),
    );
  });

  it("updates a subscription with real category/payment method ids", async () => {
    await updateSubscriptionAction({
      id: uuid,
      amount: 30,
      category: "cat-wants",
      description: "Streaming",
      nextDate: "2026-08-01",
      paymentMethod: "pm-card",
    });

    expect(updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ category: "cat-wants", paymentMethod: "pm-card" }),
    );
  });

  it("updates a subscription falling back to 'none' when blank", async () => {
    await updateSubscriptionAction({
      id: uuid,
      amount: 30,
      category: "",
      description: "Streaming",
      nextDate: "2026-08-01",
      paymentMethod: "",
    });

    expect(updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ category: "none", paymentMethod: "none" }),
    );
  });
});

describe("subscription lifecycle actions", () => {
  it("pauses a subscription", async () => {
    await pauseSubscriptionAction(uuid);

    expect(setSubscriptionPaused).toHaveBeenCalledWith(uuid, true);
  });

  it("resumes a subscription", async () => {
    await resumeSubscriptionAction(uuid);

    expect(setSubscriptionPaused).toHaveBeenCalledWith(uuid, false);
  });

  it("deletes a subscription", async () => {
    await deleteSubscriptionAction(uuid);

    expect(deleteSubscription).toHaveBeenCalledWith(uuid);
  });
});

describe("payment method actions", () => {
  it("creates a payment method", async () => {
    await createPaymentMethodAction({
      name: "Card",
      type: "credit",
    });

    expect(createPaymentMethod).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/payments");
  });

  it("updates a payment method", async () => {
    await updatePaymentMethodAction({
      id: uuid,
      name: "Card",
      type: "credit",
    });

    expect(updatePaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({ id: uuid }),
    );
  });

  it("deletes a payment method", async () => {
    await deletePaymentMethodAction(uuid);

    expect(deletePaymentMethod).toHaveBeenCalledWith(uuid);
  });
});

describe("updateTransactionAction / deleteTransactionAction", () => {
  it("updates a transaction with real category/payment method ids", async () => {
    await updateTransactionAction({
      id: uuid,
      amount: 100,
      category: "cat-wants",
      date: "2026-07-07",
      description: "Updated",
      paymentMethod: "pm-card",
      type: "expense",
    });

    expect(updateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ category: "cat-wants", paymentMethod: "pm-card" }),
    );
  });

  it("updates a transaction falling back to 'none' when blank", async () => {
    await updateTransactionAction({
      id: uuid,
      amount: 100,
      category: "",
      date: "2026-07-07",
      description: "Updated",
      paymentMethod: "",
      type: "expense",
    });

    expect(updateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ category: "none", paymentMethod: "none" }),
    );
  });

  it("deletes a transaction", async () => {
    await deleteTransactionAction(uuid);

    expect(deleteTransaction).toHaveBeenCalledWith(uuid);
  });
});

describe("installment actions", () => {
  it("deletes installments with the given scope", async () => {
    await deleteInstallmentsAction({ scope: "single", transactionId: uuid });

    expect(deleteInstallments).toHaveBeenCalledWith({
      scope: "single",
      transactionId: uuid,
    });
  });

  it("advances installments", async () => {
    await advanceInstallmentsAction({
      targetMonth: "2026-07",
      transactionId: uuid,
    });

    expect(advanceInstallments).toHaveBeenCalledWith(
      expect.objectContaining({ targetMonth: "2026-07", transactionId: uuid }),
    );
  });

  it("previews an installment prepayment and returns the preview", async () => {
    const preview = await previewInstallmentPrepaymentAction({
      targetMonth: "2026-07",
      transactionId: uuid,
    });

    expect(previewInstallmentPrepayment).toHaveBeenCalledWith(
      expect.objectContaining({ targetMonth: "2026-07", transactionId: uuid }),
    );
    expect(preview).toEqual({
      count: 1,
      installments: [],
      targetMonth: "2026-07",
      totalAmount: 0,
    });
  });
});

describe("deleteSubscriptionOccurrencesAction", () => {
  it("deletes subscription occurrences with the given scope", async () => {
    await deleteSubscriptionOccurrencesAction({
      scope: "single",
      transactionId: uuid,
    });

    expect(deleteSubscriptionOccurrences).toHaveBeenCalledWith({
      scope: "single",
      transactionId: uuid,
    });
  });
});
