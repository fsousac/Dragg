export type TransactionType = "income" | "expense" | "saving";
export type TransactionGroup = "needs" | "wants" | "savings" | "income";

export interface Transaction {
  id: string;
  descriptionKey: string;
  amount: number;
  type: TransactionType;
  categoryKey: string;
  categoryId?: string | null;
  group: TransactionGroup;
  date: string;
  icon: string;
  notes?: string | null;
  paymentMethodId?: string | null;
  paymentMethodKey?: string | null;
  paymentMethodDueDay?: number | null;
  paymentMethodClosingDay?: number | null;
  paymentMethodType?: string | null;
  isPlanned?: boolean;
  isCreditCardInvoice?: boolean;
  // Set when this individual purchase's amount is already folded into a
  // sibling isCreditCardInvoice transaction's total (preserveCreditCardInvoicePurchases),
  // so callers summing totals can avoid double-counting it.
  isCreditCardInvoicePurchase?: boolean;
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  advancedToMonth?: string | null;
  advancedAt?: string | null;
  invoice?: CreditCardInvoiceDetails;
}

export type CreditCardInvoicePurchase = {
  amount: number;
  categoryKey: string;
  date: string;
  descriptionKey: string;
  id: string;
  installmentLabel?: string | null;
};

export type CreditCardInvoiceDetails = {
  closingDate: string;
  dueDate: string;
  paidAmount: number;
  paymentMethodKey: string;
  purchases: CreditCardInvoicePurchase[];
  totalAmount: number;
  startsAt: string;
};
