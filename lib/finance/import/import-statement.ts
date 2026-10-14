import {
  categorize,
  excludeExisting,
  importKey,
  learnRules,
} from "@/lib/finance/import/dedupe-and-categorize";
import type { ImportedRow } from "@/lib/finance/import/parse-statement";
import { getUserContext } from "@/lib/finance/transactions";

const INSERT_CHUNK = 500;
const HISTORY_LIMIT = 5000;

export type ImportStatementResult = {
  categorized: number;
  duplicates: number;
  imported: number;
};

export async function importStatementRows(
  rows: ImportedRow[],
  paymentMethodId: string | null,
): Promise<ImportStatementResult> {
  const { supabase, userId } = await getUserContext();

  if (paymentMethodId) {
    const { data } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("id", paymentMethodId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      throw new Error("Payment method is invalid.");
    }
  }

  // One read gives both the dedupe keys and the learned category rules.
  const { data: history, error: historyError } = await supabase
    .from("transactions")
    .select("description, category_id, import_key")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (historyError) {
    throw new Error(`Unable to read transactions: ${historyError.message}`);
  }

  const existingKeys = new Set(
    (history ?? [])
      .map((item) => item.import_key as string | null)
      .filter((key): key is string => Boolean(key)),
  );
  const rules = learnRules(
    (history ?? []).map((item) => ({
      categoryId: item.category_id as string | null,
      description: item.description as string,
    })),
  );
  const newRows = excludeExisting(rows, existingKeys);
  let categorized = 0;

  const records = newRows.map((row) => {
    const isIncome = row.amount > 0;
    // Income never carries a category (same rule as createTransaction).
    const categoryId = isIncome ? null : categorize(row.description, rules);

    if (categoryId) {
      categorized += 1;
    }

    return {
      amount: Math.abs(row.amount),
      category_id: categoryId,
      date: row.date,
      description: row.description,
      import_key: importKey(row),
      kind: isIncome ? "income" : "expense",
      payment_method_id: paymentMethodId,
      user_id: userId,
    };
  });

  for (let start = 0; start < records.length; start += INSERT_CHUNK) {
    const { error } = await supabase
      .from("transactions")
      .insert(records.slice(start, start + INSERT_CHUNK));

    if (error) {
      throw new Error(`Unable to import transactions: ${error.message}`);
    }
  }

  return {
    categorized,
    duplicates: rows.length - newRows.length,
    imported: newRows.length,
  };
}
