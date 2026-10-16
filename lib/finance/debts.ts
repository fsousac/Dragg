import {
  buildFinancingBreakdown,
  getAccrual,
  toCents,
  type FinancingPlanRecord,
  type FinancingRowRecord,
  type OperationType,
} from "@/lib/finance/financing";

export type DebtPlanInput = {
  id: string;
  description: string;
  paymentMethodId: string | null;
  plan: FinancingPlanRecord;
  rows: FinancingRowRecord[];
};

export type DebtItem = {
  planId: string;
  description: string;
  operationType: OperationType;
  paymentMethodId: string | null;
  paidInstallments: number;
  installmentCount: number;
  outstanding: { principal: number; interest: number; total: number };
  // Principal plus the interest accrued so far: the most an amortization can pay.
  payoff: number;
  accruedInterest: number;
  nextInstallment: { date: string; amount: number } | null;
  annualCet: number;
  isSettled: boolean;
};

export type DebtOverview = {
  active: DebtItem[];
  settled: DebtItem[];
  totals: {
    outstandingPrincipal: number;
    outstandingInterest: number;
    outstanding: number;
    interestPaid: number;
    dueThisMonth: number;
  };
};

// Installment rows repeat the operation name with a " (n/m)" suffix.
export function stripInstallmentSuffix(description: string) {
  return description.replace(/ \(\d+\/\d+\)$/, "");
}

function toDebtItem(input: DebtPlanInput, today: string) {
  const breakdown = buildFinancingBreakdown(input.plan, input.rows, today);
  const accrued = getAccrual(breakdown, today).interest;
  const installments = breakdown.rows.filter((row) => row.number != null);
  const next = installments.find((row) => !row.isPaid);

  const item: DebtItem = {
    planId: input.id,
    description: input.description,
    operationType: input.plan.operationType,
    paymentMethodId: input.paymentMethodId,
    paidInstallments: installments.filter((row) => row.isPaid).length,
    // Counted from the rows: amortizing the term shortens the schedule.
    installmentCount: installments.length,
    outstanding: breakdown.outstanding,
    payoff: toCents(breakdown.outstanding.principal + accrued),
    accruedInterest: accrued,
    nextInstallment: next ? { date: next.date, amount: next.payment } : null,
    annualCet: breakdown.cet.annual,
    isSettled: !next,
  };

  return {
    item,
    interestPaid: toCents(breakdown.totals.interest - breakdown.outstanding.interest),
    sortKey: next?.date ?? "",
  };
}

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return toCents(items.reduce((sum, item) => sum + pick(item), 0));
}

// ponytail: "paid" means the due date has passed, the same rule as the
// financing breakdown; real payment status is a follow-up (see the debt ADR).
export function buildDebtOverview(
  plans: DebtPlanInput[],
  selectedMonth: string,
  today: string,
): DebtOverview {
  const built = plans.map((plan) => toDebtItem(plan, today));
  const items = built.map(({ item }) => item);
  const monthRows = plans.flatMap((plan) =>
    plan.rows.filter(
      (row) =>
        row.kind === "expense" &&
        row.installmentNumber != null &&
        row.date.startsWith(`${selectedMonth}-`),
    ),
  );

  return {
    active: built
      .filter(({ item }) => !item.isSettled)
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
      .map(({ item }) => item),
    settled: items.filter((item) => item.isSettled),
    totals: {
      outstandingPrincipal: sumBy(items, (item) => item.outstanding.principal),
      outstandingInterest: sumBy(items, (item) => item.outstanding.interest),
      outstanding: sumBy(items, (item) => item.outstanding.total),
      interestPaid: sumBy(built, (entry) => entry.interestPaid),
      dueThisMonth: sumBy(monthRows, (row) => row.amount),
    },
  };
}
