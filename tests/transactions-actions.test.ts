import { describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const {
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
  updateCategory,
  updatePaymentMethod,
  updateSubscription,
  updateTransaction,
} = vi.hoisted(() => ({
  advanceInstallments: vi.fn().mockResolvedValue(undefined),
  amortizeDebt: vi.fn().mockResolvedValue(undefined),
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
  getFinancingBreakdown: vi.fn().mockResolvedValue(null),
  getFundingContext: vi.fn().mockResolvedValue({ totalSaved: 10, availableBalance: 5 }),
  listGoals: vi.fn().mockResolvedValue([
    { id: "g1", name: "Trip", icon: "✈️", color: "#fff", currentAmount: 1, targetAmount: 2, deadline: "2030-01-01" },
  ]),
  previewInstallmentPrepayment: vi.fn().mockResolvedValue({
    count: 1,
    installments: [],
    targetMonth: "2026-07",
    totalAmount: 0,
  }),
  replaceTransaction: vi.fn().mockResolvedValue(undefined),
  setSubscriptionPaused: vi.fn().mockResolvedValue(undefined),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  updatePaymentMethod: vi.fn().mockResolvedValue(undefined),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
  updateTransaction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/finance/transactions", () => ({
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
  updateCategory,
  updatePaymentMethod,
  updateSubscription,
  updateTransaction,
}));

import {
  advanceInstallmentsAction,
  amortizeDebtAction,
  createCategoryAction,
  createInvoiceAdvancePaymentAction,
  createPaymentMethodAction,
  createSubscriptionAction,
  createTransactionAction,
  deleteCategoryAction,
  getFinancingBreakdownAction,
  getFundingContextAction,
  getGoalOptionsAction,
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
  replaceTransactionAction,
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

  it("passes the goal link (or its removal) through on update", async () => {
    const base = {
      id: uuid, amount: 100, category: "", date: "2026-07-07",
      description: "Updated", paymentMethod: "", type: "expense" as const,
    };
    const goalId = "11111111-1111-4111-8111-111111111111";
    await updateTransactionAction({ ...base, goalId });
    expect(updateTransaction).toHaveBeenLastCalledWith(expect.objectContaining({ goalId }));
    await updateTransactionAction({ ...base, goalId: null });
    expect(updateTransaction).toHaveBeenLastCalledWith(expect.objectContaining({ goalId: null }));
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

describe("createTransactionAction — goal link", () => {
  const goalId = "11111111-1111-4111-8111-111111111111";
  const base = {
    amount: 100, category: "", date: "2030-01-15", description: "Aporte",
    installmentCount: 1, paymentMethod: "",
  };

  it("passes the goal through for an expense", async () => {
    await createTransactionAction({ ...base, type: "expense", goalId });
    expect(createTransaction).toHaveBeenLastCalledWith(expect.objectContaining({ goalId }));
  });

  it("rejects a goal on an income", async () => {
    await expect(createTransactionAction({ ...base, type: "income", goalId })).rejects.toThrow();
  });

  it("lists goal options without amounts", async () => {
    await expect(getGoalOptionsAction()).resolves.toEqual([{ id: "g1", name: "Trip", icon: "✈️" }]);
  });
});

describe("createTransactionAction — financing and savings", () => {
  const base = {
    amount: 1000, category: "", date: "2030-01-15", description: "Notebook",
    installmentCount: 12, paymentMethod: "", type: "expense" as const,
  };
  const financing = {
    operationType: "purchase" as const, interestSystem: "price" as const,
    rateInputMode: "rate" as const, rate: 2, ratePeriod: "monthly" as const,
    downPayment: 0, fees: 0,
  };

  it("lets savings exceed the price when financing adds interest", async () => {
    await createTransactionAction({ ...base, savingsFundedAmount: 1134.7, financing });
    expect(createTransaction).toHaveBeenLastCalledWith(
      expect.objectContaining({ savingsFundedAmount: 1134.7 }),
    );
  });

  it("passes financing and savings through", async () => {
    await createTransactionAction({ ...base, savingsFundedAmount: 100, financing });
    expect(createTransaction).toHaveBeenLastCalledWith(
      expect.objectContaining({ savingsFundedAmount: 100, financing }),
    );
  });

  it("defaults downPayment and fees to 0", async () => {
    const partial = { ...financing, downPayment: undefined, fees: undefined };
    await createTransactionAction({ ...base, financing: partial as never });
    expect(createTransaction).toHaveBeenLastCalledWith(
      expect.objectContaining({ financing: expect.objectContaining({ downPayment: 0, fees: 0 }) }),
    );
  });

  it.each([
    ["financing on income", { type: "income" as const, financing }],
    ["down payment ≥ amount", { financing: { ...financing, downPayment: 1000 } }],
    ["installment mode with SAC", { financing: { ...financing, interestSystem: "sac" as const, rateInputMode: "installment" as const, installmentAmount: 100 } }],
    ["installment mode without amount", { financing: { ...financing, rateInputMode: "installment" as const } }],
    ["rate mode without rate", { financing: { ...financing, rate: undefined } }],
    ["loan with down payment", { financing: { ...financing, operationType: "loan" as const, downPayment: 10 } }],
    ["savings above amount", { savingsFundedAmount: 1001 }],
    ["unknown financing key", { financing: { ...financing, extra: 1 } }],
  ])("rejects %s", async (_label, override) => {
    await expect(createTransactionAction({ ...base, ...override } as never)).rejects.toThrow();
  });
});

describe("financing read actions", () => {
  it("validates the plan id and returns the breakdown", async () => {
    await expect(getFinancingBreakdownAction("bad")).rejects.toThrow();
    await expect(
      getFinancingBreakdownAction("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    ).resolves.toBeNull();
    expect(getFinancingBreakdown).toHaveBeenCalledWith("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });

  it("returns the funding context", async () => {
    await expect(getFundingContextAction()).resolves.toEqual({ totalSaved: 10, availableBalance: 5 });
  });
});

describe("replaceTransactionAction", () => {
  const transaction = {
    amount: 1000, category: "", date: "2030-01-15", description: "Notebook",
    installmentCount: 1, paymentMethod: "", type: "expense" as const,
  };

  it("validates the id and the new definition, defaulting blank ids to 'none'", async () => {
    await replaceTransactionAction({ id: uuid, transaction });
    expect(replaceTransaction).toHaveBeenCalledWith(
      uuid,
      expect.objectContaining({ category: "none", paymentMethod: "none", amount: 1000 }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("keeps real ids", async () => {
    await replaceTransactionAction({
      id: uuid,
      transaction: { ...transaction, category: "cat", paymentMethod: "pm" },
    });
    expect(replaceTransaction).toHaveBeenLastCalledWith(
      uuid,
      expect.objectContaining({ category: "cat", paymentMethod: "pm" }),
    );
  });

  it.each([
    ["a bad id", { id: "bad", transaction }],
    ["an invalid definition", { id: uuid, transaction: { ...transaction, amount: -1 } }],
    ["unknown keys", { id: uuid, transaction, extra: 1 }],
  ])("rejects %s", async (_label, input) => {
    await expect(replaceTransactionAction(input as never)).rejects.toThrow();
  });
});

describe("amortizeDebtAction", () => {
  const valid = {
    amount: 250,
    description: "Notebook (amortization)",
    mode: "term" as const,
    planId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    source: "savings" as const,
  };

  it("validates the payload, amortizes and refreshes the debt pages", async () => {
    await amortizeDebtAction(valid);
    expect(amortizeDebt).toHaveBeenCalledWith(valid);
    expect(revalidatePath).toHaveBeenCalledWith("/debts");
  });

  it.each([
    { ...valid, planId: "bad" },
    { ...valid, amount: 0 },
    { ...valid, source: "card" },
    { ...valid, mode: "never" },
    { ...valid, extra: true },
  ])("rejects an invalid payload %#", async (payload) => {
    amortizeDebt.mockClear();
    await expect(amortizeDebtAction(payload as never)).rejects.toThrow();
    expect(amortizeDebt).not.toHaveBeenCalled();
  });
});
