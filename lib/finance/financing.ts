export type InterestSystem = "simple" | "price" | "sac";
export type RatePeriod = "monthly" | "annual";
export type OperationType = "purchase" | "loan";
export type RateInputMode = "rate" | "installment";

export type TransactionFinancingInput = {
  operationType: OperationType;
  interestSystem: InterestSystem;
  rateInputMode: RateInputMode;
  rate?: number;
  ratePeriod: RatePeriod;
  installmentAmount?: number;
  downPayment: number;
  fees: number;
};

export type FinancingErrorCode =
  | "installment_too_low"
  | "invalid_count"
  | "invalid_amortization"
  | "invalid_down_payment"
  | "invalid_fees"
  | "invalid_installment"
  | "invalid_principal"
  | "invalid_rate"
  | "rate_not_converged"
  | "savings_exceeds_total";

export class FinancingError extends Error {
  readonly code: FinancingErrorCode;

  constructor(code: FinancingErrorCode) {
    super(`Financing input is invalid: ${code}`);
    this.name = "FinancingError";
    this.code = code;
  }
}

export type FinancingScheduleRow = {
  number: number;
  payment: number;
  principal: number;
  interest: number;
  balanceAfter: number;
};

export type FinancingSchedule = {
  financed: number;
  rows: FinancingScheduleRow[];
  totals: {
    principal: number;
    downPayment: number;
    fees: number;
    interest: number;
    payable: number;
  };
};

const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-10;
const CENT_TOLERANCE = 0.005;

export function toCents(value: number) {
  return Math.round(value * 100) / 100;
}

function isNonNegativeFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function toMonthlyRate(
  ratePct: number,
  period: RatePeriod,
  system: InterestSystem,
) {
  if (!isNonNegativeFinite(ratePct) || ratePct > 1000) {
    throw new FinancingError("invalid_rate");
  }

  const rate = ratePct / 100;

  if (period === "monthly") return rate;
  if (system === "simple") return rate / 12;
  return (1 + rate) ** (1 / 12) - 1;
}

// Solves Σ cashflows[k] / (1+r)^(k+1) = presentValue. The sum is decreasing
// and convex in r, so Newton from r≈0 (left of the root) climbs to it
// monotonically.
function solveDiscountRate(presentValue: number, cashflows: number[]) {
  let rate = 1e-6;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let value = -presentValue;
    let derivative = 0;

    cashflows.forEach((cashflow, index) => {
      const period = index + 1;
      value += cashflow / (1 + rate) ** period;
      derivative -= (period * cashflow) / (1 + rate) ** (period + 1);
    });

    const step = value / derivative;
    rate -= step;

    if (Math.abs(step) < TOLERANCE) return rate;
  }

  throw new FinancingError("rate_not_converged");
}

export function solveImpliedMonthlyRate(
  financed: number,
  installment: number,
  count: number,
) {
  const total = installment * count;

  if (total < financed - CENT_TOLERANCE) {
    throw new FinancingError("installment_too_low");
  }

  if (total <= financed + CENT_TOLERANCE) return 0;

  return solveDiscountRate(financed, new Array<number>(count).fill(installment));
}

type ScheduleInput = {
  principal: number;
  downPayment: number;
  fees: number;
  monthlyRate: number;
  system: InterestSystem;
  installmentCount: number;
  // Share of a full period the first installment accrues interest for; below
  // 1 only when part of that period was already paid as accrued interest.
  firstPeriodFraction?: number;
};

function assertScheduleInput(input: ScheduleInput) {
  if (!(Number.isFinite(input.principal) && input.principal > 0)) {
    throw new FinancingError("invalid_principal");
  }
  if (
    !isNonNegativeFinite(input.downPayment) ||
    input.downPayment >= input.principal
  ) {
    throw new FinancingError("invalid_down_payment");
  }
  if (!isNonNegativeFinite(input.fees)) {
    throw new FinancingError("invalid_fees");
  }
  if (!isNonNegativeFinite(input.monthlyRate)) {
    throw new FinancingError("invalid_rate");
  }
  if (
    !Number.isInteger(input.installmentCount) ||
    input.installmentCount < 1 ||
    input.installmentCount > 120
  ) {
    throw new FinancingError("invalid_count");
  }
}

function pricePayment(financed: number, rate: number, count: number) {
  if (rate === 0) return financed / count;
  return (financed * rate) / (1 - (1 + rate) ** -count);
}

// With a short first period the equal payment solves
// financed·(1 + rate·fraction) = PMT · (1 + rate) · (1 − (1+rate)^−count) / rate,
// i.e. a regular price payment on this reduced amount (fraction 1 gives `financed`).
function stubbedFinanced(financed: number, rate: number, fraction: number) {
  return (financed * (1 + rate * fraction)) / (1 + rate);
}

function periodInterest(input: ScheduleInput, base: number, number: number) {
  return toCents(base * input.monthlyRate * (number === 1 ? (input.firstPeriodFraction ?? 1) : 1));
}

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return toCents(items.reduce((sum, item) => sum + pick(item), 0));
}

function buildScheduleRows(financed: number, input: ScheduleInput) {
  const count = input.installmentCount;
  const rate = input.monthlyRate;
  const linearPrincipal = toCents(financed / count);
  const fraction = input.firstPeriodFraction ?? 1;
  const pricePmt = toCents(pricePayment(stubbedFinanced(financed, rate, fraction), rate, count));
  const rows: FinancingScheduleRow[] = [];
  let balance = financed;

  for (let number = 1; number <= count; number += 1) {
    const interest = periodInterest(input, input.system === "simple" ? financed : balance, number);
    const regularPrincipal =
      input.system === "price" ? toCents(pricePmt - interest) : linearPrincipal;
    // The last row absorbs the rounding residue, so the balance closes at 0.00.
    const principal = number === count ? balance : regularPrincipal;
    balance = toCents(balance - principal);
    rows.push({
      number,
      payment: toCents(principal + interest),
      principal,
      interest,
      balanceAfter: balance,
    });
  }

  return rows;
}

export function buildFinancingSchedule(input: ScheduleInput): FinancingSchedule {
  assertScheduleInput(input);

  const financed = toCents(input.principal - input.downPayment + input.fees);
  const rows = buildScheduleRows(financed, input);

  return {
    financed,
    rows,
    totals: {
      principal: input.principal,
      downPayment: input.downPayment,
      fees: input.fees,
      interest: sumBy(rows, (row) => row.interest),
      payable: toCents(sumBy(rows, (row) => row.payment) + input.downPayment),
    },
  };
}

export function computeCet(received: number, payments: number[]) {
  const total = payments.reduce((sum, payment) => sum + payment, 0);

  // ponytail: no negative CET; paying back ≤ what was received reports 0.
  if (total <= received + CENT_TOLERANCE) return { monthly: 0, annual: 0 };

  const monthly = solveDiscountRate(received, payments);
  return { monthly, annual: (1 + monthly) ** 12 - 1 };
}

export function allocateSavingsFunding(
  amounts: number[],
  savingsAmount: number,
) {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);

  if (
    !isNonNegativeFinite(savingsAmount) ||
    savingsAmount > total + CENT_TOLERANCE
  ) {
    throw new FinancingError("savings_exceeds_total");
  }

  // Every row carries the same share of its own amount, so each installment
  // is split between balance and savings alike; the last row takes the
  // rounding residue.
  const share = total > 0 ? savingsAmount / total : 0;
  let remaining = toCents(savingsAmount);

  return amounts.map((amount, index) => {
    const target =
      index === amounts.length - 1 ? remaining : toCents(amount * share);
    const slice = Math.min(amount, remaining, target);
    remaining = toCents(remaining - slice);
    return slice;
  });
}

export function resolveFinancingSchedule({
  principal,
  installmentCount,
  financing,
}: {
  principal: number;
  installmentCount: number;
  financing: TransactionFinancingInput;
}) {
  const downPayment =
    financing.operationType === "loan" ? 0 : financing.downPayment;
  const isInstallmentMode = financing.rateInputMode === "installment";
  const system: InterestSystem = isInstallmentMode
    ? "price"
    : financing.interestSystem;

  const installmentAmount = Number(financing.installmentAmount);

  // Number(undefined) is NaN, which must be rejected like zero.
  if (
    isInstallmentMode &&
    (Number.isNaN(installmentAmount) || installmentAmount <= 0)
  ) {
    throw new FinancingError("invalid_installment");
  }

  const monthlyRate = isInstallmentMode
    ? solveImpliedMonthlyRate(
        principal - downPayment + financing.fees,
        installmentAmount,
        installmentCount,
      )
    : toMonthlyRate(Number(financing.rate), financing.ratePeriod, system);
  const schedule = buildFinancingSchedule({
    principal,
    downPayment,
    fees: financing.fees,
    monthlyRate,
    system,
    installmentCount,
  });
  const cet = computeCet(
    principal - downPayment,
    schedule.rows.map((row) => row.payment),
  );

  return { monthlyRate, system, schedule, cet };
}

export type FinancingPlanRecord = {
  operationType: OperationType;
  interestSystem: InterestSystem;
  rateInputMode: RateInputMode;
  rate: number;
  ratePeriod: RatePeriod;
  principal: number;
  downPayment: number;
  fees: number;
  installmentCount: number;
  savingsFundedAmount: number;
};

export type FinancingRowRecord = {
  id: string;
  date: string;
  amount: number;
  kind: "expense" | "income" | "saving";
  installmentNumber: number | null;
  principalPortion: number | null;
  interestPortion: number | null;
  savingsFundedAmount: number;
  // Extra payment that reduced the principal ahead of schedule.
  isAmortization?: boolean;
};

export type FinancingBreakdownRow = {
  id: string;
  number: number | null;
  isAmortization: boolean;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  savingsFunded: number;
  balanceAfter: number;
  isPaid: boolean;
};

export type FinancingBreakdown = {
  plan: FinancingPlanRecord;
  // Operation date: the earliest row (down payment, loan income or 1st installment).
  startDate: string;
  monthlyRate: number;
  cet: { monthly: number; annual: number };
  totals: {
    principal: number;
    downPayment: number;
    fees: number;
    interest: number;
    payable: number;
    savingsFunded: number;
  };
  rows: FinancingBreakdownRow[];
  outstanding: { principal: number; interest: number; total: number };
};

function toBreakdownRows(
  plan: FinancingPlanRecord,
  rows: FinancingRowRecord[],
  today: string,
): FinancingBreakdownRow[] {
  const expenseRows = rows
    .filter((row) => row.kind === "expense")
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        (left.installmentNumber ?? 0) - (right.installmentNumber ?? 0),
    );
  let balance = toCents(plan.principal - plan.downPayment + plan.fees);

  return expenseRows.map((row) => {
    const principal = row.principalPortion ?? row.amount;
    const isAmortization = row.isAmortization === true;
    // The down-payment row (no installment number) is paid before financing.
    if (row.installmentNumber != null || isAmortization) {
      balance = toCents(balance - principal);
    }
    return {
      id: row.id,
      number: row.installmentNumber,
      isAmortization,
      date: row.date,
      payment: row.amount,
      principal,
      interest: row.interestPortion ?? 0,
      savingsFunded: row.savingsFundedAmount,
      balanceAfter: balance,
      isPaid: row.date <= today,
    };
  });
}

export type AmortizationMode = "installment" | "term";

const DAYS_PER_MONTH = 30;

function daysBetween(from: string, to: string) {
  return Math.max(
    0,
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000),
  );
}

// Interest accrued on the outstanding principal since the last payment (a
// paid installment or amortization, else the operation date), over at most
// one period. Compound for price/sac, so it matches the present value of the
// remaining payments (CDC art. 52 §2); linear for flat "simple" interest.
export function getAccrual(breakdown: FinancingBreakdown, today: string) {
  const lastPayment = breakdown.rows
    .filter((row) => row.isPaid && (row.number != null || row.isAmortization))
    .map((row) => row.date)
    .sort()
    .at(-1);
  const days = Math.min(daysBetween(lastPayment ?? breakdown.startDate, today), DAYS_PER_MONTH);
  const periods = days / DAYS_PER_MONTH;
  const { principal } = breakdown.outstanding;
  const { monthlyRate } = breakdown;
  const growth =
    breakdown.plan.interestSystem === "simple"
      ? monthlyRate * periods
      : (1 + monthlyRate) ** periods - 1;

  return { days, interest: toCents(principal * growth) };
}

type AmortizationInput = {
  plan: FinancingPlanRecord;
  outstandingPrincipal: number;
  accruedInterest: number;
  // Days that interest covers; the first rebuilt installment only accrues for the rest of its period.
  elapsedDays: number;
  amount: number;
  mode: AmortizationMode;
  // The installments still to pay; `next` is the first of them.
  installments: { count: number; next: { payment: number; principal: number } };
};

// Installments needed to clear `remaining`. Price keeps the whole payment;
// sac and simple keep the principal paid per installment (interest falls with the balance).
function amortizedTerm(
  plan: FinancingPlanRecord,
  remaining: number,
  { count, next }: AmortizationInput["installments"],
) {
  const rate = toMonthlyRate(plan.rate, plan.ratePeriod, plan.interestSystem);
  const needed =
    plan.interestSystem === "price" && rate > 0
      ? -Math.log(1 - (remaining * rate) / next.payment) / Math.log(1 + rate)
      : remaining / next.principal;

  // The epsilon keeps a float that lands a hair above an integer from adding a month.
  return Number.isFinite(needed)
    ? Math.min(count, Math.max(1, Math.ceil(needed - 1e-9)))
    : count;
}

// Paying `amount` today clears the accrued interest first, the rest cuts the
// principal. The remaining installments are rebuilt with the same rate and
// system, either smaller over the same term or as many as the old payment
// needs. An empty list means the debt is paid off.
export function buildAmortization(input: AmortizationInput) {
  const { plan, outstandingPrincipal, accruedInterest, elapsedDays, amount, mode, installments } = input;
  const principalPaid = toCents(amount - accruedInterest);

  if (
    !Number.isFinite(amount) ||
    principalPaid <= 0 ||
    principalPaid > outstandingPrincipal + CENT_TOLERANCE
  ) {
    throw new FinancingError("invalid_amortization");
  }

  const remaining = toCents(outstandingPrincipal - principalPaid);
  const paid = { interest: accruedInterest, principal: principalPaid };
  if (remaining <= 0) return { ...paid, rows: [] };

  const rows = buildFinancingSchedule({
    principal: remaining,
    downPayment: 0,
    fees: 0,
    monthlyRate: toMonthlyRate(plan.rate, plan.ratePeriod, plan.interestSystem),
    system: plan.interestSystem,
    installmentCount:
      mode === "term" ? amortizedTerm(plan, remaining, installments) : installments.count,
    firstPeriodFraction: Math.max(0, 1 - elapsedDays / DAYS_PER_MONTH),
  }).rows;

  return { ...paid, rows };
}

// The contract rate does not change when the debt is amortized, so its CET
// comes from the original schedule, not from the (reshaped) stored rows.
function contractCet(plan: FinancingPlanRecord) {
  const { rows } = buildFinancingSchedule({
    principal: plan.principal,
    downPayment: plan.downPayment,
    fees: plan.fees,
    monthlyRate: toMonthlyRate(plan.rate, plan.ratePeriod, plan.interestSystem),
    system: plan.interestSystem,
    installmentCount: plan.installmentCount,
  });

  return computeCet(plan.principal - plan.downPayment, rows.map((row) => row.payment));
}

export function buildFinancingBreakdown(
  plan: FinancingPlanRecord,
  rows: FinancingRowRecord[],
  today: string,
): FinancingBreakdown {
  const breakdownRows = toBreakdownRows(plan, rows, today);
  const future = breakdownRows.filter((row) => !row.isPaid);

  return {
    plan,
    startDate: rows.map((row) => row.date).sort()[0] ?? "",
    monthlyRate: toMonthlyRate(plan.rate, plan.ratePeriod, plan.interestSystem),
    cet: breakdownRows.some((row) => row.isAmortization)
      ? contractCet(plan)
      : computeCet(
          plan.principal - plan.downPayment,
          breakdownRows.filter((row) => row.number != null).map((row) => row.payment),
        ),
    totals: {
      principal: plan.principal,
      downPayment: plan.downPayment,
      fees: plan.fees,
      interest: sumBy(breakdownRows, (row) => row.interest),
      payable: sumBy(breakdownRows, (row) => row.payment),
      savingsFunded: sumBy(breakdownRows, (row) => row.savingsFunded),
    },
    rows: breakdownRows,
    outstanding: {
      principal: sumBy(future, (row) => row.principal),
      interest: sumBy(future, (row) => row.interest),
      total: sumBy(future, (row) => row.payment),
    },
  };
}
