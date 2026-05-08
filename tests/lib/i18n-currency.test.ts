import { describe, expect, it } from "vitest";

import { formatCurrencyValue, resolveCurrency } from "@/lib/i18n-currency";

describe("currency helpers", () => {
  it("keeps supported user currency preferences", () => {
    expect(resolveCurrency("BRL", "en")).toBe("BRL");
    expect(resolveCurrency("USD", "pt-BR")).toBe("USD");
    expect(resolveCurrency("EUR", "pt-BR")).toBe("EUR");
  });

  it("falls back to the locale default when the stored preference is invalid", () => {
    expect(resolveCurrency("GBP", "en")).toBe("USD");
    expect(resolveCurrency(null, "pt-BR")).toBe("BRL");
    expect(resolveCurrency(undefined, "en")).toBe("USD");
  });

  it("formats values with the selected currency instead of deriving it from locale", () => {
    expect(formatCurrencyValue(1234.5, "pt-BR", "EUR")).toContain("€");
    expect(formatCurrencyValue(1234.5, "en", "BRL")).toContain("R$");
    expect(formatCurrencyValue(1234.5, "en", "USD")).toContain("$");
  });
});
