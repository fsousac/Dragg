import type { ImportedRow } from "@/lib/finance/import/parse-statement";

export type CategoryRule = { categoryId: string; pattern: string };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Stable key: bank id when present, otherwise date + amount + description.
export function importKey(row: ImportedRow) {
  return row.externalId
    ? `id:${row.externalId}`
    : `${row.date}|${row.amount.toFixed(2)}|${normalize(row.description)}`;
}

export function excludeExisting(
  rows: ImportedRow[],
  existingKeys: Set<string>,
) {
  const seen = new Set(existingKeys);

  return rows.filter((row) => {
    const key = importKey(row);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

// First rule whose pattern is contained in the description wins.
export function categorize(description: string, rules: CategoryRule[]) {
  const text = normalize(description);

  return (
    rules.find((rule) => {
      const pattern = normalize(rule.pattern);

      return pattern.length > 0 && text.includes(pattern);
    })?.categoryId ?? null
  );
}

// Learns "description -> category" from past categorized transactions.
// `history` must be ordered newest first so the latest choice wins.
export function learnRules(
  history: { categoryId: string | null; description: string }[],
): CategoryRule[] {
  const byPattern = new Map<string, string>();

  for (const item of history) {
    // Drop the installment suffix added by Dragg, e.g. "Loja (2/3)".
    const pattern = normalize(item.description.replace(/\s*\(\d+\/\d+\)$/, ""));

    if (item.categoryId && pattern && !byPattern.has(pattern)) {
      byPattern.set(pattern, item.categoryId);
    }
  }

  // Longest (most specific) patterns first.
  return [...byPattern]
    .map(([pattern, categoryId]) => ({ categoryId, pattern }))
    .sort((a, b) => b.pattern.length - a.pattern.length);
}
