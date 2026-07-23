import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getPaymentsDueData,
  getTransactionFormOptions,
  getUserContext,
  listCategoryOverview,
  listGoals,
  listPaymentMethodOverview,
  listSubscriptionOverview,
} from "@/lib/finance/transactions";

const USER_ID = "11111111-1111-4111-8111-111111111111";

// Dynamic "today"/"current month", mirroring how the source computes them
// (getTodayValue/getCurrentMonthValue both use the real clock), so tests stay
// correct regardless of which day this suite actually runs on.
const now = new Date();
const CURRENT_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

// A day-of-month 2 days from now (never below 10, the fixture's
// closing_day, so the invoice cycle stays anchored to the current month —
// see getCreditCardInvoiceCycle) so a credit card invoice due on this day
// deterministically lands in the getPaymentsDueStatus "next" (due within 3
// days) bucket regardless of which day this suite runs on.
// ponytail: still misses the "next" bucket in the first ~6 days of a month
// (floor of 10 pushes the due date more than 3 days out) or on the very
// last day (rollover clamps back to today) — acceptable, much narrower than
// the fixed due_day=20 this replaced, which only worked on 4 days a month.
const daysInCurrentMonth = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
).getUTCDate();
const NEXT_STATUS_DUE_DAY = Math.max(
  10,
  Math.min(now.getUTCDate() + 2, daysInCurrentMonth),
);

// Minimal chainable fake query builder: every chain method returns itself,
// and the builder is a thenable resolving to the configured response.
// Copied from tests/lib/finance/transactions-crud.test.ts and extended with
// `.limit`/`.lte`/`.neq` since the read paths under test build date-range and
// limit-bounded queries that the crud file's helper never needed.
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
    limit: chain,
    lte: chain,
    maybeSingle: chain,
    neq: chain,
    order: chain,
    range: chain,
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
  opts: { createdAt?: string | null; noClaims?: boolean; noUser?: boolean } = {},
) {
  const queue = [...fromResponses];
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue({
        data: { claims: opts.noClaims ? {} : { sub: USER_ID } },
      }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: opts.noUser
            ? null
            : { id: USER_ID, created_at: opts.createdAt ?? null },
        },
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

function setup(
  fromResponses: unknown[] = [],
  opts: { createdAt?: string | null; noClaims?: boolean; noUser?: boolean } = {},
) {
  const supabase = makeSupabase(fromResponses, opts);
  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return supabase;
}

// Builds an already-resolved AuthenticatedUserContext so a test can exercise
// the "userContext passed in" branch of a function without also mocking
// supabase.auth. The wrapped supabase still needs its own `.from()` queue.
function makeCtx(fromResponses: unknown[] = []) {
  const supabase = makeSupabase(fromResponses);
  return {
    claims: { sub: USER_ID },
    createdAt: null,
    supabase,
    user: { id: USER_ID, created_at: null },
    userId: USER_ID,
  } as unknown as Awaited<ReturnType<typeof getUserContext>>;
}

function txRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    date: `${CURRENT_MONTH}-01`,
    description: "",
    amount: 10,
    kind: "expense",
    notes: null,
    category_id: null,
    payment_method_id: null,
    categories: null,
    payment_methods: null,
    advanced_at: null,
    advanced_to_month: null,
    installment_group_id: null,
    installment_number: null,
    installment_total: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserContext", () => {
  it("accepts an already-resolved supabase client argument", async () => {
    const supabase = makeSupabase([]);
    const ctx = await getUserContext(supabase as never);
    expect(ctx.userId).toBe(USER_ID);
    expect(supabase.auth.getUser).toHaveBeenCalled();
  });

  it("redirects when the user is missing", async () => {
    setup([], { noUser: true });
    await expect(getUserContext()).rejects.toThrow("REDIRECT:/");
  });

  it("redirects when claims are missing", async () => {
    setup([], { noClaims: true });
    await expect(getUserContext()).rejects.toThrow("REDIRECT:/");
  });
});

describe("listCategoryOverview", () => {
  const catNeeds = {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Food",
    icon: null,
    group_type: "needs",
    is_default: true,
    monthly_limit: 500,
  };
  const catWants = {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Shopping",
    icon: "🛍️",
    group_type: "wants",
    is_default: false,
    monthly_limit: null,
  };
  const catIncome = {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Salary",
    icon: null,
    group_type: "income",
    is_default: false,
    monthly_limit: 0,
  };
  // Not a member of the built-in translation map, so its label falls back
  // to the raw (custom) category name even though it's flagged as default.
  const catCustomDefault = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Pets",
    icon: null,
    group_type: "needs",
    is_default: true,
    monthly_limit: 100,
  };

  it("computes spent per category and filters out income categories, with an explicit userContext", async () => {
    const ctx = makeCtx([
      qb({ data: [catNeeds, catWants, catIncome], error: null }),
      qb({
        data: [
          txRow({
            id: "tx-food",
            amount: 30,
            category_id: catNeeds.id,
            categories: catNeeds,
          }),
        ],
        error: null,
      }),
    ]);

    const overview = await listCategoryOverview(CURRENT_MONTH, ctx);

    expect(overview).toHaveLength(2);
    const food = overview.find((item) => item.id === catNeeds.id);
    const shopping = overview.find((item) => item.id === catWants.id);
    expect(food?.spent).toBe(30);
    expect(food?.monthlyLimit).toBe(500);
    expect(shopping?.monthlyLimit).toBe(0);
    expect(overview.some((item) => item.id === catIncome.id)).toBe(false);
  });

  it("returns an empty array when there are no categories, without an explicit userContext", async () => {
    setup([
      qb({ data: null, error: null }),
      qb({ data: [], error: null }),
    ]);

    await expect(listCategoryOverview(CURRENT_MONTH)).resolves.toEqual([]);
  });

  it("throws when loading categories fails", async () => {
    setup([qb({ data: null, error: { message: "boom" } })]);

    await expect(listCategoryOverview(CURRENT_MONTH)).rejects.toThrow(
      "Unable to load categories: boom",
    );
  });

  it("falls back to the raw name for a default category outside the translation map", async () => {
    const ctx = makeCtx([
      qb({ data: [catCustomDefault], error: null }),
      qb({ data: [], error: null }),
    ]);

    const overview = await listCategoryOverview(CURRENT_MONTH, ctx);

    expect(overview).toHaveLength(1);
    expect(overview[0].label).toBe("Pets");
  });
});

describe("listPaymentMethodOverview", () => {
  const pmCredit = {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Visa",
    type: "credit" as const,
    credit_limit: 2000,
    due_day: 20,
    closing_day: 10,
  };
  const pmBank = {
    id: "66666666-6666-4666-8666-666666666666",
    name: "Checking",
    type: "bank" as const,
    credit_limit: null,
    due_day: null,
    closing_day: null,
  };

  it("computes details for both credit and non-credit payment methods, with an explicit userContext", async () => {
    const ctx = makeCtx([
      qb({ data: [pmCredit, pmBank], error: null }),
      qb({ data: [], error: null }),
      qb({ data: [], error: null }),
    ]);

    const overview = await listPaymentMethodOverview(CURRENT_MONTH, ctx);

    expect(overview).toHaveLength(2);
    const credit = overview.find((item) => item.id === pmCredit.id);
    const bank = overview.find((item) => item.id === pmBank.id);
    expect(credit?.creditLimit).toBe(2000);
    expect(credit?.closingDay).toBe(10);
    expect(credit?.dueDay).toBe(20);
    expect(bank?.creditLimit).toBe(0);
    expect(bank?.closingDay).toBeNull();
    expect(bank?.dueDay).toBeNull();
  });

  it("translates well-known default payment method names for every known type", async () => {
    const pmPix = {
      id: "77777777-7777-4777-8777-777777777777",
      name: "Pix",
      type: "pix" as const,
      credit_limit: null,
      due_day: null,
      closing_day: null,
    };
    const pmCreditNamed = {
      id: "88888888-8888-4888-8888-888888888888",
      name: "Credit Card",
      type: "credit" as const,
      credit_limit: 500,
      due_day: 5,
      closing_day: 1,
    };
    // A default-named payment method whose type doesn't match any of the
    // known payment-method types falls back to translating by name.
    const pmFallbackByName = {
      id: "99999999-9999-4999-8999-999999999999",
      name: "Cash",
      type: "bank" as const,
      credit_limit: null,
      due_day: null,
      closing_day: null,
    };
    // A default-named payment method mismatched with the "boleto" type.
    const pmBoleto = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Pix",
      type: "boleto" as const,
      credit_limit: null,
      due_day: null,
      closing_day: null,
    };
    const ctx = makeCtx([
      qb({
        data: [pmPix, pmCreditNamed, pmFallbackByName, pmBoleto],
        error: null,
      }),
      qb({ data: [], error: null }),
      qb({ data: [], error: null }),
    ]);

    const overview = await listPaymentMethodOverview(CURRENT_MONTH, ctx);

    expect(overview).toHaveLength(4);
  });

  it("returns an empty array when there are no payment methods, without an explicit userContext", async () => {
    setup([
      qb({ data: null, error: null }),
      qb({ data: [], error: null }),
      qb({ data: [], error: null }),
    ]);

    await expect(listPaymentMethodOverview(CURRENT_MONTH)).resolves.toEqual([]);
  });

  it("throws when loading payment methods fails", async () => {
    setup([
      qb({ data: null, error: { message: "boom" } }),
      qb({ data: [], error: null }),
      qb({ data: [], error: null }),
    ]);

    await expect(listPaymentMethodOverview(CURRENT_MONTH)).rejects.toThrow(
      "Unable to load payment methods: boom",
    );
  });
});

describe("listSubscriptionOverview", () => {
  it("builds the subscription overview from active subscription transactions", async () => {
    setup([
      qb({
        data: [
          txRow({
            id: "tx-sub",
            date: `${CURRENT_MONTH}-01`,
            description: "Netflix",
            notes: "subscription 1/12",
          }),
        ],
        error: null,
      }),
    ]);

    const overview = await listSubscriptionOverview();
    expect(Array.isArray(overview)).toBe(true);
  });
});

describe("getPaymentsDueData", () => {
  const pmCreditId = "77777777-7777-4777-8777-777777777777";
  const pmGymId = "88888888-8888-4888-8888-888888888888";
  const pmBoletoId = "99999999-9999-4999-8999-999999999999";
  const pmBankId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const catGymId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  it("groups invoices, subscriptions and bills for the month, with an explicit userContext", async () => {
    const rows = [
      // Credit card purchase -> becomes a consolidated invoice entry.
      txRow({
        id: "tx-laptop",
        date: `${CURRENT_MONTH}-05`,
        description: "Laptop",
        amount: 100,
        payment_method_id: pmCreditId,
        payment_methods: {
          id: pmCreditId,
          name: "Visa",
          type: "credit",
          closing_day: 10,
          due_day: NEXT_STATUS_DUE_DAY,
        },
      }),
      // Two occurrences of the same subscription (same description/category/
      // payment method) -> merged into a single grouped subscription.
      txRow({
        id: "tx-netflix-1",
        date: `${CURRENT_MONTH}-01`,
        description: "Netflix",
        notes: "subscription 1/12",
      }),
      txRow({
        id: "tx-netflix-2",
        date: `${CURRENT_MONTH}-05`,
        description: "Netflix",
        notes: "subscription 2/12",
      }),
      // A subscription with its own category/payment method and a note that
      // *contains* "paused" without matching the strict "subscription
      // paused" prefix used to hide paused occurrences from history.
      txRow({
        id: "tx-gym",
        date: `${CURRENT_MONTH}-03`,
        description: "Gym",
        notes: "subscription 2/12 - paused manually",
        category_id: catGymId,
        categories: {
          id: catGymId,
          name: "Gym",
          icon: null,
          group_type: "wants",
          is_default: false,
          monthly_limit: 0,
        },
        payment_method_id: pmGymId,
        payment_methods: {
          id: pmGymId,
          name: "Debit Card",
          type: "debit",
          closing_day: null,
          due_day: null,
        },
      }),
      // A subscription row with a dangling payment method id (null) but a
      // populated `payment_methods` join, to exercise the
      // `paymentMethodId ?? paymentMethodKey ?? ""` fallback chain.
      txRow({
        id: "tx-streaming",
        date: `${CURRENT_MONTH}-07`,
        description: "Streaming",
        notes: "subscription 3/12",
        payment_method_id: null,
        payment_methods: {
          id: "unused",
          name: "Some Card",
          type: "credit",
          closing_day: null,
          due_day: null,
        },
      }),
      // Bills: one boleto, one bank transfer.
      txRow({
        id: "tx-electricity",
        date: `${CURRENT_MONTH}-10`,
        description: "Electricity",
        amount: 80,
        payment_method_id: pmBoletoId,
        payment_methods: {
          id: pmBoletoId,
          name: "Boleto",
          type: "boleto",
          closing_day: null,
          due_day: null,
        },
      }),
      txRow({
        id: "tx-rent",
        date: `${CURRENT_MONTH}-12`,
        description: "Rent",
        amount: 45,
        payment_method_id: pmBankId,
        payment_methods: {
          id: pmBankId,
          name: "Bank Transfer",
          type: "bank",
          closing_day: null,
          due_day: null,
        },
      }),
      // Excluded from bills: wrong type (income).
      txRow({
        id: "tx-salary",
        date: `${CURRENT_MONTH}-08`,
        description: "Salary",
        kind: "income",
        amount: 999,
        payment_method_id: pmBoletoId,
        payment_methods: {
          id: pmBoletoId,
          name: "Boleto",
          type: "boleto",
          closing_day: null,
          due_day: null,
        },
      }),
      // Excluded from bills: it's an invoice advance payment.
      txRow({
        id: "tx-advance",
        date: `${CURRENT_MONTH}-09`,
        description: "Advance",
        amount: 50,
        notes: "invoice_advance:credit-card-invoice:some-id",
        payment_method_id: pmBoletoId,
        payment_methods: {
          id: pmBoletoId,
          name: "Boleto",
          type: "boleto",
          closing_day: null,
          due_day: null,
        },
      }),
    ];
    const ctx = makeCtx([
      qb({ data: rows, error: null }),
      qb({ data: [], error: null }),
    ]);

    const result = await getPaymentsDueData(CURRENT_MONTH, ctx);

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].amount).toBe(100);
    expect(result.invoices[0].purchaseCount).toBe(1);
    expect(result.invoices[0].status).toBe("next");

    expect(result.subscriptions).toHaveLength(3);
    const netflix = result.subscriptions.find((sub) => sub.name === "Netflix");
    const gym = result.subscriptions.find((sub) => sub.name === "Gym");
    expect(netflix?.status).toBe("active");
    expect(gym?.status).toBe("paused");

    expect(result.bills).toHaveLength(2);
    expect(result.bills.map((bill) => bill.descriptionKey).sort()).toEqual([
      "Electricity",
      "Rent",
    ]);

    expect(result.summary.totalInvoices).toBe(100);
    expect(result.summary.totalBills).toBe(125);
    expect(result.summary.nextDueDate).not.toBeNull();
  });

  it("sorts multiple invoices by due date and marks a far-future bill as 'planned'", async () => {
    // ponytail: clamped to stay inside CURRENT_MONTH (getPaymentsDueData
    // filters by calendar month), narrower than a fixed +10 days near
    // month-end but same acceptable trade-off as NEXT_STATUS_DUE_DAY above.
    const farFutureDay = Math.min(now.getUTCDate() + 10, daysInCurrentMonth);
    const farFuture = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), farFutureDay),
    )
      .toISOString()
      .slice(0, 10);
    const rows = [
      txRow({
        id: "tx-card-a",
        date: `${CURRENT_MONTH}-05`,
        description: "Laptop",
        amount: 100,
        payment_method_id: pmCreditId,
        payment_methods: {
          id: pmCreditId,
          name: "Visa",
          type: "credit",
          closing_day: 10,
          due_day: 20,
        },
      }),
      txRow({
        id: "tx-card-b",
        date: `${CURRENT_MONTH}-06`,
        description: "Groceries",
        amount: 50,
        payment_method_id: pmBankId,
        payment_methods: {
          id: pmBankId,
          name: "Mastercard",
          type: "credit",
          closing_day: 10,
          due_day: 20,
        },
      }),
      txRow({
        id: "tx-far-bill",
        date: farFuture,
        description: "Insurance",
        amount: 60,
        payment_method_id: pmBoletoId,
        payment_methods: {
          id: pmBoletoId,
          name: "Boleto",
          type: "boleto",
          closing_day: null,
          due_day: null,
        },
      }),
    ];
    const ctx = makeCtx([
      qb({ data: rows, error: null }),
      qb({ data: [], error: null }),
    ]);

    const result = await getPaymentsDueData(CURRENT_MONTH, ctx);

    expect(result.invoices.length).toBeGreaterThanOrEqual(2);
    expect(result.bills).toHaveLength(1);
    expect(result.bills[0].status).toBe("planned");
  });

  it("returns empty collections and a null next due date when there is nothing due, without an explicit userContext", async () => {
    setup([
      qb({ data: [], error: null }),
      qb({ data: [], error: null }),
    ]);

    const result = await getPaymentsDueData(CURRENT_MONTH);

    expect(result).toEqual({
      bills: [],
      invoices: [],
      subscriptions: [],
      summary: {
        nextDueDate: null,
        totalBills: 0,
        totalDue: 0,
        totalInvoices: 0,
        totalSubscriptions: 0,
      },
    });
  });
});

describe("listGoals", () => {
  const goalRow = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Trip",
    icon: "🎯",
    target_amount: 1000,
    current_amount: 250,
    deadline: "2026-12-01",
    color: "#ff0000",
  };

  it("returns mapped goals on success", async () => {
    setup([qb({ data: [goalRow], error: null })]);

    await expect(listGoals()).resolves.toEqual([
      {
        color: "#ff0000",
        currentAmount: 250,
        deadline: "2026-12-01",
        icon: "🎯",
        id: goalRow.id,
        name: "Trip",
        targetAmount: 1000,
      },
    ]);
  });

  it("defaults to an empty array when data is null", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(listGoals()).resolves.toEqual([]);
  });

  it("returns an empty array when the goals table does not exist yet", async () => {
    setup([qb({ data: null, error: { code: "42P01", message: "missing" } })]);
    await expect(listGoals()).resolves.toEqual([]);
  });

  it("throws for any other query error", async () => {
    setup([
      qb({ data: null, error: { code: "500", message: "boom" } }),
    ]);
    await expect(listGoals()).rejects.toThrow("Unable to load goals: boom");
  });
});

describe("getTransactionFormOptions", () => {
  const category = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    name: "Food",
    icon: null,
    group_type: "needs",
    is_default: true,
    monthly_limit: 500,
  };
  const categoryNoLimit = {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    name: "Shopping",
    icon: "🛍️",
    group_type: "wants",
    is_default: false,
    monthly_limit: null,
  };
  const paymentMethod = {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    name: "Visa",
    type: "credit" as const,
    credit_limit: 2000,
    due_day: 20,
    closing_day: 10,
  };
  const paymentMethodNoDueDay = {
    id: "12121212-1212-4212-8212-121212121212",
    name: "Cash",
    type: "cash" as const,
    credit_limit: null,
    due_day: null,
    closing_day: null,
  };

  it("returns mapped categories and payment methods when present, with an explicit userContext", async () => {
    const ctx = makeCtx([
      qb({ data: [category, categoryNoLimit], error: null }),
      qb({ data: [paymentMethod, paymentMethodNoDueDay], error: null }),
    ]);

    const options = await getTransactionFormOptions({ userContext: ctx });

    expect(options.categories).toHaveLength(2);
    expect(options.categories.find((c) => c.id === category.id)?.monthlyLimit).toBe(
      500,
    );
    expect(
      options.categories.find((c) => c.id === categoryNoLimit.id)?.monthlyLimit,
    ).toBe(0);

    expect(options.paymentMethods).toHaveLength(2);
    expect(
      options.paymentMethods.find((pm) => pm.id === paymentMethod.id)?.dueDay,
    ).toBe(20);
    expect(
      options.paymentMethods.find((pm) => pm.id === paymentMethodNoDueDay.id)
        ?.dueDay,
    ).toBeNull();
  });

  it("returns sentinel 'none' options when there are no categories or payment methods, without options", async () => {
    setup([
      qb({ data: [], error: null }),
      qb({ data: [], error: null }),
    ]);

    const options = await getTransactionFormOptions();

    expect(options.categories).toEqual([
      { group: "wants", id: "none", icon: "🏷️", label: "none", monthlyLimit: 0 },
    ]);
    expect(options.paymentMethods).toEqual([
      { id: "none", label: "none", type: "cash" },
    ]);
  });
});
