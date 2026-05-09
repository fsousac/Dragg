export type CurrencyCode = "BRL" | "USD" | "EUR";

const supportedCurrencies = new Set<CurrencyCode>(["BRL", "USD", "EUR"]);
const storageKey = "dragg-currency";

const defaultCurrency: CurrencyCode = "USD";

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return supportedCurrencies.has(value as CurrencyCode);
}

export function getStoredCurrency(): CurrencyCode {
  if (typeof window === "undefined") return defaultCurrency;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored && isSupportedCurrency(stored)) return stored;
  } catch {}
  return defaultCurrency;
}

export function setStoredCurrency(currency: CurrencyCode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, currency);
  } catch {}
}

export function formatCurrency(
  amount: number,
  locale: string,
  currency: CurrencyCode,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
