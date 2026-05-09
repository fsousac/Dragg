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
}
