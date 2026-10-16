import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/crypto/field-encryption", () => ({
  decryptDescription: (value: string | null | undefined) => value ?? null,
  decryptField: (value: string | null | undefined) => value ?? null,
  encryptDescription: (value: string) => value,
  encryptField: (value: string | null | undefined) => value ?? null,
  isAlreadyEncrypted: () => false,
}));

import { createClient } from "@/lib/supabase/server";
import {
  advanceInstallments,
  amortizeDebt,
  createInvoiceAdvancePayment,
  createTransaction,
  deleteInstallments,
  deleteTransaction,
  getFinancingBreakdown,
  listDebtOverview,
  previewInstallmentPrepayment,
  replaceTransaction,
  updateTransaction,
} from "@/lib/finance/transactions";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";
const GOAL_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PAYMENT_METHOD_ID = "33333333-3333-4333-8333-333333333333";
const TRANSACTION_ID = "88888888-8888-4888-8888-888888888888";
const INSTALLMENT_ANCHOR_ID = "99999999-9999-4999-9999-999999999999";
const LAST_INSTALLMENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INVOICE_CREDIT_CARD_ID = "77777777-7777-4777-8777-777777777777";

// Same chainable fake query builder pattern as transactions-crud.test.ts, with
// optional onInsert/onUpdate hooks so we can assert on the exact payload sent
// to Supabase for the multi-row installment insert path.
function qb(
  response: { data?: unknown; error?: unknown },
  hooks: { onInsert?: (rows: unknown) => void; onUpdate?: (payload: unknown) => void } = {},
) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    delete: chain,
    eq: chain,
    gt: chain,
    gte: chain,
    in: chain,
    insert: (rows: unknown) => {
      hooks.onInsert?.(rows);
      return builder;
    },
    is: chain,
    like: chain,
    limit: chain,
    lte: chain,
    maybeSingle: chain,
    neq: chain,
    not: chain,
    order: chain,
    range: chain,
    select: chain,
    single: chain,
    update: (payload: unknown) => {
      hooks.onUpdate?.(payload);
      return builder;
    },
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
  captureBatch(supabase);
  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return supabase;
}

type BatchCall = {
  plan: Record<string, unknown> | null;
  rows: Record<string, unknown>[];
  deleteIds: string[] | null;
};

// Routes the atomic save_transaction_batch rpc to a recorder; any other rpc
// answers with the saved total.
let batchCalls: BatchCall[] = [];

function captureBatch(
  supabase: ReturnType<typeof makeSupabase>,
  opts: { error?: unknown; savedTotal?: number } = {},
) {
  const calls: BatchCall[] = [];
  batchCalls = calls;
  supabase.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
    if (name !== "save_transaction_batch") {
      return { data: opts.savedTotal ?? 0, error: null };
    }
    calls.push({
      plan: args.p_plan as BatchCall["plan"],
      rows: args.p_rows as BatchCall["rows"],
      deleteIds: args.p_delete_ids as BatchCall["deleteIds"],
    });
    return { error: opts.error ?? null };
  });
  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTransaction", () => {
  const validInput = {
    type: "expense" as const,
    date: "2030-01-15",
    amount: 100,
    category: "none",
    paymentMethod: "none",
    installmentCount: 1,
    description: "Groceries",
  };

  it("throws for an empty description", async () => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, description: "  " }),
    ).rejects.toThrow("Description is required.");
  });

  it("throws for a too-long description", async () => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, description: "a".repeat(161) }),
    ).rejects.toThrow("Description is too long.");
  });

  it("throws for a too-long notes field", async () => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, notes: "a".repeat(501) }),
    ).rejects.toThrow("Text field is too long.");
  });

  it("throws for a non-positive amount", async () => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, amount: 0 }),
    ).rejects.toThrow("Amount must be greater than zero.");
  });

  it("throws for an invalid transaction type", async () => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, type: "bogus" as never }),
    ).rejects.toThrow("Transaction type is invalid.");
  });

  it("throws for an invalid category id", async () => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, category: "not-a-uuid" }),
    ).rejects.toThrow("Category is invalid.");
  });

  it("throws for an invalid payment method id", async () => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, paymentMethod: "not-a-uuid" }),
    ).rejects.toThrow("Payment method is invalid.");
  });

  it("throws for an invalid date", async () => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, date: "not-a-date" }),
    ).rejects.toThrow("Transaction date is invalid.");
  });

  it("throws when the category does not belong to the user", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      createTransaction({ ...validInput, category: CATEGORY_ID }),
    ).rejects.toThrow("Category is invalid.");
  });

  it("throws when the payment method does not belong to the user", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      createTransaction({ ...validInput, paymentMethod: PAYMENT_METHOD_ID }),
    ).rejects.toThrow("Payment method is invalid.");
  });

  it("throws when validating the category errors", async () => {
    setup([qb({ data: null, error: { message: "category boom" } })]);
    await expect(
      createTransaction({ ...validInput, category: CATEGORY_ID }),
    ).rejects.toThrow("Unable to validate category: category boom");
  });

  it("throws when validating the payment method errors", async () => {
    setup([qb({ data: null, error: { message: "pm boom" } })]);
    await expect(
      createTransaction({ ...validInput, paymentMethod: PAYMENT_METHOD_ID }),
    ).rejects.toThrow("Unable to validate payment method: pm boom");
  });

  it.each([
    ["a non-integer", 2.5],
    ["below 1", 0],
    ["above 120", 121],
  ])("throws for an installment count that is %s", async (_label, installmentCount) => {
    setup([]);
    await expect(
      createTransaction({ ...validInput, installmentCount }),
    ).rejects.toThrow("Installment count is invalid.");
  });

  it("converts a dd/MM/yyyy date to ISO before saving", async () => {
    let captured: unknown;
    setup([qb({ error: null }, { onInsert: (rows) => (captured = rows) })]);
    await expect(
      createTransaction({ ...validInput, date: "15/01/2030" }),
    ).resolves.toBeUndefined();
    expect(
      Array.isArray(captured) && (captured[0] as { date: string }).date,
    ).toBe("2030-01-15");
  });

  it("creates a single income transaction (category forced null)", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(
      createTransaction({ ...validInput, type: "income" }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("trims and stores a non-empty notes field", async () => {
    let captured: unknown;
    setup([qb({ error: null }, { onInsert: (rows) => (captured = rows) })]);
    await expect(
      createTransaction({ ...validInput, notes: "  Buy milk  " }),
    ).resolves.toBeUndefined();
    expect(
      Array.isArray(captured) && (captured[0] as { notes: string }).notes,
    ).toBe("Buy milk");
  });

  it("creates a single saving transaction even with installmentCount > 1", async () => {
    let captured: unknown;
    setup([qb({ error: null }, { onInsert: (rows) => (captured = rows) })]);
    await expect(
      createTransaction({
        ...validInput,
        type: "saving",
        installmentCount: 5,
      }),
    ).resolves.toBeUndefined();
    expect(Array.isArray(captured) && captured.length).toBe(1);
  });

  it("creates multiple installment rows for an expense purchase", async () => {
    let captured: unknown;
    setup([qb({ error: null }, { onInsert: (rows) => (captured = rows) })]);
    await expect(
      createTransaction({
        ...validInput,
        type: "expense",
        amount: 300,
        installmentCount: 3,
      }),
    ).resolves.toBeUndefined();
    expect(Array.isArray(captured) && captured.length).toBe(3);
  });

  it("throws when the insert fails", async () => {
    setup([qb({ error: { message: "insert failed" } })]);
    await expect(createTransaction(validInput)).rejects.toThrow(
      "Unable to save transaction: insert failed",
    );
  });

  it("does not filter any occurrence when the user's created_at is unparseable", async () => {
    let captured: unknown;
    setup(
      [qb({ error: null }, { onInsert: (rows) => (captured = rows) })],
      { createdAt: "not-a-real-date" },
    );
    await expect(createTransaction(validInput)).resolves.toBeUndefined();
    expect(Array.isArray(captured) && captured.length).toBe(1);
  });

  it("throws when every occurrence falls before the user creation month", async () => {
    setup([], { createdAt: "2030-03-01T00:00:00.000Z" });
    await expect(
      createTransaction({ ...validInput, date: "2030-01-15" }),
    ).rejects.toThrow(
      "Transaction date cannot be earlier than the user creation month.",
    );
  });

  it("drops only the occurrences before the user creation month", async () => {
    let captured: unknown;
    setup(
      [qb({ error: null }, { onInsert: (rows) => (captured = rows) })],
      { createdAt: "2030-02-01T00:00:00.000Z" },
    );
    await expect(
      createTransaction({
        ...validInput,
        type: "expense",
        amount: 300,
        installmentCount: 3,
        date: "2030-01-15",
      }),
    ).resolves.toBeUndefined();
    expect(Array.isArray(captured) && captured.length).toBe(2);
  });
});

describe("createInvoiceAdvancePayment", () => {
  const invoiceMonth = "2030-08";
  const invoiceId = `credit-card-invoice:${INVOICE_CREDIT_CARD_ID}:${invoiceMonth}`;
  const validInput = {
    amount: 150,
    date: "2030-08-05",
    invoiceId,
    paymentMethod: "none",
  };
  const purchaseRow = {
    id: "purchase-1",
    amount: 200,
    date: "2030-07-15",
    description: "Purchase",
    kind: "expense" as const,
    notes: null,
    categories: null,
    category_id: null,
    payment_method_id: INVOICE_CREDIT_CARD_ID,
    payment_methods: {
      id: INVOICE_CREDIT_CARD_ID,
      name: "Nubank",
      type: "credit" as const,
      closing_day: 3,
      due_day: 10,
      credit_limit: 1000,
    },
  };

  it("throws for a non-positive amount", async () => {
    setup([]);
    await expect(
      createInvoiceAdvancePayment({ ...validInput, amount: 0 }),
    ).rejects.toThrow("Amount must be greater than zero.");
  });

  it("throws for an invalid date", async () => {
    setup([]);
    await expect(
      createInvoiceAdvancePayment({ ...validInput, date: "not-a-date" }),
    ).rejects.toThrow("Transaction date is invalid.");
  });

  it("throws when the date is before the user's creation month", async () => {
    setup([], { createdAt: "2030-09-01T00:00:00.000Z" });
    await expect(
      createInvoiceAdvancePayment({ ...validInput, date: "2030-01-01" }),
    ).rejects.toThrow(
      "Transaction date cannot be earlier than the user creation month.",
    );
  });

  it("throws for an invalid invoice id format", async () => {
    setup([]);
    await expect(
      createInvoiceAdvancePayment({ ...validInput, invoiceId: "bad-invoice" }),
    ).rejects.toThrow("Invoice is invalid.");
  });

  it("throws when validating the invoice payment method errors", async () => {
    setup([qb({ data: null, error: { message: "pm lookup boom" } })]);
    await expect(createInvoiceAdvancePayment(validInput)).rejects.toThrow(
      "Unable to validate invoice: pm lookup boom",
    );
  });

  it("throws when the invoice payment method is missing", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(createInvoiceAdvancePayment(validInput)).rejects.toThrow(
      "Invoice is invalid.",
    );
  });

  it("throws when the invoice payment method is not a credit card", async () => {
    setup([
      qb({ data: { id: INVOICE_CREDIT_CARD_ID, type: "debit" }, error: null }),
    ]);
    await expect(createInvoiceAdvancePayment(validInput)).rejects.toThrow(
      "Invoice is invalid.",
    );
  });

  it("throws when the invoice is not found", async () => {
    setup([
      qb({ data: { id: INVOICE_CREDIT_CARD_ID, type: "credit" }, error: null }),
      qb({ data: [], error: null }),
      qb({ data: [], error: null }),
    ]);
    await expect(createInvoiceAdvancePayment(validInput)).rejects.toThrow(
      "Invoice is already paid or unavailable.",
    );
  });

  it("throws when the amount exceeds the remaining invoice", async () => {
    setup([
      qb({ data: { id: INVOICE_CREDIT_CARD_ID, type: "credit" }, error: null }),
      qb({ data: [purchaseRow], error: null }),
      qb({ data: [], error: null }),
    ]);
    await expect(
      createInvoiceAdvancePayment({ ...validInput, amount: 300 }),
    ).rejects.toThrow("Advance payment cannot exceed the remaining invoice.");
  });

  it("creates the advance payment on success", async () => {
    const supabase = setup([
      qb({ data: { id: INVOICE_CREDIT_CARD_ID, type: "credit" }, error: null }),
      qb({ data: [purchaseRow], error: null }),
      qb({ data: [], error: null }),
      qb({ error: null }),
    ]);
    await expect(
      createInvoiceAdvancePayment(validInput),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("throws when the insert fails", async () => {
    setup([
      qb({ data: { id: INVOICE_CREDIT_CARD_ID, type: "credit" }, error: null }),
      qb({ data: [purchaseRow], error: null }),
      qb({ data: [], error: null }),
      qb({ error: { message: "insert failed" } }),
    ]);
    await expect(createInvoiceAdvancePayment(validInput)).rejects.toThrow(
      "Unable to save invoice advance payment: insert failed",
    );
  });
});

describe("updateTransaction", () => {
  const validInput = {
    id: TRANSACTION_ID,
    type: "expense" as const,
    date: "2030-01-15",
    amount: 100,
    category: "none",
    paymentMethod: "none",
    description: "Groceries",
  };

  it("throws for an invalid id", async () => {
    setup([]);
    await expect(
      updateTransaction({ ...validInput, id: "bad-id" }),
    ).rejects.toThrow("Transaction is invalid.");
  });

  it("throws for an empty description", async () => {
    setup([]);
    await expect(
      updateTransaction({ ...validInput, description: "" }),
    ).rejects.toThrow("Description is required.");
  });

  it("throws for a non-positive amount", async () => {
    setup([]);
    await expect(
      updateTransaction({ ...validInput, amount: 0 }),
    ).rejects.toThrow("Amount must be greater than zero.");
  });

  it("throws for an invalid date", async () => {
    setup([]);
    await expect(
      updateTransaction({ ...validInput, date: "not-a-date" }),
    ).rejects.toThrow("Transaction date is invalid.");
  });

  it("throws when the date is before the user's creation month", async () => {
    setup([], { createdAt: "2030-06-01T00:00:00.000Z" });
    await expect(
      updateTransaction({ ...validInput, date: "2030-01-01" }),
    ).rejects.toThrow(
      "Transaction date cannot be earlier than the user creation month.",
    );
  });

  it("throws for an invalid transaction type", async () => {
    setup([]);
    await expect(
      updateTransaction({ ...validInput, type: "bogus" as never }),
    ).rejects.toThrow("Transaction type is invalid.");
  });

  it("throws when the category does not belong to the user", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      updateTransaction({ ...validInput, category: CATEGORY_ID }),
    ).rejects.toThrow("Category is invalid.");
  });

  it("throws when the payment method does not belong to the user", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      updateTransaction({ ...validInput, paymentMethod: PAYMENT_METHOD_ID }),
    ).rejects.toThrow("Payment method is invalid.");
  });

  it("updates a transaction with type income (category forced null)", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(
      updateTransaction({ ...validInput, type: "income" }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("updates a transaction with a real category and payment method", async () => {
    let capturedPayload: unknown;
    setup([
      qb({ data: { id: CATEGORY_ID }, error: null }),
      qb({ data: { id: PAYMENT_METHOD_ID }, error: null }),
      qb({ error: null }, { onUpdate: (payload) => (capturedPayload = payload) }),
    ]);
    await expect(
      updateTransaction({
        ...validInput,
        category: CATEGORY_ID,
        paymentMethod: PAYMENT_METHOD_ID,
        notes: "  some note  ",
      }),
    ).resolves.toBeUndefined();
    expect((capturedPayload as { notes: string }).notes).toBe("some note");
  });

  it("links, keeps and clears the goal on an expense", async () => {
    const payloads: Record<string, unknown>[] = [];
    const onUpdate = (payload: unknown) => payloads.push(payload as Record<string, unknown>);
    setup([
      qb({ data: { id: GOAL_ID }, error: null }),
      qb({ error: null }, { onUpdate }),
    ]);
    await updateTransaction({ ...validInput, goalId: GOAL_ID });
    setup([qb({ error: null }, { onUpdate })]);
    await updateTransaction(validInput);
    setup([qb({ error: null }, { onUpdate })]);
    await updateTransaction({ ...validInput, goalId: null });
    expect(payloads[0]).toMatchObject({ goal_id: GOAL_ID });
    expect(payloads[1]).not.toHaveProperty("goal_id");
    expect(payloads[2]).toMatchObject({ goal_id: null });
  });

  it("drops the goal link when the kind is no longer an expense", async () => {
    let payload: unknown;
    setup([qb({ error: null }, { onUpdate: (value) => (payload = value) })]);
    await updateTransaction({ ...validInput, type: "income", goalId: GOAL_ID });
    expect(payload).toMatchObject({ goal_id: null });
  });

  it("throws when the goal does not belong to the user", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      updateTransaction({ ...validInput, goalId: GOAL_ID }),
    ).rejects.toThrow("Goal is invalid.");
  });

  it("throws when the update fails", async () => {
    setup([qb({ error: { message: "update failed" } })]);
    await expect(updateTransaction(validInput)).rejects.toThrow(
      "Unable to update transaction: update failed",
    );
  });
});

describe("deleteTransaction", () => {
  it("throws for an invalid id", async () => {
    setup([]);
    await expect(deleteTransaction("bad-id")).rejects.toThrow(
      "Transaction is invalid.",
    );
  });

  it("deletes a transaction on success", async () => {
    const supabase = setup([qb({ error: null })]);
    await expect(deleteTransaction(TRANSACTION_ID)).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("throws when the delete fails", async () => {
    setup([qb({ error: { message: "delete failed" } })]);
    await expect(deleteTransaction(TRANSACTION_ID)).rejects.toThrow(
      "Unable to delete transaction: delete failed",
    );
  });
});

const GROUP_ID = "grp-installments-1";
const installmentGroupRows = [
  {
    id: "inst-1",
    amount: 100,
    date: "2030-01-01",
    description: "Purchase (1/4)",
    kind: "expense" as const,
    notes: "1/4",
    categories: null,
    category_id: null,
    payment_method_id: null,
    payment_methods: null,
    installment_group_id: GROUP_ID,
    installment_number: 1,
    installment_total: 4,
  },
  {
    id: INSTALLMENT_ANCHOR_ID,
    amount: 100,
    date: "2030-02-01",
    description: "Purchase (2/4)",
    kind: "expense" as const,
    notes: "2/4",
    categories: null,
    category_id: null,
    payment_method_id: null,
    payment_methods: null,
    installment_group_id: GROUP_ID,
    installment_number: 2,
    installment_total: 4,
  },
  {
    id: "inst-3",
    amount: 100,
    date: "2030-03-01",
    description: "Purchase (3/4)",
    kind: "expense" as const,
    notes: "3/4",
    categories: null,
    category_id: null,
    payment_method_id: null,
    payment_methods: null,
    installment_group_id: GROUP_ID,
    installment_number: 3,
    installment_total: 4,
  },
  {
    id: LAST_INSTALLMENT_ID,
    amount: 100,
    date: "2030-04-01",
    description: "Purchase (4/4)",
    kind: "expense" as const,
    notes: "4/4",
    categories: null,
    category_id: null,
    payment_method_id: null,
    payment_methods: null,
    installment_group_id: GROUP_ID,
    installment_number: 4,
    installment_total: 4,
  },
];
const anchorRow = installmentGroupRows[1];
const lastInstallmentRow = installmentGroupRows[3];
const nonInstallmentRow = {
  ...anchorRow,
  installment_group_id: null,
  installment_number: null,
  installment_total: null,
};

describe("deleteInstallments", () => {
  it("throws for an invalid transaction id", async () => {
    setup([]);
    await expect(
      deleteInstallments({ scope: "all", transactionId: "bad-id" }),
    ).rejects.toThrow("Transaction is invalid.");
  });

  it("delegates to deleteTransaction for scope 'single'", async () => {
    setup([qb({ error: null })]);
    await expect(
      deleteInstallments({
        scope: "single",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when loading the selected transaction errors", async () => {
    setup([qb({ data: null, error: { message: "boom" } })]);
    await expect(
      deleteInstallments({
        scope: "all",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Unable to load transaction: boom");
  });

  it("throws when the selected transaction is not found", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      deleteInstallments({
        scope: "all",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Transaction not found.");
  });

  it("delegates to deleteTransaction when the transaction is not an installment", async () => {
    setup([
      qb({ data: nonInstallmentRow, error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deleteInstallments({
        scope: "all",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when loading the installment group errors", async () => {
    setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: null, error: { message: "group failed" } }),
    ]);
    await expect(
      deleteInstallments({
        scope: "all",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Unable to load installments: group failed");
  });

  it("resolves without deleting when no installments are selected", async () => {
    setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: null, error: null }),
    ]);
    await expect(
      deleteInstallments({
        scope: "all",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("deletes this and following installments on success", async () => {
    const supabase = setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deleteInstallments({
        scope: "this_and_following",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("deletes all installments on success", async () => {
    setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
      qb({ error: null }),
    ]);
    await expect(
      deleteInstallments({
        scope: "all",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when the delete fails", async () => {
    setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
      qb({ error: { message: "delete failed" } }),
    ]);
    await expect(
      deleteInstallments({
        scope: "all",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Unable to delete installments: delete failed");
  });
});

describe("advanceInstallments", () => {
  it("throws for an invalid transaction id", async () => {
    setup([]);
    await expect(
      advanceInstallments({ targetMonth: "2030-01", transactionId: "bad-id" }),
    ).rejects.toThrow("Transaction is invalid.");
  });

  it("throws for an invalid target month", async () => {
    setup([]);
    await expect(
      advanceInstallments({
        targetMonth: "bad-month",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Target month is invalid.");
  });

  it("throws when loading the selected transaction errors", async () => {
    setup([qb({ data: null, error: { message: "boom" } })]);
    await expect(
      advanceInstallments({
        targetMonth: "2030-01",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Unable to load transaction: boom");
  });

  it("throws when the selected transaction is not found", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(
      advanceInstallments({
        targetMonth: "2030-01",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Transaction not found.");
  });

  it("throws when the transaction is not an installment", async () => {
    setup([qb({ data: nonInstallmentRow, error: null })]);
    await expect(
      advanceInstallments({
        targetMonth: "2030-01",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Transaction is not an installment.");
  });

  it("throws when there are no remaining future installments", async () => {
    setup([
      qb({ data: lastInstallmentRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
    ]);
    await expect(
      advanceInstallments({
        targetMonth: "2030-04",
        transactionId: LAST_INSTALLMENT_ID,
      }),
    ).rejects.toThrow("No remaining future installments to advance.");
  });

  it("advances every remaining installment by default", async () => {
    const supabase = setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
      qb({ error: null }),
    ]);
    await expect(
      advanceInstallments({
        targetMonth: "2030-01",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("transactions");
  });

  it("advances only the requested count of installments", async () => {
    setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
      qb({ error: null }),
    ]);
    await expect(
      advanceInstallments({
        count: 1,
        targetMonth: "2030-01",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("advances installments including the selected one for scope 'selected_and_remaining'", async () => {
    setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
      qb({ error: null }),
    ]);
    await expect(
      advanceInstallments({
        scope: "selected_and_remaining",
        targetMonth: "2030-01",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when the advance update fails", async () => {
    setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
      qb({ error: { message: "advance failed" } }),
    ]);
    await expect(
      advanceInstallments({
        targetMonth: "2030-01",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Unable to advance installments: advance failed");
  });
});

describe("previewInstallmentPrepayment", () => {
  it("throws for an invalid transaction id", async () => {
    setup([]);
    await expect(
      previewInstallmentPrepayment({
        targetMonth: "2030-01",
        transactionId: "bad-id",
      }),
    ).rejects.toThrow("Transaction is invalid.");
  });

  it("throws for an invalid target month", async () => {
    setup([]);
    await expect(
      previewInstallmentPrepayment({
        targetMonth: "bad-month",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Target month is invalid.");
  });

  it("throws when the transaction is not an installment", async () => {
    setup([qb({ data: nonInstallmentRow, error: null })]);
    await expect(
      previewInstallmentPrepayment({
        targetMonth: "2030-01",
        transactionId: INSTALLMENT_ANCHOR_ID,
      }),
    ).rejects.toThrow("Transaction is not an installment.");
  });

  it("returns an empty preview when there are no remaining installments", async () => {
    setup([
      qb({ data: lastInstallmentRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
    ]);
    await expect(
      previewInstallmentPrepayment({
        targetMonth: "2030-04",
        transactionId: LAST_INSTALLMENT_ID,
      }),
    ).resolves.toEqual({
      count: 0,
      installments: [],
      targetMonth: "2030-04",
      totalAmount: 0,
    });
  });

  it("returns a preview of the remaining installments", async () => {
    setup([
      qb({ data: anchorRow, error: null }),
      qb({ data: installmentGroupRows, error: null }),
    ]);
    const preview = await previewInstallmentPrepayment({
      targetMonth: "2030-01",
      transactionId: INSTALLMENT_ANCHOR_ID,
    });
    expect(preview.count).toBe(2);
    expect(preview.totalAmount).toBe(200);
    expect(preview.targetMonth).toBe("2030-01");
    expect(preview.installments.map((installment) => installment.id)).toEqual([
      "inst-3",
      LAST_INSTALLMENT_ID,
    ]);
  });
});

describe("createTransaction — savings funding and financing", () => {
  const expense = {
    type: "expense" as const,
    date: "2030-01-15",
    amount: 1000,
    category: "none",
    paymentMethod: "none",
    installmentCount: 12,
    description: "Notebook",
  };
  const financing = {
    operationType: "purchase" as const,
    interestSystem: "price" as const,
    rateInputMode: "rate" as const,
    rate: 2,
    ratePeriod: "monthly" as const,
    downPayment: 0,
    fees: 0,
  };
  type Row = Record<string, unknown>;

  it("keeps the linear installment payload byte-identical without savings or financing", async () => {
    let captured: Row[] = [];
    setup([qb({ error: null }, { onInsert: (rows) => (captured = rows as Row[]) })]);
    await createTransaction({ ...expense, amount: 300, installmentCount: 3 });
    expect(captured.map((row) => Object.keys(row).sort())).toEqual(
      Array(3).fill(
        ["amount", "category_id", "date", "description", "installment_group_id", "installment_number", "installment_total", "kind", "notes", "payment_method_id", "user_id"],
      ),
    );
  });

  it("funds a lump-sum expense entirely from savings", async () => {
    let captured: Row[] = [];
    const supabase = setup([qb({ data: [], error: null }), qb({ error: null }, { onInsert: (rows) => (captured = rows as Row[]) })]);
    supabase.rpc.mockResolvedValue({ data: 800, error: null });
    await createTransaction({ ...expense, amount: 500, installmentCount: 1, savingsFundedAmount: 500 });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({ amount: 500, savings_funded_amount: 500 });
    expect(captured[0]).not.toHaveProperty("financing_plan_id");
  });

  it("spreads savings evenly over linear installments", async () => {
    let captured: Row[] = [];
    const supabase = setup([qb({ data: [], error: null }), qb({ error: null }, { onInsert: (rows) => (captured = rows as Row[]) })]);
    supabase.rpc.mockResolvedValue({ data: 800, error: null });
    await createTransaction({ ...expense, amount: 300, installmentCount: 3, savingsFundedAmount: 150 });
    expect(captured.map((row) => row.savings_funded_amount)).toEqual([50, 50, 50]);
  });

  it("allocates savings after dropping rows before the user creation month", async () => {
    const supabase = setup([qb({ data: [], error: null })], { createdAt: "2030-03-01T00:00:00.000Z" });
    supabase.rpc.mockResolvedValue({ data: 5000, error: null });
    await expect(
      createTransaction({ ...expense, amount: 300, installmentCount: 3, savingsFundedAmount: 250 }),
    ).rejects.toThrow("savings_exceeds_total");
  });

  it("rejects savings already committed to rows dated after this month", async () => {
    const supabase = setup([qb({ data: [{ savings_funded_amount: 900 }], error: null })]);
    supabase.rpc.mockResolvedValue({ data: 1000, error: null });
    await expect(
      createTransaction({ ...expense, installmentCount: 1, savingsFundedAmount: 200 }),
    ).rejects.toThrow("Savings funded amount exceeds the saved total.");
  });

  it("rejects savings above the saved total", async () => {
    const supabase = setup([qb({ data: [], error: null })]);
    supabase.rpc.mockResolvedValue({ data: 100, error: null });
    await expect(
      createTransaction({ ...expense, installmentCount: 1, savingsFundedAmount: 200 }),
    ).rejects.toThrow("Savings funded amount exceeds the saved total.");
  });

  it.each([-1, Number.NaN])("rejects an invalid savings amount %s", async (savingsFundedAmount) => {
    setup([]);
    await expect(createTransaction({ ...expense, savingsFundedAmount })).rejects.toThrow(
      "Savings funded amount is invalid.",
    );
  });

  describe("goal link", () => {

    it("stamps goal_id on every plain installment row", async () => {
      let captured: Row[] = [];
      setup([
        qb({ data: { id: GOAL_ID }, error: null }),
        qb({ error: null }, { onInsert: (rows) => (captured = rows as Row[]) }),
      ]);
      await createTransaction({ ...expense, installmentCount: 2, goalId: GOAL_ID });
      expect(captured.map((row) => row.goal_id)).toEqual([GOAL_ID, GOAL_ID]);
    });

    it("stamps goal_id on financed purchase rows", async () => {
      const supabase = setup([qb({ data: { id: GOAL_ID }, error: null })]);
      const calls = captureBatch(supabase);
      await createTransaction({ ...expense, goalId: GOAL_ID, financing });
      expect(calls[0].rows.every((row) => row.goal_id === GOAL_ID)).toBe(true);
    });

    it("rejects an invalid goal id", async () => {
      setup([]);
      await expect(createTransaction({ ...expense, goalId: "nope" })).rejects.toThrow("Goal is invalid.");
    });

    it.each([
      ["an income", { type: "income" as const }],
      ["a loan", { financing: { ...financing, operationType: "loan" as const } }],
    ])("rejects linking %s to a goal", async (_label, patch) => {
      setup([]);
      await expect(createTransaction({ ...expense, goalId: GOAL_ID, ...patch })).rejects.toThrow(
        "Only expenses can be linked to a goal.",
      );
    });

    it("rejects a goal the user does not own", async () => {
      setup([qb({ data: null, error: null })]);
      await expect(createTransaction({ ...expense, goalId: GOAL_ID })).rejects.toThrow("Goal is invalid.");
    });

    it("surfaces a goal validation error", async () => {
      setup([qb({ data: null, error: { message: "goal boom" } })]);
      await expect(createTransaction({ ...expense, goalId: GOAL_ID })).rejects.toThrow(
        "Unable to validate goal: goal boom",
      );
    });
  });

  it("rejects savings funding or financing on non-expenses", async () => {
    setup([]);
    await expect(createTransaction({ ...expense, type: "income", financing })).rejects.toThrow(
      "Savings funding and financing are only available for expenses.",
    );
  });

  it("rejects a savings-group category", async () => {
    setup([
      qb({ data: { id: CATEGORY_ID }, error: null }), // assertUserCategory
      qb({ data: { group_type: "savings" }, error: null }), // assertNonSavingsCategory
    ]);
    await expect(createTransaction({ ...expense, category: CATEGORY_ID, financing })).rejects.toThrow(
      "Savings categories cannot be financed or funded from savings.",
    );
  });

  it("propagates a category group lookup error", async () => {
    setup([qb({ data: { id: CATEGORY_ID }, error: null }), qb({ data: null, error: { message: "boom" } })]);
    await expect(createTransaction({ ...expense, category: CATEGORY_ID, financing })).rejects.toThrow(
      "Unable to validate category: boom",
    );
  });

  it("accepts a non-savings category", async () => {
    const supabase = setup([
      qb({ data: { id: CATEGORY_ID }, error: null }),
      qb({ data: { group_type: "needs" }, error: null }),
    ]);
    captureBatch(supabase);
    await expect(createTransaction({ ...expense, category: CATEGORY_ID, financing })).resolves.toBeUndefined();
  });

  it("rejects a financed date before the user creation month", async () => {
    setup([], { createdAt: "2030-03-01T00:00:00.000Z" });
    await expect(createTransaction({ ...expense, financing })).rejects.toThrow(
      "Transaction date cannot be earlier than the user creation month.",
    );
  });

  it("writes the plan and the Price rows in one batch, first installment on the purchase date", async () => {
    const calls = captureBatch(setup([]));
    await createTransaction({ ...expense, financing });
    expect(calls).toHaveLength(1);
    expect(calls[0].deleteIds).toBeNull();
    const plan = calls[0].plan as Row;
    const rows = calls[0].rows;
    expect(plan).toMatchObject({
      operation_type: "purchase", interest_system: "price", rate_input_mode: "rate",
      rate: 2, rate_period: "monthly", principal: 1000, down_payment: 0, fees: 0,
      installment_count: 12, savings_funded_amount: 0, user_id: USER_ID,
    });
    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({
      amount: 94.56, principal_portion: 74.56, interest_portion: 20, date: "2030-01-15",
      installment_group_id: plan.id, financing_plan_id: plan.id, installment_number: 1,
      installment_total: 12, description: "Notebook (1/12)", kind: "expense", savings_funded_amount: 0,
    });
    expect(rows[11]).toMatchObject({ amount: 94.54, date: "2030-12-15" });
  });

  it("adds a down-payment row on the date and shifts installments one month", async () => {
    const calls = captureBatch(setup([]));
    await createTransaction({ ...expense, financing: { ...financing, downPayment: 200, fees: 50 } });
    const rows = calls[0].rows;
    const plan = calls[0].plan as Row;
    expect(rows).toHaveLength(13);
    expect(rows[0]).toMatchObject({
      amount: 200, date: "2030-01-15", description: "Notebook", installment_group_id: null,
      installment_number: null, financing_plan_id: plan.id, principal_portion: 200, interest_portion: 0,
    });
    expect(rows[1]).toMatchObject({ amount: 80.38, date: "2030-02-15" });
  });

  it("creates a loan income row and starts installments next month", async () => {
    const calls = captureBatch(setup([]));
    await createTransaction({ ...expense, financing: { ...financing, operationType: "loan" } });
    const rows = calls[0].rows;
    const income = rows.find((row) => row.kind === "income");
    expect(income).toMatchObject({ amount: 1000, category_id: null, date: "2030-01-15", savings_funded_amount: 0 });
    expect(rows.filter((row) => row.kind === "expense")[0]).toMatchObject({ date: "2030-02-15" });
  });

  it("stores the solved monthly rate in installment mode", async () => {
    const calls = captureBatch(setup([]));
    await createTransaction({
      ...expense,
      financing: { ...financing, rateInputMode: "installment", rate: undefined, installmentAmount: 94.56 },
    });
    const plan = calls[0].plan as Row;
    expect(plan.rate_period).toBe("monthly");
    expect(plan.interest_system).toBe("price");
    expect(Number(plan.rate)).toBeCloseTo(2, 3);
  });

  it("spreads savings over financed expense rows only", async () => {
    const supabase = setup([qb({ data: [], error: null })]);
    const calls = captureBatch(supabase, { savedTotal: 5000 });
    await createTransaction({ ...expense, savingsFundedAmount: 100, financing: { ...financing, operationType: "loan" } });
    const rows = calls[0].rows;
    const plan = calls[0].plan as Row;
    expect(plan.savings_funded_amount).toBe(100);
    expect(rows.find((row) => row.kind === "income")?.savings_funded_amount).toBe(0);
    expect(rows.filter((row) => row.kind === "expense").map((row) => row.savings_funded_amount).slice(0, 2)).toEqual([8.33, 8.33]);
  });

  it("throws when the atomic batch fails, with nothing to compensate", async () => {
    const supabase = setup([]);
    captureBatch(supabase, { error: { message: "batch boom" } });
    await expect(createTransaction({ ...expense, financing })).rejects.toThrow(
      "Unable to save transaction: batch boom",
    );
    expect(supabase.from).not.toHaveBeenCalledWith("financing_plans");
  });

  it("propagates the saved-total RPC error", async () => {
    const supabase = setup([qb({ data: [], error: null })]);
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "rpc boom" } });
    await expect(createTransaction({ ...expense, savingsFundedAmount: 10 })).rejects.toThrow(
      "Unable to calculate total saved: rpc boom",
    );
  });

  it("propagates the committed-savings query error", async () => {
    const supabase = setup([qb({ data: null, error: { message: "query boom" } })]);
    supabase.rpc.mockResolvedValue({ data: 5000, error: null });
    await expect(createTransaction({ ...expense, savingsFundedAmount: 10 })).rejects.toThrow(
      "Unable to load committed savings: query boom",
    );
  });

  it("treats a null committed-savings result as nothing committed", async () => {
    let captured: Row[] = [];
    const supabase = setup([
      qb({ data: null, error: null }),
      qb({ error: null }, { onInsert: (rows) => (captured = rows as Row[]) }),
    ]);
    supabase.rpc.mockResolvedValue({ data: 50, error: null });
    await createTransaction({ ...expense, installmentCount: 1, amount: 50, savingsFundedAmount: 50 });
    expect(captured[0]).toMatchObject({ savings_funded_amount: 50 });
  });
});

const PLAN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("getFinancingBreakdown", () => {
  const planRow = {
    operation_type: "purchase", interest_system: "price", rate_input_mode: "rate",
    rate: "2", rate_period: "monthly", principal: "1000", down_payment: "0", fees: "0",
    installment_count: 1, savings_funded_amount: "0",
  };

  it("rejects a non-UUID id", async () => {
    setup([]);
    await expect(getFinancingBreakdown("nope")).rejects.toThrow("Financing plan is invalid.");
  });

  it("returns null for a plan the user does not own", async () => {
    setup([qb({ data: null, error: null })]);
    await expect(getFinancingBreakdown(PLAN_ID)).resolves.toBeNull();
  });

  it("maps the plan and rows", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({
        data: [{ id: "r1", date: "2030-01-15", amount: "1020", kind: "expense", installment_number: 1, principal_portion: "1000", interest_portion: "20", savings_funded_amount: "0" }],
        error: null,
      }),
    ]);
    const result = await getFinancingBreakdown(PLAN_ID);
    expect(result?.plan.rate).toBe(2);
    expect(result?.rows[0]).toMatchObject({ payment: 1020, principal: 1000, interest: 20 });
  });

  it("maps null row data to an empty schedule", async () => {
    setup([qb({ data: planRow, error: null }), qb({ data: null, error: null })]);
    const result = await getFinancingBreakdown(PLAN_ID);
    expect(result?.rows).toEqual([]);
  });

  it("treats null portions as principal-only rows", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({
        data: [{ id: "r1", date: "2030-01-15", amount: "500", kind: "expense", installment_number: 1, principal_portion: null, interest_portion: null, savings_funded_amount: "0" }],
        error: null,
      }),
    ]);
    const result = await getFinancingBreakdown(PLAN_ID);
    expect(result?.rows[0]).toMatchObject({ payment: 500, principal: 500, interest: 0 });
  });

  it("propagates plan and rows errors", async () => {
    setup([qb({ data: null, error: { message: "p" } })]);
    await expect(getFinancingBreakdown(PLAN_ID)).rejects.toThrow("Unable to load financing plan: p");
    setup([qb({ data: planRow, error: null }), qb({ data: null, error: { message: "r" } })]);
    await expect(getFinancingBreakdown(PLAN_ID)).rejects.toThrow("Unable to load financing rows: r");
  });
});

describe("listDebtOverview", () => {
  const planRow = {
    id: PLAN_ID, operation_type: "purchase", interest_system: "price", rate_input_mode: "rate",
    rate: "2", rate_period: "monthly", principal: "1000", down_payment: "0", fees: "0",
    installment_count: 2, savings_funded_amount: "0",
  };
  const row = (number: number, date: string) => ({
    id: `r${number}`, date, amount: "520", kind: "expense", installment_number: number,
    principal_portion: "500", interest_portion: "20", savings_funded_amount: "0",
    financing_plan_id: PLAN_ID, description: `Notebook (${number}/2)`, payment_method_id: PAYMENT_METHOD_ID,
  });

  it("groups rows by plan and names the debt after its first installment", async () => {
    setup([
      qb({ data: [planRow], error: null }),
      qb({ data: [row(2, "2999-02-10"), row(1, "2000-01-10")], error: null }),
    ]);
    const { active } = await listDebtOverview("2000-01");
    expect(active).toMatchObject([
      { planId: PLAN_ID, description: "Notebook", paymentMethodId: PAYMENT_METHOD_ID, paidInstallments: 1 },
    ]);
  });

  it("falls back to the first row, or no rows at all", async () => {
    const onlyLater = { ...row(2, "2999-02-10") };
    setup([qb({ data: [planRow], error: null }), qb({ data: [onlyLater], error: null })]);
    expect((await listDebtOverview("2000-01")).active[0].description).toBe("Notebook");

    setup([qb({ data: [planRow], error: null }), qb({ data: null, error: null })]);
    expect((await listDebtOverview("2000-01")).settled[0]).toMatchObject({ description: "", paymentMethodId: null });
  });

  it("treats an undecryptable description as empty", async () => {
    setup([
      qb({ data: [planRow], error: null }),
      qb({ data: [{ ...row(1, "2999-01-10"), description: null }], error: null }),
    ]);
    expect((await listDebtOverview("2000-01")).active[0].description).toBe("");
  });

  it("returns an empty overview without plans or before the financing migration", async () => {
    setup([qb({ data: [], error: null })]);
    expect((await listDebtOverview("2000-01")).active).toEqual([]);
    setup([qb({ data: null, error: null })]);
    expect((await listDebtOverview("2000-01")).active).toEqual([]);
    setup([qb({ data: null, error: { code: "42P01", message: "missing" } })]);
    expect((await listDebtOverview("2000-01")).active).toEqual([]);
    setup([qb({ data: null, error: { code: "42703", message: "missing" } })]);
    expect((await listDebtOverview("2000-01")).active).toEqual([]);
  });

  it("propagates plan and rows errors", async () => {
    setup([qb({ data: null, error: { message: "p" } })]);
    await expect(listDebtOverview("2000-01")).rejects.toThrow("Unable to load financing plans: p");
    setup([qb({ data: [planRow], error: null }), qb({ data: null, error: { message: "r" } })]);
    await expect(listDebtOverview("2000-01")).rejects.toThrow("Unable to load financing rows: r");
  });
});

describe("deleteInstallments — financed groups", () => {
  it("deletes the plan (cascading its rows) when scope is all", async () => {
    const planDelete = qb({ error: null });
    const deleteSpy = vi.spyOn(planDelete as { delete: () => unknown }, "delete");
    const supabase = setup([
      qb({ data: { ...anchorRow, financing_plan_id: PLAN_ID }, error: null }),
      planDelete,
    ]);
    await deleteInstallments({ transactionId: TRANSACTION_ID, scope: "all" });
    expect(supabase.from).toHaveBeenLastCalledWith("financing_plans");
    expect(deleteSpy).toHaveBeenCalled();
  });

  it("propagates a plan delete error", async () => {
    setup([
      qb({ data: { ...nonInstallmentRow, financing_plan_id: PLAN_ID }, error: null }),
      qb({ error: { message: "del boom" } }),
    ]);
    await expect(deleteInstallments({ transactionId: TRANSACTION_ID, scope: "all" })).rejects.toThrow(
      "Unable to delete financing plan: del boom",
    );
  });
});

describe("replaceTransaction", () => {
  const input = {
    type: "expense" as const,
    date: "2030-01-15",
    amount: 500,
    category: "none",
    paymentMethod: "none",
    installmentCount: 1,
    description: "Car repair",
  };

  function deleteQb(table: unknown[] = []) {
    const builder = qb({ error: null });
    vi.spyOn(builder as { delete: () => unknown }, "delete").mockImplementation(() => {
      table.push("deleted");
      return builder;
    });
    return builder;
  }

  it("rejects an invalid id", async () => {
    setup([]);
    await expect(replaceTransaction("bad", input)).rejects.toThrow("Transaction is invalid.");
  });

  it("refuses plain installment groups", async () => {
    setup([qb({ data: anchorRow, error: null })]);
    await expect(replaceTransaction(TRANSACTION_ID, input)).rejects.toThrow(
      "Plain installment groups cannot be replaced.",
    );
  });

  it("creates the new rows before deleting the single original row", async () => {
    const events: unknown[] = [];
    const supabase = setup([
      qb({ data: nonInstallmentRow, error: null }),
      qb({ error: null }, { onInsert: () => events.push("inserted") }),
      deleteQb(events),
    ]);
    await replaceTransaction(TRANSACTION_ID, input);
    expect(events).toEqual(["inserted", "deleted"]);
    expect(supabase.from).toHaveBeenLastCalledWith("transactions");
  });

  it("releases the original row's savings for the new definition", async () => {
    const supabase = setup([
      qb({ data: { ...nonInstallmentRow, savings_funded_amount: "500" }, error: null }),
      qb({ data: [], error: null }),
      qb({ error: null }),
      deleteQb(),
    ]);
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    await expect(
      replaceTransaction(TRANSACTION_ID, { ...input, savingsFundedAmount: 500 }),
    ).resolves.toBeUndefined();
  });

  it("keeps the original when the new rows fail", async () => {
    const events: unknown[] = [];
    setup([
      qb({ data: nonInstallmentRow, error: null }),
      qb({ error: { message: "boom" } }),
      deleteQb(events),
    ]);
    await expect(replaceTransaction(TRANSACTION_ID, input)).rejects.toThrow();
    expect(events).toEqual([]);
  });

  it("replaces a whole financed operation, releasing its savings", async () => {
    const events: unknown[] = [];
    const supabase = setup([
      qb({ data: { ...nonInstallmentRow, financing_plan_id: PLAN_ID }, error: null }),
      qb({ data: [{ savings_funded_amount: "300" }, { savings_funded_amount: 200 }], error: null }),
      qb({ data: [], error: null }),
      qb({ error: null }, { onInsert: () => events.push("inserted") }),
      deleteQb(events),
    ]);
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    await replaceTransaction(TRANSACTION_ID, { ...input, savingsFundedAmount: 500 });
    expect(events).toEqual(["inserted", "deleted"]);
    expect(supabase.from).toHaveBeenLastCalledWith("financing_plans");
  });

  it("refuses to replace a debt that has amortizations", async () => {
    setup([
      qb({ data: { ...nonInstallmentRow, financing_plan_id: PLAN_ID }, error: null }),
      qb({ data: [{ savings_funded_amount: 0, is_amortization: true }], error: null }),
    ]);
    await expect(replaceTransaction(TRANSACTION_ID, input)).rejects.toThrow(
      "A debt with amortizations cannot be edited as a whole.",
    );
  });

  it("treats a null plan-rows result as nothing released", async () => {
    setup([
      qb({ data: { ...nonInstallmentRow, financing_plan_id: PLAN_ID }, error: null }),
      qb({ data: null, error: null }),
      qb({ error: null }),
      deleteQb(),
    ]);
    await expect(replaceTransaction(TRANSACTION_ID, input)).resolves.toBeUndefined();
  });

  it("propagates a plan-rows error", async () => {
    setup([
      qb({ data: { ...nonInstallmentRow, financing_plan_id: PLAN_ID }, error: null }),
      qb({ data: null, error: { message: "rows" } }),
    ]);
    await expect(replaceTransaction(TRANSACTION_ID, input)).rejects.toThrow(
      "Unable to load financing rows: rows",
    );
  });
});

describe("amortizeDebt", () => {
  const planRow = {
    operation_type: "purchase", interest_system: "price", rate_input_mode: "rate",
    rate: "2", rate_period: "monthly", principal: "1000", down_payment: "0", fees: "0",
    installment_count: 2, savings_funded_amount: "0",
  };
  const future = (number: number, savings = "0") => ({
    id: `f${number}`, date: `2999-0${number}-10`, amount: "520", kind: "expense", installment_number: number,
    interest_portion: "20", is_amortization: false,
    installment_group_id: PLAN_ID, installment_total: 2, principal_portion: "500",
    savings_funded_amount: savings, category_id: CATEGORY_ID, payment_method_id: PAYMENT_METHOD_ID,
    description: `Notebook (${number}/2)`, notes: `${number}/2`, goal_id: null as string | null,
  });
  const input = { planId: PLAN_ID, amount: 400, source: "balance" as const, mode: "installment" as const, description: "Notebook (amortization)" };

  it("sends the extra payment and smaller installments, replacing the old ones atomically", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({ data: [future(1), future(2)], error: null }),
    ]);
    await amortizeDebt(input);
    expect(batchCalls).toHaveLength(1);
    expect(batchCalls[0].plan).toBeNull();
    expect(batchCalls[0].deleteIds).toEqual(["f1", "f2"]);
    const inserted = batchCalls[0].rows;
    expect(inserted[0]).toMatchObject({
      amount: 400, kind: "expense", is_amortization: true, principal_portion: 400, interest_portion: 0,
      savings_funded_amount: 0, installment_number: null, installment_group_id: null,
      financing_plan_id: PLAN_ID, category_id: CATEGORY_ID, payment_method_id: PAYMENT_METHOD_ID,
    });
    expect(inserted.slice(1)).toMatchObject([
      { installment_number: 1, date: "2999-01-10", description: "Notebook (1/2)", interest_portion: 12 },
      { installment_number: 2, date: "2999-02-10", description: "Notebook (2/2)" },
    ]);
    expect(inserted.slice(1).reduce((sum, row) => sum + Number(row.principal_portion), 0)).toBeCloseTo(600, 2);
  });

  it("keeps the goal link on the extra payment and the new installments", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({ data: [{ ...future(1), goal_id: GOAL_ID }, { ...future(2), goal_id: GOAL_ID }], error: null }),
    ]);
    await amortizeDebt(input);
    expect(batchCalls[0].rows.map((row) => row.goal_id)).toEqual([GOAL_ID, GOAL_ID, GOAL_ID]);
  });

  it("sends every row with the same columns, so a bulk insert never writes NULL flags", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({ data: [future(1), future(2)], error: null }),
    ]);
    await amortizeDebt(input);
    const columns = Object.keys(batchCalls[0].rows[0]).sort();
    batchCalls[0].rows.forEach((row) => expect(Object.keys(row).sort()).toEqual(columns));
    expect(batchCalls[0].rows.map((row) => row.is_amortization)).toEqual([true, false, false]);
  });

  it("paying the whole principal leaves only the extra payment", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({ data: [future(1), future(2)], error: null }),
    ]);
    await amortizeDebt({ ...input, amount: 1000 });
    expect(batchCalls[0].rows).toHaveLength(1);
  });

  it("funds from savings and keeps each installment's savings share", async () => {
    const supabase = setup([
      qb({ data: planRow, error: null }),
      qb({ data: [future(1, "260"), future(2)], error: null }),
      qb({ data: [], error: null }),
    ]);
    captureBatch(supabase, { savedTotal: 500 });
    await amortizeDebt({ ...input, source: "savings" });
    expect(batchCalls[0].rows[0].savings_funded_amount).toBe(400);
    expect(Number(batchCalls[0].rows[1].savings_funded_amount)).toBeGreaterThan(0);
    expect(batchCalls[0].rows[2].savings_funded_amount).toBe(0);
  });

  it("rejects savings above what is available", async () => {
    const supabase = setup([
      qb({ data: planRow, error: null }),
      qb({ data: [future(1), future(2)], error: null }),
      qb({ data: [], error: null }),
    ]);
    supabase.rpc.mockResolvedValue({ data: 100, error: null });
    await expect(amortizeDebt({ ...input, source: "savings" })).rejects.toThrow(
      "Savings funded amount exceeds the saved total.",
    );
  });

  it("rejects an amount above the principal and a plan without installments left", async () => {
    setup([qb({ data: planRow, error: null }), qb({ data: [future(1), future(2)], error: null })]);
    await expect(amortizeDebt({ ...input, amount: 1001 })).rejects.toThrow("invalid_amortization");
    setup([qb({ data: planRow, error: null }), qb({ data: null, error: null })]);
    await expect(amortizeDebt(input)).rejects.toThrow("This debt has no installments left.");
  });

  it("falls back to the amount when a row has no principal portion", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({ data: [{ ...future(1), principal_portion: null, amount: "500" }], error: null }),
    ]);
    await amortizeDebt({ ...input, amount: 100 });
    expect(batchCalls[0].rows).toHaveLength(2);
  });

  it("charges accrued interest on the extra payment", async () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 86_400_000).toISOString().slice(0, 10);
    const past = { ...future(1), id: "p1", date: fifteenDaysAgo, principal_portion: "0", amount: "0" };
    setup([
      qb({ data: planRow, error: null }),
      qb({ data: [past, future(2)], error: null }),
    ]);
    await amortizeDebt({ ...input, amount: 100 });
    expect(Number(batchCalls[0].rows[0].interest_portion)).toBeGreaterThan(0);
    expect(Number(batchCalls[0].rows[0].principal_portion) + Number(batchCalls[0].rows[0].interest_portion)).toBeCloseTo(100, 2);
    expect(batchCalls[0].rows).toHaveLength(2);
  });

  it("shortens the term, dropping the last installments", async () => {
    const rows = [1, 2, 3, 4].map((n) => ({
      ...future(n), amount: "270", principal_portion: "250", installment_total: 4, date: `2999-0${n}-10`,
    }));
    setup([
      qb({ data: planRow, error: null }),
      qb({ data: rows, error: null }),
    ]);
    await amortizeDebt({ ...input, mode: "term", amount: 500 });
    expect(batchCalls[0].rows.length - 1).toBeLessThan(4);
    expect(batchCalls[0].rows.length - 1).toBeGreaterThan(0);
  });

  it("gives a zero-amount row no savings share", async () => {
    setup([
      qb({ data: planRow, error: null }),
      qb({ data: [{ ...future(1), amount: "0" }], error: null }),
    ]);
    await amortizeDebt({ ...input, amount: 100 });
    expect(batchCalls[0].rows[1].savings_funded_amount).toBe(0);
  });

  it("validates the plan id and reports load, insert and delete errors", async () => {
    await expect(amortizeDebt({ ...input, planId: "bad" })).rejects.toThrow("Financing plan is invalid.");
    setup([qb({ data: null, error: { message: "p" } })]);
    await expect(amortizeDebt(input)).rejects.toThrow("Unable to load financing plan: p");
    setup([qb({ data: null, error: null })]);
    await expect(amortizeDebt(input)).rejects.toThrow("Financing plan not found.");
    setup([qb({ data: planRow, error: null }), qb({ data: null, error: { message: "r" } })]);
    await expect(amortizeDebt(input)).rejects.toThrow("Unable to load financing rows: r");
    captureBatch(
      setup([
        qb({ data: planRow, error: null }),
        qb({ data: [future(1), future(2)], error: null }),
      ]),
      { error: { message: "ins" } },
    );
    await expect(amortizeDebt(input)).rejects.toThrow("Unable to save amortization: ins");
  });

  it("reports a failed atomic replace without touching anything else", async () => {
    const supabase = setup([
      qb({ data: planRow, error: null }),
      qb({ data: [future(1), future(2)], error: null }),
    ]);
    captureBatch(supabase, { error: { message: "del" } });
    await expect(amortizeDebt(input)).rejects.toThrow("Unable to save amortization: del");
  });
});
