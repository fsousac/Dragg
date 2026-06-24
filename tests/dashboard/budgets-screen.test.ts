import { describe, expect, it } from "vitest";

import { csvEscape } from "@/components/dashboard/budgets-screen";

describe("csvEscape", () => {
  it("wraps values in double quotes", () => {
    expect(csvEscape("hello")).toBe('"hello"');
    expect(csvEscape(42)).toBe('"42"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("returns empty string for null", () => {
    expect(csvEscape(null)).toBe('""');
  });

  it("handles zero as a number", () => {
    expect(csvEscape(0)).toBe('"0"');
  });
});
