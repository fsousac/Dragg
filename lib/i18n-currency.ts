export {
  formatCurrency,
  getStoredCurrency,
  isSupportedCurrency,
  setStoredCurrency,
} from "@/lib/i18n/currency";
export type { CurrencyCode } from "@/lib/i18n/currency";

import { formatCurrency, isSupportedCurrency } from "@/lib/i18n/currency";
import type { CurrencyCode } from "@/lib/i18n/currency";

export function resolveCurrency(
  value?: string | null,
  locale: string = "en",
): CurrencyCode {
  if (value && isSupportedCurrency(value)) return value;
  return locale.toLowerCase().startsWith("pt") ? "BRL" : "USD";
}

export function formatCurrencyValue(
  value: number,
  locale: string,
  currency: CurrencyCode,
) {
  return formatCurrency(value, locale, currency);
}
