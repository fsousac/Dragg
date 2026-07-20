import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  advanceInstallments,
  createInvoiceAdvancePayment,
  createTransaction,
  deleteInstallments,
  deleteTransaction,
  previewInstallmentPrepayment,
  updateTransaction,
} from "@/lib/finance/transactions";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";
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
  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return supabase;
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
