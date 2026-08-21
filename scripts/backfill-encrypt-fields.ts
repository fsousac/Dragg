import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  encryptDescription,
  encryptField,
  isAlreadyEncrypted,
} from "../lib/crypto/field-encryption";

const BATCH_SIZE = 500;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to run this script.`);
  }
  return value;
}

function getClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey);
}

type ProfileRow = { id: string; name: string | null; email: string | null };
type TransactionRow = {
  id: string;
  description: string;
  notes: string | null;
};

type BackfillConfig<Row extends { id: string }> = {
  table: string;
  columns: string;
  resolvePatch: (row: Row) => Record<string, unknown> | null;
};

async function fetchPage<T>(
  supabase: SupabaseClient,
  config: { table: string; columns: string },
  cursor: string | null,
): Promise<T[]> {
  let query = supabase
    .from(config.table)
    .select(config.columns)
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);
  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Unable to page ${config.table}: ${error.message}`);
  }

  return (data ?? []) as unknown as T[];
}

async function applyPatch(
  supabase: SupabaseClient,
  target: { table: string; rowId: string },
  patch: Record<string, unknown>,
) {
  const { error } = await supabase
    .from(target.table)
    .update(patch)
    .eq("id", target.rowId);
  if (error) {
    throw new Error(
      `Unable to update ${target.table} ${target.rowId}: ${error.message}`,
    );
  }
}

async function backfillTable<Row extends { id: string }>(
  supabase: SupabaseClient,
  config: BackfillConfig<Row>,
): Promise<number> {
  let updated = 0;
  let cursor: string | null = null;

  for (;;) {
    const rows: Row[] = await fetchPage<Row>(supabase, config, cursor);
    if (!rows.length) break;

    for (const row of rows) {
      const patch = config.resolvePatch(row);
      if (patch) {
        await applyPatch(
          supabase,
          { table: config.table, rowId: row.id },
          patch,
        );
        updated += 1;
      }
    }

    cursor = rows.at(-1)!.id;
    if (rows.length < BATCH_SIZE) break;
  }

  return updated;
}

function resolveProfilePatch(row: ProfileRow) {
  const needsName = row.name !== null && !isAlreadyEncrypted(row.name);
  const needsEmail = row.email !== null && !isAlreadyEncrypted(row.email);

  if (!needsName && !needsEmail) return null;

  return {
    ...(needsName ? { name: encryptField(row.name) } : {}),
    ...(needsEmail ? { email: encryptField(row.email) } : {}),
  };
}

function resolveTransactionPatch(row: TransactionRow) {
  const needsDescription = !isAlreadyEncrypted(row.description);
  const needsNotes = row.notes !== null && !isAlreadyEncrypted(row.notes);

  if (!needsDescription && !needsNotes) return null;

  return {
    ...(needsDescription
      ? { description: encryptDescription(row.description) }
      : {}),
    ...(needsNotes ? { notes: encryptField(row.notes) } : {}),
  };
}

export async function runBackfill(supabase: SupabaseClient) {
  const profilesUpdated = await backfillTable<ProfileRow>(supabase, {
    table: "profiles",
    columns: "id, name, email",
    resolvePatch: resolveProfilePatch,
  });
  const transactionsUpdated = await backfillTable<TransactionRow>(supabase, {
    table: "transactions",
    columns: "id, description, notes",
    resolvePatch: resolveTransactionPatch,
  });

  return { profilesUpdated, transactionsUpdated };
}

async function main() {
  const supabase = getClient();
  const { profilesUpdated, transactionsUpdated } = await runBackfill(supabase);

  console.log(`profiles updated: ${profilesUpdated}`);
  console.log(`transactions updated: ${transactionsUpdated}`);
  console.log(
    profilesUpdated === 0 && transactionsUpdated === 0
      ? "Nothing left to backfill — safe to move to Fase 3."
      : "Re-run this script again; Fase 3 requires a run that updates 0 rows.",
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
