import { type Currency, type Locale } from "@/lib/i18n";

const supportedCurrencies = new Set<Currency>(["BRL", "USD", "EUR"]);

export function resolveCurrency(
  value?: string | null,
  locale: Locale = "en",
): Currency {
  if (value && supportedCurrencies.has(value as Currency)) {
    return value as Currency;
  }

  return locale === "pt-BR" ? "BRL" : "USD";
}

export function formatCurrencyValue(
  value: number,
  locale: Locale,
  currency: Currency,
) {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}
