"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getFundingContextAction, getGoalOptionsAction } from "@/app/transactions/actions";
import { ChoiceChips } from "@/components/dashboard/form-inputs/choice-chips";
import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  resolveFinancingSchedule,
  toCents,
  type FinancingBreakdown,
  type TransactionFinancingInput,
} from "@/lib/finance/financing";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { TransactionFormData } from "./transaction-form";

export type FundingMode = "balance" | "savings" | "split";

export type AdvancedOptionsState = {
  enabled: boolean;
  fundingMode: FundingMode;
  // Share (0..1) of every installment paid from savings when splitting.
  savingsShare: number;
  interestEnabled: boolean;
  financing: TransactionFinancingInput;
  // goals.id the expense pays into; null when not linked.
  goalId: string | null;
};

export const DEFAULT_ADVANCED_OPTIONS: AdvancedOptionsState = {
  enabled: false,
  fundingMode: "balance",
  savingsShare: 0.5,
  interestEnabled: false,
  goalId: null,
  financing: {
    operationType: "purchase",
    interestSystem: "price",
    rateInputMode: "rate",
    rate: undefined,
    ratePeriod: "monthly",
    installmentAmount: undefined,
    downPayment: 0,
    fees: 0,
  },
};

function getSavingsShare(advanced: AdvancedOptionsState) {
  if (advanced.fundingMode === "savings") return 1;
  if (advanced.fundingMode === "split") {
    return Math.min(Math.max(advanced.savingsShare, 0), 1);
  }
  return 0;
}

function normalizeFinancing(
  financing: TransactionFinancingInput,
): TransactionFinancingInput {
  const isInstallmentMode = financing.rateInputMode === "installment";
  const { rate, installmentAmount, ...rest } = financing;

  return {
    ...rest,
    interestSystem: isInstallmentMode ? "price" : financing.interestSystem,
    downPayment: financing.operationType === "loan" ? 0 : financing.downPayment,
    // A known installment already embeds the contract fees.
    fees: isInstallmentMode ? 0 : financing.fees,
    ...(isInstallmentMode ? { installmentAmount } : { rate }),
  };
}

function tryResolvePreview(
  amount: number,
  installmentCount: number,
  advanced: AdvancedOptionsState,
) {
  try {
    return resolveFinancingSchedule({
      principal: amount,
      installmentCount,
      financing: normalizeFinancing(advanced.financing),
    });
  } catch {
    return null;
  }
}

// What every expense row of the operation adds up to: the amount, or the
// down payment plus all financed installments.
function getOperationTotal(
  amount: number,
  installmentCount: number,
  advanced: AdvancedOptionsState,
) {
  if (!advanced.interestEnabled) return amount;
  return (
    tryResolvePreview(amount, installmentCount, advanced)?.schedule.totals
      .payable ?? amount
  );
}

// The action schema is .strict(): keys are only added when the user opted in,
// so a plain submission stays exactly as before.
export function buildTransactionSubmitData(
  formData: TransactionFormData,
  advanced: AdvancedOptionsState,
): TransactionFormData {
  if (!advanced.enabled || formData.type !== "expense") return formData;

  const savingsFundedAmount = toCents(
    getOperationTotal(formData.amount, formData.installmentCount, advanced) *
      getSavingsShare(advanced),
  );

  return {
    ...formData,
    ...(savingsFundedAmount > 0 ? { savingsFundedAmount } : {}),
    ...(advanced.interestEnabled
      ? { financing: normalizeFinancing(advanced.financing) }
      : {}),
    ...(advanced.goalId ? { goalId: advanced.goalId } : {}),
  };
}

// The installment the balance/savings split is shown against.
function getReferenceInstallment(
  amount: number,
  installmentCount: number,
  advanced: AdvancedOptionsState,
) {
  if (!advanced.interestEnabled) return amount / installmentCount;
  return (
    tryResolvePreview(amount, installmentCount, advanced)?.schedule.rows[0]
      ?.payment ?? 0
  );
}

export function getFirstChargeFromBalance(
  amount: number,
  installmentCount: number,
  advanced: AdvancedOptionsState,
) {
  const installment = getReferenceInstallment(amount, installmentCount, advanced);
  return toCents(installment * (1 - getSavingsShare(advanced)));
}

// Prefills the edit dialog from a stored financing plan.
export function advancedFromBreakdown(
  breakdown: FinancingBreakdown,
): AdvancedOptionsState {
  const { plan, totals } = breakdown;
  const isInstallmentMode = plan.rateInputMode === "installment";
  const firstInstallment = breakdown.rows.find((row) => row.number != null);

  return {
    ...advancedFromSavings(plan.savingsFundedAmount, totals.payable),
    enabled: true,
    interestEnabled: true,
    financing: {
      operationType: plan.operationType,
      interestSystem: plan.interestSystem,
      rateInputMode: plan.rateInputMode,
      rate: isInstallmentMode ? undefined : plan.rate,
      ratePeriod: plan.ratePeriod,
      installmentAmount: isInstallmentMode ? firstInstallment?.payment : undefined,
      downPayment: plan.downPayment,
      fees: plan.fees,
    },
  };
}

// Keeps the goal link of a stored row when the edit dialog opens.
export function withGoal(
  state: AdvancedOptionsState,
  goalId: string | null | undefined,
): AdvancedOptionsState {
  return goalId ? { ...state, enabled: true, goalId } : state;
}

// Prefills the funding part from a row (or plan) already paid by savings.
export function advancedFromSavings(
  savingsFunded: number,
  total: number,
): AdvancedOptionsState {
  const share = total > 0 ? Math.min(savingsFunded / total, 1) : 0;
  if (share === 0) return DEFAULT_ADVANCED_OPTIONS;

  return {
    ...DEFAULT_ADVANCED_OPTIONS,
    enabled: true,
    fundingMode: share === 1 ? "savings" : "split",
    savingsShare: share,
  };
}

type Props = {
  readonly amount: number;
  readonly installmentCount: number;
  readonly value: AdvancedOptionsState;
  readonly onChange: (value: AdvancedOptionsState) => void;
  // Lets hosts with a different label style (the edit dialog) blend in.
  readonly labelClassName?: string;
  // Hosts without their own installments field (the edit dialog) place it
  // right after the interest switch, above everything that depends on it.
  readonly installmentsField?: ReactNode;
};

function useFundingContext(enabled: boolean) {
  const [context, setContext] = useState<{
    availableBalance: number;
    totalSaved: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled || context) return;
    getFundingContextAction()
      .then(setContext)
      .catch(() => setContext(null));
  }, [enabled, context]);

  return context;
}

function useGoalOptions(enabled: boolean) {
  const [goals, setGoals] = useState<
    { id: string; name: string; icon: string }[] | null
  >(null);

  useEffect(() => {
    if (!enabled || goals) return;
    getGoalOptionsAction()
      .then(setGoals)
      .catch(() => setGoals(null));
  }, [enabled, goals]);

  return goals ?? [];
}

const LabelClassContext = createContext<string | undefined>(undefined);

const SECTION_LABEL_CLASS =
  "mb-2.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground";

function useSectionLabelClass() {
  return cn(SECTION_LABEL_CLASS, useContext(LabelClassContext));
}

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch
        id={id}
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function Choices<T extends string>(
  props: Omit<React.ComponentProps<typeof ChoiceChips<T>>, "labelClassName">,
) {
  return <ChoiceChips {...props} labelClassName={useSectionLabelClass()} />;
}

function Money(props: Omit<React.ComponentProps<typeof CurrencyInput>, "labelClassName">) {
  return <CurrencyInput {...props} labelClassName={useContext(LabelClassContext)} />;
}

function Hint({ children }: { readonly children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>;
}

type FinancingFieldProps = {
  readonly financing: TransactionFinancingInput;
  readonly setFinancing: (patch: Partial<TransactionFinancingInput>) => void;
};

function parseRate(text: string) {
  const parsed = Number(text.replace(",", "."));
  return text.trim() === "" || Number.isNaN(parsed) ? undefined : parsed;
}

function RateInput({ financing, setFinancing }: FinancingFieldProps) {
  const { t } = useI18n();
  // Kept as text so a partial "2," survives while typing.
  const [text, setText] = useState(
    financing.rate === undefined ? "" : String(financing.rate).replace(".", ","),
  );

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <Label
        htmlFor="financing-rate"
        className={cn(
          "text-xs font-medium uppercase tracking-wide text-foreground/70",
          useContext(LabelClassContext),
        )}
      >
        {t("transaction.advanced.rate")}
      </Label>
      <Input
        id="financing-rate"
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        autoComplete="off"
        value={text}
        className="bg-background/70 text-sm tabular-nums"
        onChange={(event) => {
          setText(event.target.value);
          setFinancing({ rate: parseRate(event.target.value) });
        }}
      />
    </div>
  );
}

function ModeLink({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-xs font-medium text-green-400 underline-offset-4 hover:underline"
    >
      {label}
    </button>
  );
}

const SYSTEM_HINT_KEYS = {
  simple: "transaction.advanced.systemSimpleHint",
  price: "transaction.advanced.systemPriceHint",
  sac: "transaction.advanced.systemSacHint",
} as const;

function InstallmentModeFields({ financing, setFinancing }: FinancingFieldProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2">
      <Money
        id="financing-installment"
        label={t("transaction.advanced.installmentAmount")}
        value={financing.installmentAmount ?? 0}
        onValueChange={(installmentAmount) => setFinancing({ installmentAmount })}
      />
      <ModeLink
        label={t("transaction.advanced.useRateInstead")}
        onClick={() => setFinancing({ rateInputMode: "rate" })}
      />
    </div>
  );
}

function RateFields({ financing, setFinancing }: FinancingFieldProps) {
  const { t } = useI18n();

  if (financing.rateInputMode === "installment") {
    return <InstallmentModeFields financing={financing} setFinancing={setFinancing} />;
  }

  return (
    <>
      <div>
        <Choices
          label={t("transaction.advanced.system")}
          value={financing.interestSystem}
          onChange={(interestSystem) => setFinancing({ interestSystem })}
          options={[
            { value: "price", label: t("transaction.advanced.systemPrice") },
            { value: "sac", label: t("transaction.advanced.systemSac") },
            { value: "simple", label: t("transaction.advanced.systemSimple") },
          ]}
        />
        <Hint>{t(SYSTEM_HINT_KEYS[financing.interestSystem])}</Hint>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <RateInput financing={financing} setFinancing={setFinancing} />
          <Choices
            label={t("transaction.advanced.ratePeriod")}
            hideLabel
            value={financing.ratePeriod}
            onChange={(ratePeriod) => setFinancing({ ratePeriod })}
            options={[
              { value: "monthly", label: t("transaction.advanced.ratePeriodMonthly") },
              { value: "annual", label: t("transaction.advanced.ratePeriodAnnual") },
            ]}
          />
        </div>
        <ModeLink
          label={t("transaction.advanced.useInstallmentInstead")}
          onClick={() => setFinancing({ rateInputMode: "installment" })}
        />
      </div>
    </>
  );
}

function CostFields({ financing, setFinancing }: FinancingFieldProps) {
  const { t } = useI18n();
  const showDownPayment = financing.operationType === "purchase";
  const showFees = financing.rateInputMode === "rate";

  if (!showDownPayment && !showFees) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {showDownPayment ? (
        <Money
          id="financing-down-payment"
          label={t("transaction.advanced.downPayment")}
          value={financing.downPayment}
          onValueChange={(downPayment) => setFinancing({ downPayment })}
        />
      ) : null}
      {showFees ? (
        <div>
          <Money
            id="financing-fees"
            label={t("transaction.advanced.fees")}
            value={financing.fees}
            onValueChange={(fees) => setFinancing({ fees })}
          />
          <Hint>{t("transaction.advanced.feesHint")}</Hint>
        </div>
      ) : null}
    </div>
  );
}

function FinancingFields({ value, onChange }: Pick<Props, "value" | "onChange">) {
  const { t } = useI18n();
  const financing = value.financing;
  const setFinancing = (patch: Partial<TransactionFinancingInput>) =>
    onChange({ ...value, financing: { ...financing, ...patch } });

  return (
    <>
      <Choices
        label={t("transaction.advanced.operation")}
        value={financing.operationType}
        onChange={(operationType) => setFinancing({ operationType })}
        options={[
          { value: "purchase", label: t("transaction.advanced.operationPurchase") },
          { value: "loan", label: t("transaction.advanced.operationLoan") },
        ]}
      />
      <RateFields financing={financing} setFinancing={setFinancing} />
      <CostFields financing={financing} setFinancing={setFinancing} />
    </>
  );
}

function hasFinancingInput(amount: number, financing: TransactionFinancingInput) {
  const known =
    financing.rateInputMode === "installment"
      ? financing.installmentAmount
      : financing.rate;
  return amount > 0 && known !== undefined && known > 0;
}

function FinancingPreview({ amount, installmentCount, value }: Omit<Props, "onChange">) {
  const { t, formatCurrency, formatNumber } = useI18n();

  // Nothing to preview (or to complain about) until the key value is typed.
  if (!hasFinancingInput(amount, value.financing)) return null;

  const preview = tryResolvePreview(amount, installmentCount, value);

  if (!preview) {
    return <p className="text-xs text-destructive">{t("transaction.advanced.previewError")}</p>;
  }

  const rows = preview.schedule.rows;
  const percent = (rate: number) => `${formatNumber(rate * 100)}%`;
  const items: [string, string][] = [
    [t("transaction.advanced.firstPayment"), formatCurrency(rows[0].payment)],
    [t("transaction.advanced.lastPayment"), formatCurrency(rows.at(-1)?.payment ?? 0)],
    [t("transaction.advanced.totalInterest"), formatCurrency(preview.schedule.totals.interest)],
    [t("transaction.advanced.totalPayable"), formatCurrency(preview.schedule.totals.payable)],
    [
      t("transaction.advanced.cet"),
      `${percent(preview.cet.monthly)} ${t("transaction.advanced.perMonth")} · ${percent(preview.cet.annual)} ${t("transaction.advanced.perYear")}`,
    ],
  ];

  if (value.financing.rateInputMode === "installment") {
    items.push([
      t("transaction.advanced.impliedRate"),
      `${percent(preview.monthlyRate)} ${t("transaction.advanced.perMonth")}`,
    ]);
  }

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {items.map(([label, text]) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-semibold tabular-nums">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

function SplitSlider({ amount, installmentCount, value, onChange }: Omit<Props, "labelClassName">) {
  const { t, formatCurrency } = useI18n();
  const installment = getReferenceInstallment(amount, installmentCount, value);
  const maxCents = Math.round(installment * 100);
  const savingsPart = toCents(installment * value.savingsShare);
  const suffix = installmentCount > 1 ? ` ${t("transaction.advanced.perInstallment")}` : "";

  return (
    <div>
      <span className={useSectionLabelClass()}>{t("transaction.advanced.splitLabel")}</span>
      <Slider
        aria-label={t("transaction.advanced.splitLabel")}
        className="cursor-pointer data-disabled:cursor-not-allowed"
        min={0}
        max={Math.max(maxCents, 1)}
        step={1}
        disabled={maxCents === 0}
        value={[Math.round(maxCents * value.savingsShare)]}
        onValueChange={([cents]) =>
          onChange({ ...value, savingsShare: maxCents > 0 ? cents / maxCents : 0 })
        }
      />
      <div className="mt-2 flex justify-between gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">{t("transaction.advanced.fundingBalance")}</p>
          <p className="font-semibold tabular-nums">
            {formatCurrency(toCents(installment - savingsPart))}
            {suffix}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">{t("transaction.advanced.fundingSavings")}</p>
          <p className="font-semibold tabular-nums">
            {formatCurrency(savingsPart)}
            {suffix}
          </p>
        </div>
      </div>
    </div>
  );
}

function FundingFields({
  amount,
  installmentCount,
  value,
  onChange,
  totalSaved,
}: Omit<Props, "labelClassName"> & { readonly totalSaved?: number }) {
  const { t, formatCurrency } = useI18n();

  return (
    <>
      <div>
        <Choices
          label={t("transaction.advanced.payWith")}
          value={value.fundingMode}
          onChange={(fundingMode) => onChange({ ...value, fundingMode })}
          options={[
            { value: "balance", label: t("transaction.advanced.fundingBalance") },
            { value: "savings", label: t("transaction.advanced.fundingSavings") },
            { value: "split", label: t("transaction.advanced.fundingSplit") },
          ]}
        />
        {totalSaved === undefined ? null : (
          <Hint>
            {t("transaction.advanced.savedTotalHint")}: <span>{formatCurrency(totalSaved)}</span>
          </Hint>
        )}
      </div>
      {value.fundingMode === "split" ? (
        <SplitSlider
          amount={amount}
          installmentCount={installmentCount}
          value={value}
          onChange={onChange}
        />
      ) : null}
    </>
  );
}

function InterestFields({
  amount,
  installmentCount,
  value,
  onChange,
  installmentsField,
}: Omit<Props, "labelClassName">) {
  const { t } = useI18n();

  return (
    <>
      <ToggleRow
        id="advanced-interest"
        label={t("transaction.advanced.interestToggle")}
        checked={value.interestEnabled}
        onCheckedChange={(interestEnabled) => onChange({ ...value, interestEnabled })}
      />
      {value.interestEnabled ? (
        <>
          {installmentsField}
          <FinancingFields value={value} onChange={onChange} />
          <FinancingPreview amount={amount} installmentCount={installmentCount} value={value} />
        </>
      ) : null}
    </>
  );
}

const NO_GOAL = "none";

function GoalFields({
  goals,
  value,
  onChange,
}: {
  readonly goals: { id: string; name: string; icon: string }[];
  readonly value: AdvancedOptionsState;
  readonly onChange: (value: AdvancedOptionsState) => void;
}) {
  const { t } = useI18n();
  const labelClass = useSectionLabelClass();
  // A loan's installments repay the bank; they never feed a goal.
  const isLoan = value.interestEnabled && value.financing.operationType === "loan";

  if (goals.length === 0 || isLoan) return null;

  return (
    <div>
      <Label htmlFor="advanced-goal" className={labelClass}>
        {t("transaction.advanced.goal")}
      </Label>
      <Select
        value={value.goalId ?? NO_GOAL}
        onValueChange={(goalId) =>
          onChange({ ...value, goalId: goalId === NO_GOAL ? null : goalId })
        }
      >
        <SelectTrigger id="advanced-goal" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_GOAL}>{t("transaction.advanced.goalNone")}</SelectItem>
          {goals.map((goal) => (
            <SelectItem key={goal.id} value={goal.id}>
              {goal.icon} {goal.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TransactionAdvancedOptions({
  amount,
  installmentCount,
  value,
  onChange,
  labelClassName,
  installmentsField,
}: Props) {
  const { t } = useI18n();
  const context = useFundingContext(value.enabled);
  const goals = useGoalOptions(value.enabled);
  const firstCharge = getFirstChargeFromBalance(amount, installmentCount, value);

  return (
    <LabelClassContext.Provider value={labelClassName}>
      <Collapsible open={value.enabled} className="flex flex-col gap-5 min-w-0">
        <ToggleRow
          id="advanced-options"
          label={t("transaction.advanced.toggle")}
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
        <CollapsibleContent className="flex flex-col gap-5 min-w-0">
          {/* Dependency order: the split below is per installment, interest included. */}
          <InterestFields
            amount={amount}
            installmentCount={installmentCount}
            value={value}
            onChange={onChange}
            installmentsField={installmentsField}
          />
          <FundingFields
            amount={amount}
            installmentCount={installmentCount}
            value={value}
            onChange={onChange}
            totalSaved={context?.totalSaved}
          />
          <GoalFields goals={goals} value={value} onChange={onChange} />
          {context && firstCharge > context.availableBalance ? (
            <Alert>
              <AlertDescription>{t("transaction.advanced.balanceAlert")}</AlertDescription>
            </Alert>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </LabelClassContext.Provider>
  );
}
