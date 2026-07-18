import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  addGoalFunds,
  createCategory,
  createGoal,
  createPaymentMethod,
  createSubscription,
  deleteCategory,
  deleteGoal,
  deletePaymentMethod,
  deleteSubscription,
  deleteSubscriptionOccurrences,
  setSubscriptionPaused,
  updateCategory,
  updateGoal,
  updatePaymentMethod,
  updateSubscription,
} from "@/lib/finance/transactions";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";
const PAYMENT_METHOD_ID = "33333333-3333-4333-8333-333333333333";
const GOAL_ID = "44444444-4444-4444-8444-444444444444";
const SUBSCRIPTION_ID = "55555555-5555-4555-8555-555555555555";

// Minimal chainable fake query builder: every chain method returns itself,
// and the builder is a thenable resolving to the configured response,
// matching both `await query` (no terminal call) and `await query.maybeSingle()`.
function qb(response: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    delete: chain,
    eq: chain,
    gte: chain,
    in: chain,
    insert: chain,
    is: chain,
    like: chain,
    maybeSingle: chain,
    order: chain,
    select: chain,
    single: chain,
    update: chain,
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(response).then(resolve, reject),
  });
  return builder;
}

function makeSupabase(
  fromResponses: unknown[],
  opts: { createdAt?: string | null } = {},
) {
  const queue = [...fromResponses];
  return {
    auth: {
      getClaims: vi
        .fn()
        .mockResolvedValue({ data: { claims: { sub: USER_ID } } }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID, created_at: opts.createdAt ?? null } },
      }),
    },
    from: vi.fn(() => {
      if (!queue.length) {
        throw new Error("No more mocked supabase.from() responses queued");
      }
      return queue.shift();
    }),
    rpc: vi.fn(),
  };
}

function setup(fromResponses: unknown[] = [], opts: { createdAt?: string | null } = {}) {
  const supabase = makeSupabase(fromResponses, opts);
  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSubscription", () => {
  const validInput = {
    amount: 50,
    category: "none",
    description: "Netflix",
    nextDate: "2026-08-01",
    paymentMethod: "none",
  };

  it("throws for empty description", async () => {
    setup([]);
    await expect(
      createSubscription({ ...validInput, description: "  " }),
    ).rejects.toThrow("Subscription is required.");
  });

  it("throws for non-positive amount", async () => {
    setup([]);
    await expect(
      createSubscription({ ...validInput, amount: 0 }),
    ).rejects.toThrow("Amount must be greater than zero.");
  });

  it("throws for an invalid category id", async () => {
    setup([]);
    await expect(
      createSubscription({ ...validInput, category: "bad-id" }),
    ).rejects.toThrow("Category is invalid.");
  });

  it("throws for an invalid date", async () => {
    setup([]);
    await expect(
      createSubscription({ ...validInput, nextDate: "not-a-date" }),
    ).rejects.toThrow("Transaction date is invalid.");
  });

  it("throws when the date is before the user's creation month", async () => {
    setup([], { createdAt: "2026-06-01T00:00:00.000Z" });
    await expect(
      createSubscription({ ...validInput, nextDate: "2026-01-15" }),
    ).rejects.toThrow(
      "Transaction date cannot be earlier than the user creation month.",
    );
  });

  it("throws when the category does not belong to the user", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      createSubscription({ ...validInput, category: CATEGORY_ID }),
    ).rejects.toThrow("Category is invalid.");
  });

  it("throws when the payment method does not belong to the user", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      createSubscription({ ...validInput, paymentMethod: PAYMENT_METHOD_ID }),
    ).rejects.toThrow("Payment method is invalid.");
  });

  it("creates 12 monthly occurrences on success", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(createSubscription(validInput)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("throws when the insert fails", async () => {
    setup([qb({ error: { message: "db down" } })]);
    await expect(createSubscription(validInput)).rejects.toThrow(
      "Unable to save subscription: db down",
    );
  });
});

const subscriptionReference = (overrides: Record<string, unknown> = {}) => ({
  category_id: null,
  description: "Netflix",
  id: SUBSCRIPTION_ID,
  notes: "subscription 1/12",
  payment_method_id: null,
  ...overrides,
});

describe("updateSubscription", () => {
  const validInput = {
    amount: 60,
    category: "none",
    description: "Netflix",
    id: SUBSCRIPTION_ID,
    nextDate: "2026-08-01",
    paymentMethod: "none",
  };

  it("throws for empty description", async () => {
    setup([]);
    await expect(
      updateSubscription({ ...validInput, description: "" }),
    ).rejects.toThrow("Subscription is required.");
  });

  it("throws when the reference transaction lookup errors", async () => {
    setup([qb({ data: null, error: { message: "boom" } })]);
    await expect(updateSubscription(validInput)).rejects.toThrow(
      "Unable to load subscription: boom",
    );
  });

  it("throws when the referenced transaction is not a subscription", async () => {
    setup([qb({ data: subscriptionReference({ notes: "plain" }), error: null })]);
    await expect(updateSubscription(validInput)).rejects.toThrow(
      "Subscription is invalid.",
    );
  });

  it("throws when loading future occurrences errors", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: null, error: { message: "load failed" } }),
    ]);
    await expect(updateSubscription(validInput)).rejects.toThrow(
      "Unable to load subscription charges: load failed",
    );
  });

  it("throws when there are no future occurrences", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: null, error: null }),
    ]);
    await expect(updateSubscription(validInput)).rejects.toThrow(
      "No future subscription charges found.",
    );
  });

  it("throws when updating the notes marker fails", async () => {
    setup([
      qb({
        data: subscriptionReference({
          category_id: CATEGORY_ID,
          payment_method_id: PAYMENT_METHOD_ID,
        }),
        error: null,
      }),
      qb({ data: [{ date: "2026-08-01", id: "occ-1" }], error: null }),
      qb({ data: { id: CATEGORY_ID }, error: null }),
      qb({ data: { id: PAYMENT_METHOD_ID }, error: null }),
      qb({ error: { message: "notes failed" } }),
    ]);
    await expect(
      updateSubscription({
        ...validInput,
        category: CATEGORY_ID,
        paymentMethod: PAYMENT_METHOD_ID,
      }),
    ).rejects.toThrow("Unable to update subscription: notes failed");
  });

  it("updates every future occurrence on success (category/payment set)", async () => {
    const supabase = setup([
      qb({
        data: subscriptionReference({
          category_id: CATEGORY_ID,
          payment_method_id: PAYMENT_METHOD_ID,
        }),
        error: null,
      }),
      qb({ data: [{ date: "2026-08-01", id: "occ-1" }], error: null }),
      qb({ data: { id: CATEGORY_ID }, error: null }),
      qb({ data: { id: PAYMENT_METHOD_ID }, error: null }),
      qb({ error: null }),
      qb({ error: null }),
    ]);
    await expect(
      updateSubscription({
        ...validInput,
        category: CATEGORY_ID,
        paymentMethod: PAYMENT_METHOD_ID,
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("throws when updating an occurrence fails", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: "occ-1" }], error: null }),
      qb({ error: null }),
      qb({ error: { message: "update failed" } }),
    ]);
    await expect(updateSubscription(validInput)).rejects.toThrow(
      "Unable to update subscription: update failed",
    );
  });
});

describe("setSubscriptionPaused", () => {
  it("throws for an invalid subscription id", async () => {
    setup([]);
    await expect(setSubscriptionPaused("bad-id", true)).rejects.toThrow(
      "Subscription is invalid.",
    );
  });

  it("pauses every future occurrence (category/payment null)", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: "occ-1" }], error: null }),
      qb({ error: null }),
    ]);
    await expect(
      setSubscriptionPaused(SUBSCRIPTION_ID, true),
    ).resolves.toBeUndefined();
  });

  it("resumes every future occurrence", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: "occ-1" }], error: null }),
      qb({ error: null }),
    ]);
    await expect(
      setSubscriptionPaused(SUBSCRIPTION_ID, false),
    ).resolves.toBeUndefined();
  });

  it("throws when an occurrence update fails", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: "occ-1" }], error: null }),
      qb({ error: { message: "pause failed" } }),
    ]);
    await expect(setSubscriptionPaused(SUBSCRIPTION_ID, true)).rejects.toThrow(
      "Unable to update subscription status: pause failed",
    );
  });
});

describe("deleteSubscription", () => {
  it("deletes every future occurrence", async () => {
    const supabase = setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: "occ-1" }], error: null }),
      qb({ error: null }),
    ]);
    await expect(deleteSubscription(SUBSCRIPTION_ID)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("throws when the delete fails", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: "occ-1" }], error: null }),
      qb({ error: { message: "delete failed" } }),
    ]);
    await expect(deleteSubscription(SUBSCRIPTION_ID)).rejects.toThrow(
      "Unable to delete subscription: delete failed",
    );
  });
});

describe("deleteSubscriptionOccurrences", () => {
  it("throws for an invalid transaction id", async () => {
    setup([]);
    await expect(
      deleteSubscriptionOccurrences({ scope: "single", transactionId: "bad" }),
    ).rejects.toThrow("Transaction is invalid.");
  });

  it("throws when the reference lookup errors", async () => {
    setup([qb({ data: null, error: { message: "boom" } })]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "single",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).rejects.toThrow("Unable to load subscription: boom");
  });

  it("throws when the transaction is not a subscription occurrence", async () => {
    setup([qb({ data: subscriptionReference({ notes: "plain" }), error: null })]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "single",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).rejects.toThrow("Subscription is invalid.");
  });

  it("delegates to deleteTransaction for scope 'single'", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "single",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when loading the occurrence group errors", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: null, error: { message: "group failed" } }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).rejects.toThrow("Unable to load subscription charges: group failed");
  });

  it("throws when the selected occurrence is not in the group", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: "other-occurrence" }], error: null }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).rejects.toThrow("Subscription occurrence not found.");
  });

  it("deletes the selected occurrence group (category/payment set)", async () => {
    const supabase = setup([
      qb({
        data: subscriptionReference({
          category_id: CATEGORY_ID,
          payment_method_id: PAYMENT_METHOD_ID,
        }),
        error: null,
      }),
      qb({ data: [{ date: "2026-08-01", id: SUBSCRIPTION_ID }], error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("deletes the selected occurrence group (category/payment null)", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: SUBSCRIPTION_ID }], error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when the final delete fails", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: [{ date: "2026-08-01", id: SUBSCRIPTION_ID }], error: null }),
      qb({ error: { message: "delete failed" } }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).rejects.toThrow("Unable to delete subscription charges: delete failed");
  });

  it("throws when the occurrence group query returns a null occurrence list", async () => {
    setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({ data: null, error: null }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).rejects.toThrow("Subscription occurrence not found.");
  });

  it("throws when no transaction matches the reference lookup", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "single",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).rejects.toThrow("Subscription is invalid.");
  });

  it("deletes the selected occurrence group (category set, payment null)", async () => {
    const supabase = setup([
      qb({
        data: subscriptionReference({ category_id: CATEGORY_ID }),
        error: null,
      }),
      qb({ data: [{ date: "2026-08-01", id: SUBSCRIPTION_ID }], error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("deletes the selected occurrence group (category null, payment set)", async () => {
    const supabase = setup([
      qb({
        data: subscriptionReference({ payment_method_id: PAYMENT_METHOD_ID }),
        error: null,
      }),
      qb({ data: [{ date: "2026-08-01", id: SUBSCRIPTION_ID }], error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("keeps only the selected occurrence and later unpaid ones for 'this_and_following_unpaid'", async () => {
    const supabase = setup([
      qb({ data: subscriptionReference(), error: null }),
      qb({
        data: [
          { date: "2026-06-01", id: "past-occurrence" },
          { date: "2026-08-01", id: SUBSCRIPTION_ID },
          { date: "2026-09-01", id: "future-occurrence" },
        ],
        error: null,
      }),
      qb({ error: null }),
    ]);
    await expect(
      deleteSubscriptionOccurrences({
        scope: "this_and_following_unpaid",
        transactionId: SUBSCRIPTION_ID,
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });
});

describe("createPaymentMethod", () => {
  const validInput = {
    creditLimit: 1000,
    dueDay: 10,
    closingDay: 3,
    name: "Nubank",
    type: "credit" as const,
  };

  it("throws for an empty name", async () => {
    setup([]);
    await expect(
      createPaymentMethod({ ...validInput, name: "" }),
    ).rejects.toThrow("Payment method name is required.");
  });

  it("throws for an invalid type", async () => {
    setup([]);
    await expect(
      createPaymentMethod({ ...validInput, type: "cash" as never }),
    ).rejects.toThrow("Payment method type is invalid.");
  });

  it("throws for a non-finite credit limit", async () => {
    setup([]);
    await expect(
      createPaymentMethod({ ...validInput, creditLimit: NaN }),
    ).rejects.toThrow("Payment method credit limit is invalid.");
  });

  it("throws for a negative credit limit", async () => {
    setup([]);
    await expect(
      createPaymentMethod({ ...validInput, creditLimit: -10 }),
    ).rejects.toThrow("Payment method credit limit is invalid.");
  });

  it("throws for an out-of-range due day", async () => {
    setup([]);
    await expect(
      createPaymentMethod({ ...validInput, dueDay: 32 }),
    ).rejects.toThrow("Payment method due day is invalid.");
  });

  it("defaults credit limit/due day/closing day when omitted from a credit payment method", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(
      createPaymentMethod({ name: "Basic Card", type: "credit" }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("payment_methods");
  });

  it("creates a credit payment method, keeping due/closing day", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(createPaymentMethod(validInput)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("payment_methods");
  });

  it("creates a non-credit payment method, nulling due/closing day", async () => {
    setup([qb({ error: null })]);
    await expect(
      createPaymentMethod({ ...validInput, type: "bank" }),
    ).resolves.toBeUndefined();
  });

  it("throws when the insert fails", async () => {
    setup([qb({ error: { message: "insert failed" } })]);
    await expect(createPaymentMethod(validInput)).rejects.toThrow(
      "Unable to save payment method: insert failed",
    );
  });
});

const paymentMethodRow = (overrides: Record<string, unknown> = {}) => ({
  closing_day: 3,
  credit_limit: 1000,
  due_day: 10,
  id: PAYMENT_METHOD_ID,
  name: "Nubank",
  type: "bank",
  ...overrides,
});

describe("updatePaymentMethod", () => {
  const validInput = {
    creditLimit: 500,
    dueDay: 10,
    closingDay: 3,
    id: PAYMENT_METHOD_ID,
    name: "Nubank",
    type: "credit" as const,
  };

  it("throws for an invalid id", async () => {
    setup([]);
    await expect(
      updatePaymentMethod({ ...validInput, id: "bad-id" }),
    ).rejects.toThrow("Payment method is invalid.");
  });

  it("throws for an invalid type", async () => {
    setup([]);
    await expect(
      updatePaymentMethod({ ...validInput, type: "cash" as never }),
    ).rejects.toThrow("Payment method type is invalid.");
  });

  it("throws for an invalid credit limit", async () => {
    setup([]);
    await expect(
      updatePaymentMethod({ ...validInput, creditLimit: -5 }),
    ).rejects.toThrow("Payment method credit limit is invalid.");
  });

  it("throws when the lookup errors", async () => {
    setup([qb({ data: null, error: { message: "boom" } })]);
    await expect(updatePaymentMethod(validInput)).rejects.toThrow(
      "Unable to load payment method: boom",
    );
  });

  it("throws when the payment method is not found", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(updatePaymentMethod(validInput)).rejects.toThrow(
      "Payment method not found.",
    );
  });

  it("throws for a protected payment method", async () => {
    setup([qb({ data: paymentMethodRow({ type: "pix" }), error: null })]);
    await expect(updatePaymentMethod(validInput)).rejects.toThrow(
      "This payment method cannot be edited.",
    );
  });

  it("defaults credit limit/due day/closing day when omitted from a credit update", async () => {
    const supabase = setup([
      qb({ data: paymentMethodRow({ type: "credit" }), error: null }),
      qb({ error: null }),
    ]);
    await expect(
      updatePaymentMethod({
        id: PAYMENT_METHOD_ID,
        name: "Basic Card",
        type: "credit",
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("payment_methods");
  });

  it("updates a credit payment method on success", async () => {
    const supabase = setup([
      qb({ data: paymentMethodRow({ type: "credit" }), error: null }),
      qb({ error: null }),
    ]);
    await expect(updatePaymentMethod(validInput)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("payment_methods");
  });

  it("updates a non-credit payment method, nulling due/closing day", async () => {
    setup([
      qb({ data: paymentMethodRow({ type: "bank" }), error: null }),
      qb({ error: null }),
    ]);
    await expect(
      updatePaymentMethod({ ...validInput, type: "bank" }),
    ).resolves.toBeUndefined();
  });

  it("throws when the update fails", async () => {
    setup([
      qb({ data: paymentMethodRow({ type: "credit" }), error: null }),
      qb({ error: { message: "update failed" } }),
    ]);
    await expect(updatePaymentMethod(validInput)).rejects.toThrow(
      "Unable to update payment method: update failed",
    );
  });
});

describe("deletePaymentMethod", () => {
  it("throws for an invalid id", async () => {
    setup([]);
    await expect(deletePaymentMethod("bad-id")).rejects.toThrow(
      "Payment method is invalid.",
    );
  });

  it("throws for a protected payment method", async () => {
    setup([qb({ data: paymentMethodRow({ type: "cash" }), error: null })]);
    await expect(deletePaymentMethod(PAYMENT_METHOD_ID)).rejects.toThrow(
      "This payment method cannot be deleted.",
    );
  });

  it("deletes a non-protected payment method", async () => {
    const supabase = setup([
      qb({ data: paymentMethodRow(), error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deletePaymentMethod(PAYMENT_METHOD_ID),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("payment_methods");
  });

  it("throws when the delete fails", async () => {
    setup([
      qb({ data: paymentMethodRow(), error: null }),
      qb({ error: { message: "delete failed" } }),
    ]);
    await expect(deletePaymentMethod(PAYMENT_METHOD_ID)).rejects.toThrow(
      "Unable to delete payment method: delete failed",
    );
  });
});

describe("createGoal", () => {
  const validInput = {
    color: "#ff0000",
    currentAmount: 100,
    deadline: "2026-12-01",
    icon: "🎯",
    name: "Trip",
    targetAmount: 1000,
  };

  it("throws for an empty name", async () => {
    setup([]);
    await expect(createGoal({ ...validInput, name: "" })).rejects.toThrow(
      "Goal name is required.",
    );
  });

  it("throws for a non-positive target amount", async () => {
    setup([]);
    await expect(
      createGoal({ ...validInput, targetAmount: 0 }),
    ).rejects.toThrow("Target amount must be greater than zero.");
  });

  it("throws for a non-finite current amount", async () => {
    setup([]);
    await expect(
      createGoal({ ...validInput, currentAmount: NaN }),
    ).rejects.toThrow("Current amount is invalid.");
  });

  it("throws for a negative current amount", async () => {
    setup([]);
    await expect(
      createGoal({ ...validInput, currentAmount: -1 }),
    ).rejects.toThrow("Current amount is invalid.");
  });

  it("throws for an invalid deadline", async () => {
    setup([]);
    await expect(
      createGoal({ ...validInput, deadline: "not-a-date" }),
    ).rejects.toThrow("Transaction date is invalid.");
  });

  it("throws when the deadline is before the user's creation month", async () => {
    setup([], { createdAt: "2026-06-01T00:00:00.000Z" });
    await expect(
      createGoal({ ...validInput, deadline: "2026-01-01" }),
    ).rejects.toThrow(
      "Transaction date cannot be earlier than the user creation month.",
    );
  });

  it("throws for an invalid color", async () => {
    setup([]);
    await expect(
      createGoal({ ...validInput, color: "red" }),
    ).rejects.toThrow("Color is invalid.");
  });

  it("does not enforce a creation-month cutoff when the user's created_at is unparseable", async () => {
    const supabase = setup([qb({ error: null })], { createdAt: "not-a-real-date" });
    await expect(createGoal(validInput)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("goals");
  });

  it("defaults current amount to 0 when omitted", async () => {
    const inputWithoutCurrentAmount = { ...validInput };
    delete inputWithoutCurrentAmount.currentAmount;
    const supabase = setup([qb({ error: null })], {
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await expect(
      createGoal(inputWithoutCurrentAmount),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("goals");
  });

  it("creates a goal, clamping current amount to the target", async () => {
    const supabase = setup([qb({ error: null })], {
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await expect(
      createGoal({ ...validInput, currentAmount: 5000 }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("goals");
  });

  it("throws when the insert fails", async () => {
    setup([qb({ error: { message: "insert failed" } })]);
    await expect(createGoal(validInput)).rejects.toThrow(
      "Unable to save goal: insert failed",
    );
  });
});

describe("updateGoal", () => {
  const validInput = {
    color: "#00ff00",
    currentAmount: 100,
    deadline: "2026-12-01",
    icon: "🎯",
    id: GOAL_ID,
    name: "Trip",
    targetAmount: 1000,
  };

  it("throws for an invalid id", async () => {
    setup([]);
    await expect(
      updateGoal({ ...validInput, id: "bad-id" }),
    ).rejects.toThrow("Goal is invalid.");
  });

  it("throws for a negative current amount", async () => {
    setup([]);
    await expect(
      updateGoal({ ...validInput, currentAmount: -1 }),
    ).rejects.toThrow("Current amount is invalid.");
  });

  it("throws when the deadline is before the user's creation month", async () => {
    setup([], { createdAt: "2026-06-01T00:00:00.000Z" });
    await expect(
      updateGoal({ ...validInput, deadline: "2026-01-01" }),
    ).rejects.toThrow(
      "Transaction date cannot be earlier than the user creation month.",
    );
  });

  it("throws for an invalid color", async () => {
    setup([]);
    await expect(updateGoal({ ...validInput, color: "red" })).rejects.toThrow(
      "Color is invalid.",
    );
  });

  it("updates a goal on success", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(updateGoal(validInput)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("goals");
  });

  it("defaults current amount to 0 when omitted", async () => {
    const inputWithoutCurrentAmount = { ...validInput };
    delete inputWithoutCurrentAmount.currentAmount;
    const supabase = setup([qb({ error: null })]);
    await expect(
      updateGoal(inputWithoutCurrentAmount),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("goals");
  });

  it("throws when the update fails", async () => {
    setup([qb({ error: { message: "update failed" } })]);
    await expect(updateGoal(validInput)).rejects.toThrow(
      "Unable to update goal: update failed",
    );
  });
});

describe("addGoalFunds", () => {
  it("throws for an invalid goal id", async () => {
    setup([]);
    await expect(addGoalFunds("bad-id", 10)).rejects.toThrow(
      "Goal is invalid.",
    );
  });

  it("throws for a non-positive amount", async () => {
    setup([]);
    await expect(addGoalFunds(GOAL_ID, 0)).rejects.toThrow(
      "Amount must be greater than zero.",
    );
  });

  it("throws when the rpc call errors", async () => {
    const supabase = setup([]);
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "rpc failed" } });
    await expect(addGoalFunds(GOAL_ID, 10)).rejects.toThrow(
      "Unable to add goal funds: rpc failed",
    );
  });

  it("throws when the goal is not found", async () => {
    const supabase = setup([]);
    supabase.rpc.mockResolvedValue({ data: null, error: null });
    await expect(addGoalFunds(GOAL_ID, 10)).rejects.toThrow(
      "Goal not found.",
    );
  });

  it("adds funds on success", async () => {
    const supabase = setup([]);
    supabase.rpc.mockResolvedValue({ data: true, error: null });
    await expect(addGoalFunds(GOAL_ID, 10)).resolves.toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith("add_goal_funds", {
      p_amount: 10,
      p_goal_id: GOAL_ID,
      p_user_id: USER_ID,
    });
  });
});

describe("deleteGoal", () => {
  it("throws for an invalid goal id", async () => {
    setup([]);
    await expect(deleteGoal("bad-id")).rejects.toThrow("Goal is invalid.");
  });

  it("deletes a goal on success", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(deleteGoal(GOAL_ID)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("goals");
  });

  it("throws when the delete fails", async () => {
    setup([qb({ error: { message: "delete failed" } })]);
    await expect(deleteGoal(GOAL_ID)).rejects.toThrow(
      "Unable to delete goal: delete failed",
    );
  });
});

describe("createCategory", () => {
  const validInput = {
    group: "wants" as const,
    icon: "🛍️",
    monthlyLimit: 200,
    name: "Shopping",
  };

  it("throws for an empty name", async () => {
    setup([]);
    await expect(createCategory({ ...validInput, name: "" })).rejects.toThrow(
      "Category name is required.",
    );
  });

  it("throws for an invalid group", async () => {
    setup([]);
    await expect(
      createCategory({ ...validInput, group: "bogus" as never }),
    ).rejects.toThrow("Category group is invalid.");
  });

  it("throws for a non-finite monthly limit", async () => {
    setup([]);
    await expect(
      createCategory({ ...validInput, monthlyLimit: NaN }),
    ).rejects.toThrow("Category monthly limit is invalid.");
  });

  it("throws for a negative monthly limit", async () => {
    setup([]);
    await expect(
      createCategory({ ...validInput, monthlyLimit: -1 }),
    ).rejects.toThrow("Category monthly limit is invalid.");
  });

  it("creates a category on success", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(createCategory(validInput)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("categories");
  });

  it("defaults monthly limit to 0 when omitted", async () => {
    const inputWithoutLimit = { ...validInput };
    delete inputWithoutLimit.monthlyLimit;
    const supabase = setup([qb({ error: null })]);
    await expect(createCategory(inputWithoutLimit)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("categories");
  });

  it("throws when the insert fails", async () => {
    setup([qb({ error: { message: "insert failed" } })]);
    await expect(createCategory(validInput)).rejects.toThrow(
      "Unable to save category: insert failed",
    );
  });
});

const categoryRow = (overrides: Record<string, unknown> = {}) => ({
  group_type: "wants",
  icon: "🛍️",
  id: CATEGORY_ID,
  is_default: false,
  monthly_limit: 200,
  name: "Shopping",
  ...overrides,
});

describe("updateCategory", () => {
  const validInput = {
    group: "wants" as const,
    icon: "🛍️",
    id: CATEGORY_ID,
    monthlyLimit: 200,
    name: "Shopping",
  };

  it("throws for an invalid group", async () => {
    setup([]);
    await expect(
      updateCategory({ ...validInput, group: "bogus" as never }),
    ).rejects.toThrow("Category group is invalid.");
  });

  it("throws for an invalid monthly limit", async () => {
    setup([]);
    await expect(
      updateCategory({ ...validInput, monthlyLimit: -1 }),
    ).rejects.toThrow("Category monthly limit is invalid.");
  });

  it("throws for an invalid id", async () => {
    setup([]);
    await expect(
      updateCategory({ ...validInput, id: "bad-id" }),
    ).rejects.toThrow("Category is invalid.");
  });

  it("throws when the lookup errors", async () => {
    setup([qb({ data: null, error: { message: "boom" } })]);
    await expect(updateCategory(validInput)).rejects.toThrow(
      "Unable to load category: boom",
    );
  });

  it("throws when the category is not found", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(updateCategory(validInput)).rejects.toThrow(
      "Category not found.",
    );
  });

  it("updates a category on success", async () => {
    const supabase = setup([
      qb({ data: categoryRow(), error: null }),
      qb({ error: null }),
    ]);
    await expect(updateCategory(validInput)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("categories");
  });

  it("defaults monthly limit to 0 when omitted", async () => {
    const inputWithoutLimit = { ...validInput };
    delete inputWithoutLimit.monthlyLimit;
    const supabase = setup([
      qb({ data: categoryRow(), error: null }),
      qb({ error: null }),
    ]);
    await expect(updateCategory(inputWithoutLimit)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("categories");
  });

  it("throws when the update fails", async () => {
    setup([
      qb({ data: categoryRow(), error: null }),
      qb({ error: { message: "update failed" } }),
    ]);
    await expect(updateCategory(validInput)).rejects.toThrow(
      "Unable to update category: update failed",
    );
  });
});

describe("deleteCategory", () => {
  it("throws for an invalid id", async () => {
    setup([]);
    await expect(deleteCategory("bad-id")).rejects.toThrow(
      "Category is invalid.",
    );
  });

  it("throws when the category is not found", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(deleteCategory(CATEGORY_ID)).rejects.toThrow(
      "Category not found.",
    );
  });

  it("deletes a category on success", async () => {
    const supabase = setup([
      qb({ data: categoryRow(), error: null }),
      qb({ error: null }),
    ]);
    await expect(deleteCategory(CATEGORY_ID)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("categories");
  });

  it("throws when the delete fails", async () => {
    setup([
      qb({ data: categoryRow(), error: null }),
      qb({ error: { message: "delete failed" } }),
    ]);
    await expect(deleteCategory(CATEGORY_ID)).rejects.toThrow(
      "Unable to delete category: delete failed",
    );
  });
});
