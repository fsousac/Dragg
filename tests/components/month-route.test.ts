import { describe, expect, it } from "vitest";
import {
  getCurrentMonthValue,
  getMonthFromSearchParams,
  withSelectedMonth,
} from "@/components/dashboard/month-route";

describe("month-route utilities", () => {
  it("returns current month formatted as YYYY-MM", () => {
    const val = getCurrentMonthValue();
    expect(val).toMatch(/^\d{4}-\d{2}$/);
  });

  it("parses valid month from search params and falls back otherwise", () => {
    const params = new URLSearchParams("month=2023-05");
    expect(getMonthFromSearchParams(params)).toBe("2023-05");
    const params2 = new URLSearchParams("");
    expect(getMonthFromSearchParams(params2)).toBeNull();
  });

  it("injects month into href properly", () => {
    const params = new URLSearchParams("month=2022-11");
    const href = withSelectedMonth("/dashboard", params);
    expect(href).toContain("month=2022-11");
  });

  it("falls back to current month when no month param provided", () => {
    const href = withSelectedMonth("/dashboard", new URLSearchParams());
    expect(href).toMatch(/month=\d{4}-\d{2}$/);
  });
});
