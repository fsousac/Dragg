import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createTransaction } = vi.hoisted(() => ({
  createTransaction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/finance/transactions", () => ({
  advanceInstallments: vi.fn(),
  createCategory: vi.fn(),
  createInvoiceAdvancePayment: vi.fn(),
  createPaymentMethod: vi.fn(),
  createSubscription: vi.fn(),
  createTransaction,
  deleteCategory: vi.fn(),
  deleteInstallments: vi.fn(),
  deletePaymentMethod: vi.fn(),
  deleteSubscription: vi.fn(),
  deleteSubscriptionOccurrences: vi.fn(),
  deleteTransaction: vi.fn(),
  previewInstallmentPrepayment: vi.fn(),
  setSubscriptionPaused: vi.fn(),
  updateCategory: vi.fn(),
  updatePaymentMethod: vi.fn(),
  updateSubscription: vi.fn(),
  updateTransaction: vi.fn(),
}));

import { createTransactionAction } from "@/app/transactions/actions";

describe("createTransactionAction", () => {
  it("accepts investment (saving) transactions", async () => {
    await createTransactionAction({
      amount: 100,
      category: "some-category-id",
      date: "2026-07-07",
      description: "Aporte",
      installmentCount: 1,
      paymentMethod: "some-payment-method-id",
      type: "saving",
    });

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "saving" }),
    );
  });
});
