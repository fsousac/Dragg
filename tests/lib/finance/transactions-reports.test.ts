import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getBudgetOverviewData,
  getDashboardData,
  getMonthlySummary,
  getReportsData,
  listTransactions,
} from "@/lib/finance/transactions";

const USER_ID = "11111111-1111-4111-8111-111111111111";

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
    limit: chain,
    lte: chain,
    maybeSingle: chain,
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

// A supabase fake for the "report" style functions (getDashboardData,
// getReportsData, getBudgetOverviewData): these fan out into many
// concurrent listTransactions()/rpc() calls whose exact ordering is an
// implementation detail. Routing by table name (with the last queued
// response reused for any extra calls to that table) lets each test
// describe "what the transactions/categories/payment_methods table
// returns" without hand-tracing Promise.all scheduling order.
function makeTableSupabase(tableQueues: {
  transactions?: Array<{ data?: unknown; error?: unknown }>;
  categories?: Array<{ data?: unknown; error?: unknown }>;
  payment_methods?: Array<{ data?: unknown; error?: unknown }>;
}) {
  const queues: Record<string, Array<{ data?: unknown; error?: unknown }>> = {
    categories: [...(tableQueues.categories ?? [])],
    payment_methods: [...(tableQueues.payment_methods ?? [])],
    transactions: [...(tableQueues.transactions ?? [])],
  };

  return {
    auth: {
      getClaims: vi
        .fn()
        .mockResolvedValue({ data: { claims: { sub: USER_ID } } }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID, created_at: null } },
      }),
    },
    from: vi.fn((table: string) => {
      const list = queues[table];
      if (!list || list.length === 0) {
        throw new Error(`No mocked supabase.from("${table}") response queued`);
      }
      const response = list.length > 1 ? list.shift()! : list[0];
      return qb(response);
    }),
    rpc: vi.fn(),
  };
}

function makeCtx(supabase: unknown) {
  return {
    claims: { sub: USER_ID },
    createdAt: null,
    supabase: supabase as never,
    user: { id: USER_ID } as never,
    userId: USER_ID,
  };
}

type RowOverrides = Record<string, unknown>;

const needsCategory = {
  group_type: "needs",
  icon: "🏠",
  id: "cat-needs",
  is_default: true,
  monthly_limit: 1000,
  name: "Housing",
};
const wantsCategory = {
  group_type: "wants",
  icon: "🛍️",
  id: "cat-wants",
  is_default: false,
  monthly_limit: 300,
  name: "Shopping",
};
const savingsCategory = {
  group_type: "savings",
  icon: "📈",
  id: "cat-savings",
  is_default: true,
  monthly_limit: 500,
  name: "Investments",
};
const creditCard = {
  closing_day: 3,
  due_day: 10,
  id: "pm-credit",
  name: "Nubank",
  type: "credit",
};

// Some credit cards have no closing_day on file, so getFinancialMonth falls
// back to due_day.
const creditCardNoClosingDay = {
  closing_day: null,
  due_day: 10,
  id: "pm-credit-no-closing",
  name: "Nubank (no closing day)",
  type: "credit",
};

function row(overrides: RowOverrides = {}) {
  return {
    id: "tx-default",
    advanced_at: null,
    advanced_to_month: null,
    amount: 100,
    category_id: null,
    categories: null,
    date: "2026-07-10",
    description: "Groceries",
    installment_group_id: null,
    installment_number: null,
    installment_total: null,
    kind: "expense",
    notes: null,
    payment_method_id: null,
    payment_methods: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listTransactions", () => {
  it("loads transactions with no month filter and no future/previous flags", async () => {
    setup([
      qb({
        data: [
          row({ id: "a", amount: 50, kind: "income", date: "2026-07-01" }),
          row({ id: "b", amount: 20, date: "2026-07-02" }),
        ],
        error: null,
      }),
    ]);

    const result = await listTransactions();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ amount: 50, id: "a", type: "income" });
    expect(result[0].isPlanned).toBeUndefined();
  });

  it("applies a result limit when provided", async () => {
    const supabase = setup([qb({ data: [row({ id: "a" })], error: null })]);
    const result = await listTransactions({ limit: 5 });
    expect(result).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("defaults to an empty array when the query succeeds with no data", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(listTransactions()).resolves.toEqual([]);
  });

  it("throws when the query fails with a real database error", async () => {
    setup([qb({ data: null, error: { code: "XXPGERR", message: "db exploded" } })]);
    await expect(listTransactions()).rejects.toThrow(
      "Unable to load transactions: db exploded",
    );
  });

  it("falls back to the legacy column set when advanced_at/advanced_to_month are missing (42703)", async () => {
    setup([
      qb({ data: null, error: { code: "42703", message: "col missing" } }),
      qb({ data: [row({ id: "fallback-row" })], error: null }),
    ]);
    const result = await listTransactions({ month: "2026-07" });
    expect(result.map((t) => t.id)).toEqual(["fallback-row"]);
  });

  it("defaults to an empty array when the fallback query succeeds with no data", async () => {
    setup([
      qb({ data: null, error: { code: "42703", message: "col missing" } }),
      qb({ data: null, error: null }),
    ]);
    const result = await listTransactions({ month: "2026-07" });
    expect(result).toEqual([]);
  });

  it("throws when the fallback query also fails", async () => {
    setup([
      qb({ data: null, error: { code: "42703", message: "col missing" } }),
      qb({ data: null, error: { message: "fallback broke" } }),
    ]);
    await expect(listTransactions({ month: "2026-07" })).rejects.toThrow(
      "Unable to load transactions: fallback broke",
    );
  });

  it("merges advanced-installment rows for a future month view, skipping duplicate ids", async () => {
    setup([
      qb({ data: [row({ id: "a" })], error: null }),
      qb({ data: [row({ id: "a" }), row({ id: "b" })], error: null }),
    ]);
    const result = await listTransactions({
      includeFuture: true,
      month: "2026-07",
    });
    expect(result.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("ignores an advanced-installment query error when the column is missing (42703)", async () => {
    setup([
      qb({ data: [row({ id: "a" })], error: null }),
      qb({ data: null, error: { code: "42703", message: "nope" } }),
    ]);
    const result = await listTransactions({
      includeFuture: true,
      month: "2026-07",
    });
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("throws when the advanced-installment query fails for another reason", async () => {
    setup([
      qb({ data: [row({ id: "a" })], error: null }),
      qb({ data: null, error: { message: "boom" } }),
    ]);
    await expect(
      listTransactions({ includeFuture: true, month: "2026-07" }),
    ).rejects.toThrow("Unable to load advanced installments: boom");
  });

  it("keeps only the selected financial month when includePrevious is not set", async () => {
    setup([
      qb({
        data: [
          row({ id: "june", date: "2026-06-15" }),
          row({ id: "july", date: "2026-07-15" }),
        ],
        error: null,
      }),
    ]);
    const result = await listTransactions({ month: "2026-07" });
    expect(result.map((t) => t.id)).toEqual(["july"]);
  });

  it("keeps every financial month up to the selected one when includePrevious is set", async () => {
    setup([
      qb({
        data: [
          row({ id: "june", date: "2026-06-15" }),
          row({ id: "july", date: "2026-07-15" }),
          row({
            id: "next-month-cc",
            date: "2026-07-25",
            payment_method_id: "pm-credit",
            payment_methods: creditCard,
          }),
        ],
        error: null,
      }),
    ]);
    const result = await listTransactions({
      includePrevious: true,
      month: "2026-07",
    });
    // next-month-cc closes after day 3, so its financial month is 2026-08 —
    // beyond the selected month, even with includePrevious.
    expect(result.map((t) => t.id).sort()).toEqual(["july", "june"].sort());
  });

  it("falls back to the card's due_day for the financial month when it has no closing_day", async () => {
    setup([
      qb({
        data: [
          row({
            id: "past-due-day",
            date: "2026-07-15",
            payment_method_id: "pm-credit-no-closing",
            payment_methods: creditCardNoClosingDay,
          }),
        ],
        error: null,
      }),
    ]);
    const result = await listTransactions({ month: "2026-08" });
    // Day 15 is after due_day 10, so the financial month rolls to 2026-08.
    expect(result.map((t) => t.id)).toEqual(["past-due-day"]);
  });

  it("filters by the literal transaction/advanced-to-month date when useFinancialMonth is false", async () => {
    setup([
      qb({
        data: [
          row({ id: "advanced-match", advanced_to_month: "2026-07", date: "2026-05-01" }),
          row({ id: "advanced-miss", advanced_to_month: "2026-06", date: "2026-05-01" }),
          row({ id: "date-match", date: "2026-07-20" }),
          row({ id: "date-miss", date: "2026-08-01" }),
        ],
        error: null,
      }),
    ]);
    const result = await listTransactions({
      month: "2026-07",
      useFinancialMonth: false,
    });
    expect(result.map((t) => t.id).sort()).toEqual(
      ["advanced-match", "date-match"].sort(),
    );
  });

  it("includes prior months by literal date/advanced-to-month when both useFinancialMonth and includePrevious are false-then-true", async () => {
    setup([
      qb({
        data: [
          row({ id: "advanced-prior", advanced_to_month: "2026-06", date: "2026-05-01" }),
          row({ id: "date-prior", date: "2026-05-15" }),
          row({ id: "date-future", date: "2026-08-01" }),
        ],
        error: null,
      }),
    ]);
    const result = await listTransactions({
      includePrevious: true,
      month: "2026-07",
      useFinancialMonth: false,
    });
    expect(result.map((t) => t.id).sort()).toEqual(
      ["advanced-prior", "date-prior"].sort(),
    );
  });

  it("synthesizes a credit-card invoice and drops the underlying purchase by default", async () => {
    setup([
      qb({
        data: [
          row({
            id: "purchase-1",
            amount: 150,
            date: "2026-07-02",
            payment_method_id: "pm-credit",
            payment_methods: creditCard,
          }),
        ],
        error: null,
      }),
    ]);
    const result = await listTransactions({
      includeCreditCardInvoices: true,
      month: "2026-07",
    });
    expect(result.find((t) => t.id === "purchase-1")).toBeUndefined();
    const invoice = result.find((t) => t.isCreditCardInvoice);
    expect(invoice).toBeDefined();
  });

  it("preserves the underlying purchase (flagged) when preserveCreditCardInvoicePurchases is set", async () => {
    setup([
      qb({
        data: [
          row({
            id: "purchase-1",
            amount: 150,
            date: "2026-07-02",
            payment_method_id: "pm-credit",
            payment_methods: creditCard,
          }),
        ],
        error: null,
      }),
    ]);
    const result = await listTransactions({
      includeCreditCardInvoices: true,
      month: "2026-07",
      preserveCreditCardInvoicePurchases: true,
    });
    const purchase = result.find((t) => t.id === "purchase-1");
    expect(purchase?.isCreditCardInvoicePurchase).toBe(true);
    expect(result.some((t) => t.isCreditCardInvoice)).toBe(true);
  });

  it("leaves transactions untouched when includeCreditCardInvoices is set without a month", async () => {
    setup([
      qb({
        data: [
          row({
            id: "purchase-1",
            date: "2026-07-02",
            payment_method_id: "pm-credit",
            payment_methods: creditCard,
          }),
        ],
        error: null,
      }),
    ]);
    const result = await listTransactions({ includeCreditCardInvoices: true });
    expect(result.map((t) => t.id)).toEqual(["purchase-1"]);
  });

  it("marks future-dated rows and credit-card invoices as planned when includeFuture is set", async () => {
    setup([
      qb({
        data: [
          row({ id: "past", date: "2026-07-01" }),
          row({ id: "future", date: "2026-07-25" }),
        ],
        error: null,
      }),
      qb({ data: [], error: null }),
    ]);
    const result = await listTransactions({
      includeFuture: true,
      month: "2026-07",
    });
    expect(result.find((t) => t.id === "past")?.isPlanned).toBeUndefined();
    expect(result.find((t) => t.id === "future")?.isPlanned).toBe(true);
  });

  it("excludes paused subscription occurrences by default and includes them when requested", async () => {
    setup([
      qb({
        data: [
          row({ id: "active-sub", notes: "subscription 3/12" }),
          row({ id: "paused-sub", notes: "subscription paused 4/12" }),
        ],
        error: null,
      }),
    ]);
    const defaultResult = await listTransactions({ month: "2026-07" });
    expect(defaultResult.map((t) => t.id)).toEqual(["active-sub"]);

    setup([
      qb({
        data: [
          row({ id: "active-sub", notes: "subscription 3/12" }),
          row({ id: "paused-sub", notes: "subscription paused 4/12" }),
        ],
        error: null,
      }),
    ]);
    const withPaused = await listTransactions({
      includePausedSubscriptions: true,
      month: "2026-07",
    });
    expect(withPaused.map((t) => t.id).sort()).toEqual(
      ["active-sub", "paused-sub"].sort(),
    );
  });

  it("reuses a supplied userContext instead of authenticating again", async () => {
    const supabase = setup([qb({ data: [row({ id: "a" })], error: null })]);
    const ctx = makeCtx(supabase);
    const result = await listTransactions({ userContext: ctx as never });
    expect(result).toHaveLength(1);
    expect(supabase.auth.getClaims).not.toHaveBeenCalled();
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });
});

describe("getMonthlySummary", () => {
  it("returns zero totals for a month with no transactions", async () => {
    setup([qb({ data: [], error: null })]);
    const result = await getMonthlySummary("2026-07");
    expect(result).toEqual({
      totalExpenses: 0,
      totalIncome: 0,
      totalSavings: 0,
    });
  });

  it("sums income, expense, and saving transactions for the month", async () => {
    setup([
      qb({
        data: [
          row({ id: "inc", amount: 1000, kind: "income" }),
          row({ id: "exp-1", amount: 100 }),
          row({ id: "exp-2", amount: 50 }),
          row({ id: "sav", amount: 200, kind: "saving" }),
        ],
        error: null,
      }),
    ]);
    const result = await getMonthlySummary("2026-07");
    expect(result).toEqual({
      totalExpenses: 150,
      totalIncome: 1000,
      totalSavings: 200,
    });
  });

  it("falls back to the current month when no/invalid month is passed", async () => {
    setup([
      qb({
        data: [row({ id: "current-month", amount: 500, kind: "income", date: "2026-07-05" })],
        error: null,
      }),
    ]);
    const result = await getMonthlySummary("not-a-month");
    expect(result.totalIncome).toBe(500);
  });
});

describe("getDashboardData", () => {
  it("computes dashboard data without an explicit userContext", async () => {
    const supabase = makeTableSupabase({
      categories: [{ data: [], error: null }],
      payment_methods: [{ data: [], error: null }],
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getDashboardData("2026-07");
    expect(result.summaryData.totalIncome).toBe(0);
  });

  it("aggregates income, expenses, budgets, trends, and merges the latest transactions", async () => {
    const actualDataset = [
      row({ id: "inc-1", amount: 5000, kind: "income", date: "2026-07-05" }),
      row({
        id: "exp-needs-1",
        amount: 200,
        category_id: "cat-needs",
        categories: needsCategory,
        date: "2026-07-10",
      }),
      row({
        id: "exp-wants-cc-1",
        amount: 150,
        category_id: "cat-wants",
        categories: wantsCategory,
        date: "2026-07-02",
        payment_method_id: "pm-credit",
        payment_methods: creditCard,
      }),
      row({
        id: "sav-1",
        amount: 300,
        category_id: "cat-savings",
        categories: savingsCategory,
        date: "2026-07-08",
        kind: "saving",
      }),
      row({
        id: "sub-active",
        amount: 40,
        category_id: "cat-wants",
        categories: wantsCategory,
        date: "2026-07-01",
        notes: "subscription 3/12",
      }),
      row({ id: "sub-paused", amount: 40, date: "2026-07-01", notes: "subscription paused 4/12" }),
    ];
    const previousDataset = [
      row({ id: "prev-inc", amount: 4000, kind: "income", date: "2026-06-05" }),
      row({
        id: "prev-exp",
        amount: 250,
        category_id: "cat-needs",
        categories: needsCategory,
        date: "2026-06-10",
      }),
    ];
    const scheduledDataset = [
      ...actualDataset,
      row({ id: "future-exp", amount: 80, date: "2026-07-20" }),
    ];
    const trendDataset = [
      row({ id: "trend-04", amount: 60, date: "2026-04-15" }),
      row({ id: "trend-06", amount: 70, date: "2026-06-20" }),
      row({
        id: "trend-07a",
        amount: 150,
        category_id: "cat-wants",
        categories: wantsCategory,
        date: "2026-07-02",
        payment_method_id: "pm-credit",
        payment_methods: creditCard,
      }),
      row({
        id: "trend-07b-next-month",
        amount: 90,
        date: "2026-07-25",
        payment_method_id: "pm-credit",
        payment_methods: creditCard,
      }),
      row({ id: "trend-income", amount: 999, kind: "income", date: "2026-07-05" }),
    ];
    const displayDataset = [
      row({
        id: "disp-1",
        amount: 120,
        category_id: "cat-needs",
        categories: needsCategory,
        date: "2026-07-10",
      }),
      row({
        id: "disp-cc-1",
        amount: 150,
        category_id: "cat-wants",
        categories: wantsCategory,
        date: "2026-07-02",
        payment_method_id: "pm-credit",
        payment_methods: creditCard,
      }),
    ];
    const displayScheduledDataset = [
      ...displayDataset,
      row({
        id: "future-only-1",
        amount: 75,
        category_id: "cat-needs",
        categories: needsCategory,
        date: "2026-07-25",
      }),
      row({
        id: "future-only-2",
        amount: 20,
        category_id: "cat-needs",
        categories: needsCategory,
        date: "2026-07-01",
      }),
    ];

    const supabase = makeTableSupabase({
      categories: [{ data: [needsCategory, wantsCategory, savingsCategory], error: null }],
      payment_methods: [{ data: [creditCard], error: null }],
      transactions: [
        { data: actualDataset, error: null },
        { data: previousDataset, error: null },
        { data: scheduledDataset, error: null },
        { data: trendDataset, error: null },
        { data: displayDataset, error: null },
        { data: displayScheduledDataset, error: null },
        // Trailing entries feed the extra advanced-installment-merge
        // queries that fire for the two includeFuture:true calls above
        // (scheduledDataset/displayScheduledDataset); keep them empty so
        // they don't inject unrelated rows into those results.
        { data: [], error: null },
        { data: [], error: null },
      ],
    });
    supabase.rpc.mockImplementation(
      (_fn: string, args: { p_selected_month: string }) =>
        Promise.resolve({
          data: args.p_selected_month === "2026-07-01" ? 5300 : 4800,
          error: null,
        }),
    );

    const ctx = makeCtx(supabase);
    const result = await getDashboardData("2026-07", ctx as never);

    expect(result.summaryData.totalIncome).toBe(5000);
    expect(result.summaryData.totalExpenses).toBe(390);
    expect(result.summaryData.currentBalance).toBe(4610);
    expect(result.summaryData.predictedExpenses).toBe(470);
    expect(result.summaryData.totalSaved).toBe(5300);
    expect(result.summaryData.trends.totalIncome).toBe(25);
    expect(result.summaryData.trends.totalExpenses).toBe(56);
    expect(result.summaryData.trends.totalSaved).toBeCloseTo(10.4, 1);

    expect(result.budgetData.needs.spent).toBe(200);
    expect(result.budgetData.wants.spent).toBe(190);
    expect(result.budgetData.savings.spent).toBe(300);
    expect(result.budgetSplitData).toHaveLength(3);

    const julyBucket = result.expensesOverTime.find(
      (bucket) => bucket.monthKey === "data.month.jul",
    );
    expect(julyBucket?.amount).toBe(150);
    expect(julyBucket?.plannedAmount).toBe(470);
    expect(result.expensesOverTime).toHaveLength(6);

    expect(result.dailyExpensesOverTime.map((entry) => entry.date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-10",
    ]);

    expect(result.categories).toHaveLength(3);
    expect(result.paymentMethods).toHaveLength(1);

    const latestIds = result.latestTransactions.map((t) => t.id);
    expect(latestIds).toContain("disp-1");
    expect(latestIds).toContain("future-only-1");
    expect(latestIds).toContain("future-only-2");
    expect(
      result.latestTransactions.find((t) => t.id === "future-only-1")?.isPlanned,
    ).toBe(true);
    expect(
      result.latestTransactions.find((t) => t.id === "future-only-2")?.isPlanned,
    ).toBe(false);
  });

  it("returns an all-zero dashboard for a month with no activity anywhere", async () => {
    const supabase = makeTableSupabase({
      categories: [{ data: [], error: null }],
      payment_methods: [{ data: [], error: null }],
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: 0, error: null });

    const ctx = makeCtx(supabase);
    const result = await getDashboardData("2026-07", ctx as never);

    expect(result.summaryData.totalIncome).toBe(0);
    expect(result.summaryData.totalExpenses).toBe(0);
    expect(result.summaryData.totalSaved).toBe(0);
    expect(result.summaryData.trends.totalIncome).toBe(0);
    expect(result.summaryData.trends.totalExpenses).toBe(0);
    expect(result.summaryData.trends.totalSaved).toBe(0);
    expect(result.latestTransactions).toEqual([]);
    // No categories/payment methods on file falls back to the sentinel
    // "none" placeholder options.
    expect(result.categories).toEqual([
      { group: "wants", id: "none", icon: "🏷️", label: "none", monthlyLimit: 0 },
    ]);
    expect(result.paymentMethods).toEqual([
      { id: "none", label: "none", type: "cash" },
    ]);
  });

  it("reports a 100% trend when the previous month had no activity but this one does", async () => {
    const supabase = makeTableSupabase({
      categories: [{ data: [], error: null }],
      payment_methods: [{ data: [], error: null }],
      transactions: [
        {
          data: [row({ id: "inc", amount: 500, kind: "income", date: "2026-07-05" })],
          error: null,
        },
        { data: [], error: null },
      ],
    });
    supabase.rpc.mockImplementation(
      (_fn: string, args: { p_selected_month: string }) =>
        Promise.resolve({
          data: args.p_selected_month === "2026-07-01" ? 500 : 0,
          error: null,
        }),
    );

    const ctx = makeCtx(supabase);
    const result = await getDashboardData("2026-07", ctx as never);

    expect(result.summaryData.trends.totalIncome).toBe(100);
    expect(result.summaryData.trends.totalSaved).toBe(100);
  });

  it("defaults total saved to 0 when the rpc call succeeds with no data", async () => {
    const supabase = makeTableSupabase({
      categories: [{ data: [], error: null }],
      payment_methods: [{ data: [], error: null }],
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const ctx = makeCtx(supabase);
    const result = await getDashboardData("2026-07", ctx as never);
    expect(result.summaryData.totalSaved).toBe(0);
  });

  it("throws when the total-saved rpc call fails", async () => {
    const supabase = makeTableSupabase({
      categories: [{ data: [], error: null }],
      payment_methods: [{ data: [], error: null }],
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const ctx = makeCtx(supabase);
    await expect(getDashboardData("2026-07", ctx as never)).rejects.toThrow(
      "Unable to calculate total saved: boom",
    );
  });
});

describe("getReportsData", () => {
  it("builds monthly reports (newest first) over the default 6-month period", async () => {
    const dataset = [
      row({ id: "old", amount: 1000, kind: "income", date: "2025-12-15" }),
      row({ id: "feb", amount: 100, date: "2026-02-10" }),
      row({ id: "apr-inc", amount: 300, kind: "income", date: "2026-04-05" }),
      row({ id: "apr-sav", amount: 50, kind: "saving", date: "2026-04-06" }),
      row({
        id: "jun-cc",
        amount: 80,
        date: "2026-06-02",
        payment_method_id: "pm-credit",
        payment_methods: creditCard,
      }),
      row({
        id: "jul-cc-next-month",
        amount: 90,
        date: "2026-07-25",
        payment_method_id: "pm-credit",
        payment_methods: creditCard,
      }),
      row({ id: "jul-normal", amount: 200, date: "2026-07-10" }),
      row({ id: "jul-income", amount: 5000, kind: "income", date: "2026-07-01" }),
    ];

    const supabase = makeTableSupabase({
      transactions: [{ data: dataset, error: null }],
    });
    const netWorthByMonth: Record<string, number> = {
      "2026-01-01": 1000,
      "2026-02-01": 1100,
      "2026-03-01": 1100,
      "2026-04-01": 1450,
      "2026-05-01": 1450,
      "2026-06-01": 1530,
      "2026-07-01": 6540,
    };
    supabase.rpc.mockImplementation(
      (_fn: string, args: { p_selected_month: string }) =>
        Promise.resolve({ data: netWorthByMonth[args.p_selected_month] ?? 0, error: null }),
    );
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getReportsData("2026-07");

    expect(result.periodMonths).toBe(6);
    expect(result.selectedMonth).toBe("2026-07");
    expect(result.monthlyReports).toHaveLength(6);
    expect(result.monthlyReports[0].month).toBe("2026-07");
    expect(result.monthlyReports[0].income).toBe(5000);
    expect(result.monthlyReports[0].expenses).toBe(200);
    expect(result.monthlyReports[0].netWorth).toBe(6540);
    expect(result.monthlyReports[0].savings).toBe(6540 - 1530);
    expect(result.monthlyReports.at(-1)?.month).toBe("2026-02");

    // jul-cc-next-month rolls into the (out of range) 2026-08 financial
    // month and old predates the whole window — both excluded.
    expect(result.transactions.map((t) => t.date)).not.toContain("2026-07-25");
    expect(result.transactions.map((t) => t.date)).not.toContain("2025-12-15");
    expect(result.transactions).toHaveLength(6);
  });

  it("falls back to the current month and 6 months when no arguments are given", async () => {
    const supabase = makeTableSupabase({
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getReportsData();
    expect(result.periodMonths).toBe(6);
    expect(result.monthlyReports).toHaveLength(6);
  });

  it("clamps a period below the minimum to 1 month", async () => {
    const supabase = makeTableSupabase({
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getReportsData("2026-07", -5);
    expect(result.periodMonths).toBe(1);
    expect(result.monthlyReports).toHaveLength(1);
  });

  it("clamps a period above the maximum to 12 months", async () => {
    const supabase = makeTableSupabase({
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getReportsData("2026-07", 99);
    expect(result.periodMonths).toBe(12);
    expect(result.monthlyReports).toHaveLength(12);
  });

  it("falls back to 6 months when periodMonths is NaN", async () => {
    const supabase = makeTableSupabase({
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getReportsData("2026-07", Number.NaN);
    expect(result.periodMonths).toBe(6);
  });
});

describe("getBudgetOverviewData", () => {
  it("combines dashboard and category data without an explicit userContext", async () => {
    const supabase = makeTableSupabase({
      categories: [{ data: [], error: null }],
      payment_methods: [{ data: [], error: null }],
      transactions: [{ data: [], error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getBudgetOverviewData("2026-07");
    expect(Array.isArray(result.categories)).toBe(true);
  });

  it("combines the dashboard budget data with the category overview", async () => {
    const dataset = [
      row({ id: "inc", amount: 1000, kind: "income", date: "2026-07-05" }),
      row({
        id: "exp",
        amount: 100,
        category_id: "cat-needs",
        categories: needsCategory,
        date: "2026-07-10",
      }),
    ];
    const supabase = makeTableSupabase({
      categories: [{ data: [needsCategory], error: null }],
      payment_methods: [{ data: [], error: null }],
      transactions: [{ data: dataset, error: null }],
    });
    supabase.rpc.mockResolvedValue({ data: 0, error: null });

    const ctx = makeCtx(supabase);
    const dashboard = await getDashboardData("2026-07", ctx as never);
    const result = await getBudgetOverviewData("2026-07", ctx as never);

    expect(result.budgetData).toEqual(dashboard.budgetData);
    expect(result.budgetSplitData).toEqual(dashboard.budgetSplitData);
    expect(Array.isArray(result.categories)).toBe(true);
    expect(result.categories.length).toBeGreaterThan(0);
  });
});
