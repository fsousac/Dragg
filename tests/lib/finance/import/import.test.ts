import { describe, expect, it } from "vitest";

import {
  categorize,
  excludeExisting,
  importKey,
  learnRules,
} from "@/lib/finance/import/dedupe-and-categorize";
import {
  parseCsvStatement,
  parseMoney,
  parseOfxStatement,
  parseStatementDate,
} from "@/lib/finance/import/parse-statement";

describe("parseMoney", () => {
  it("handles BR and US formats and negatives", () => {
    expect(parseMoney("R$ 1.234,56")).toBe(1234.56);
    expect(parseMoney("1,234.56")).toBe(1234.56);
    expect(parseMoney("-12,5")).toBe(-12.5);
    expect(parseMoney("(10,00)")).toBe(-10);
    expect(parseMoney("1.000")).toBe(1000);
    expect(parseMoney("abc")).toBeNull();
  });
});

describe("parseStatementDate", () => {
  it("normalizes BR, ISO and OFX dates and rejects invalid ones", () => {
    expect(parseStatementDate("05/03/2026")).toBe("2026-03-05");
    expect(parseStatementDate("2026-03-05")).toBe("2026-03-05");
    expect(parseStatementDate("20260305120000[-3:BRT]")).toBe("2026-03-05");
    expect(parseStatementDate("31/02/2026")).toBeNull();
  });
});

describe("parseCsvStatement", () => {
  it("reads a semicolon CSV with quoted cells", () => {
    const csv = [
      "Data;Descrição;Valor",
      '05/03/2026;"Mercado; Centro";-123,45',
      "06/03/2026;Salário;5.000,00",
      "invalid;x;1",
    ].join("\n");

    expect(parseCsvStatement(csv)).toEqual([
      {
        amount: -123.45,
        date: "2026-03-05",
        description: "Mercado; Centro",
      },
      { amount: 5000, date: "2026-03-06", description: "Salário" },
    ]);
  });

  it("returns nothing when required columns are missing", () => {
    expect(parseCsvStatement("a,b\n1,2")).toEqual([]);
  });
});

describe("parseOfxStatement", () => {
  it("reads OFX 1.x transactions without closing tags", () => {
    const ofx =
      "<OFX><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260305<TRNAMT>-50.00<FITID>abc1<MEMO>PADARIA</STMTTRN></OFX>";

    expect(parseOfxStatement(ofx)).toEqual([
      {
        amount: -50,
        date: "2026-03-05",
        description: "PADARIA",
        externalId: "abc1",
      },
    ]);
  });
});

describe("dedupe and categorize", () => {
  const row = { amount: -10, date: "2026-03-05", description: "  Padaria  " };

  it("skips rows already stored and duplicates inside the file", () => {
    const existing = new Set([importKey(row)]);

    expect(
      excludeExisting([row, { ...row, description: "PADARIA" }], existing),
    ).toEqual([]);
    expect(excludeExisting([row, row], new Set())).toHaveLength(1);
  });

  it("matches rules ignoring case and accents", () => {
    const rules = [{ categoryId: "food", pattern: "padaría" }];

    expect(categorize("PADARIA DO ZE", rules)).toBe("food");
    expect(categorize("Uber", rules)).toBeNull();
  });

  it("learns rules from history, newest wins, longest first", () => {
    const rules = learnRules([
      { categoryId: "a", description: "Loja X (2/3)" },
      { categoryId: "b", description: "Loja X" },
      { categoryId: null, description: "Sem categoria" },
      { categoryId: "c", description: "Loja X Centro" },
    ]);

    expect(rules).toEqual([
      { categoryId: "c", pattern: "loja x centro" },
      { categoryId: "a", pattern: "loja x" },
    ]);
    expect(categorize("LOJA X CENTRO SP", rules)).toBe("c");
    expect(categorize("LOJA X SP", rules)).toBe("a");
  });
});
