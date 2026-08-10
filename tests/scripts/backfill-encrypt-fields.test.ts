import { randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { runBackfill } from "../../scripts/backfill-encrypt-fields";
import { encryptDescription, encryptField } from "../../lib/crypto/field-encryption";

process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");

type Row = Record<string, unknown> & { id: string };

function makeTable(rows: Row[]) {
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];

  function select(sortedRows: Row[]) {
    let cursor: string | null = null;
    let limit = sortedRows.length;

    const builder = {
      order: () => builder,
      limit: (n: number) => {
        limit = n;
        return builder;
      },
      gt: (_column: string, value: string) => {
        cursor = value;
        return builder;
      },
      then: (resolve: (result: { data: Row[]; error: null }) => void) => {
        const filtered = cursor
          ? sortedRows.filter((row) => row.id > cursor!)
          : sortedRows;
        resolve({ data: filtered.slice(0, limit), error: null });
      },
    };

    return builder;
  }

  return {
    select: () => select([...rows].sort((a, b) => a.id.localeCompare(b.id))),
    update: (patch: Record<string, unknown>) => ({
      eq: (_column: string, id: string) => {
        updates.push({ id, patch });
        const row = rows.find((r) => r.id === id);
        if (row) Object.assign(row, patch);
        return Promise.resolve({ error: null });
      },
    }),
    updates,
  };
}

function makeSupabase(profiles: Row[], transactions: Row[]) {
  const profilesTable = makeTable(profiles);
  const transactionsTable = makeTable(transactions);

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") return profilesTable;
      if (table === "transactions") return transactionsTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
    profilesTable,
    transactionsTable,
  };
}

describe("runBackfill", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("encrypts plaintext rows and leaves already-encrypted rows untouched", async () => {
    const supabase = makeSupabase(
      [
        { id: "p1", name: "Ana", email: "ana@example.com" },
        {
          id: "p2",
          name: encryptField("Bea"),
          email: encryptField("bea@example.com"),
        },
      ],
      [
        { id: "t1", description: "Mercado", notes: "nota livre" },
        {
          id: "t2",
          description: encryptDescription("Netflix"),
          notes: null,
        },
      ],
    );

    const result = await runBackfill(supabase as never);

    expect(result).toEqual({ profilesUpdated: 1, transactionsUpdated: 1 });
    expect(supabase.profilesTable.updates).toHaveLength(1);
    expect(supabase.profilesTable.updates[0].id).toBe("p1");
    expect(supabase.transactionsTable.updates).toHaveLength(1);
    expect(supabase.transactionsTable.updates[0].id).toBe("t1");
  });

  it("is idempotent: a second run over the already-backfilled data updates nothing", async () => {
    const profiles = [{ id: "p1", name: "Ana", email: "ana@example.com" }];
    const transactions = [
      { id: "t1", description: "Mercado", notes: "nota livre" },
    ];
    const supabase = makeSupabase(profiles, transactions);

    await runBackfill(supabase as never);
    const secondRun = await runBackfill(supabase as never);

    expect(secondRun).toEqual({ profilesUpdated: 0, transactionsUpdated: 0 });
  });

  it("returns zero updates when there is nothing to backfill", async () => {
    const supabase = makeSupabase([], []);

    const result = await runBackfill(supabase as never);

    expect(result).toEqual({ profilesUpdated: 0, transactionsUpdated: 0 });
  });

  it("handles null profile name/email without treating them as needing encryption", async () => {
    const supabase = makeSupabase(
      [{ id: "p1", name: null, email: null }],
      [],
    );

    const result = await runBackfill(supabase as never);

    expect(result.profilesUpdated).toBe(0);
  });
});
