"use client";

import { useState } from "react";

import { ChoiceChips } from "@/components/dashboard/form-inputs/choice-chips";
import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AmortizeDebtInput } from "@/lib/finance/transactions";
import type { DebtItem } from "@/lib/finance/debts";
import { useI18n } from "@/lib/i18n";

type AmortizeDebtDialogProps = {
  readonly debt: DebtItem | null;
  readonly availableSavings: number;
  readonly onClose: () => void;
  readonly onSubmit: (data: AmortizeDebtInput) => Promise<void>;
};

const LABEL_CLASS = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-foreground/70";

function SourceChoice({
  source,
  onChange,
  availableSavings,
}: {
  readonly source: AmortizeDebtInput["source"];
  readonly onChange: (source: AmortizeDebtInput["source"]) => void;
  readonly availableSavings: number;
}) {
  const { t, formatCurrency } = useI18n();

  return (
    <div>
      <ChoiceChips
        label={t("debts.amortize.payWith")}
        labelClassName={LABEL_CLASS}
        value={source}
        onChange={onChange}
        options={[
          { value: "savings", label: t("transaction.advanced.fundingSavings") },
          { value: "balance", label: t("transaction.advanced.fundingBalance") },
        ]}
      />
      {source === "savings" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("transaction.advanced.savedTotalHint")}:{" "}
          <span className="tabular-nums">{formatCurrency(availableSavings)}</span>
        </p>
      ) : null}
    </div>
  );
}

function useSubmit({ onSubmit, onClose }: Pick<AmortizeDebtDialogProps, "onSubmit" | "onClose">) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(data: AmortizeDebtInput) {
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(data);
      onClose();
    } catch {
      setError(t("debts.amortize.error"));
    } finally {
      setIsSaving(false);
    }
  }

  return { error, isSaving, submit };
}

function getAmountIssue({
  amount,
  debt,
  source,
  availableSavings,
  t,
  formatCurrency,
}: {
  amount: number;
  debt: DebtItem;
  source: AmortizeDebtInput["source"];
  availableSavings: number;
  t: (key: string) => string;
  formatCurrency: (value: number) => string;
}) {
  if (amount > debt.payoff) return t("debts.amortize.exceedsDebt");
  if (amount > 0 && amount <= debt.accruedInterest) {
    return t("debts.amortize.belowInterest").replace("{interest}", formatCurrency(debt.accruedInterest));
  }
  if (source === "savings" && amount > availableSavings) return t("debts.amortize.exceedsSavings");
  return null;
}

function AmortizeForm({
  debt,
  availableSavings,
  onClose,
  onSubmit,
}: AmortizeDebtDialogProps & { readonly debt: DebtItem }) {
  const { t, formatCurrency } = useI18n();
  const [amount, setAmount] = useState(0);
  const [source, setSource] = useState<AmortizeDebtInput["source"]>("savings");
  const [mode, setMode] = useState<AmortizeDebtInput["mode"]>("installment");
  const { error, isSaving, submit } = useSubmit({ onSubmit, onClose });
  const validation = getAmountIssue({ amount, debt, source, availableSavings, t, formatCurrency });
  const description = t("debts.amortize.rowDescription").replace("{name}", debt.description);

  return (
    <div className="space-y-5">
      <CurrencyInput id="amortize-amount" label={t("debts.amortize.amount")} value={amount} onValueChange={setAmount} />
      <p className="text-xs text-muted-foreground">{t("debts.amortize.payoff")}: {formatCurrency(debt.payoff)}</p>
      <SourceChoice source={source} onChange={setSource} availableSavings={availableSavings} />
      <ChoiceChips
        label={t("debts.amortize.effectLabel")}
        labelClassName={LABEL_CLASS}
        value={mode}
        onChange={setMode}
        options={[
          {
            value: "installment",
            label: t("debts.amortize.reduceInstallment"),
            hint: t("debts.amortize.reduceInstallmentHint"),
          },
          { value: "term", label: t("debts.amortize.reduceTerm"), hint: t("debts.amortize.reduceTermHint") },
        ]}
      />
      {validation || error ? (
        <p role="alert" className="text-sm text-destructive">
          {validation ?? error}
        </p>
      ) : null}
      <Button
        className="w-full"
        disabled={amount <= 0 || validation !== null || isSaving}
        onClick={() => submit({ planId: debt.planId, amount, source, mode, description })}
      >
        {t("debts.amortize.confirm")}
      </Button>
    </div>
  );
}

export function AmortizeDebtDialog(props: AmortizeDebtDialogProps) {
  const { t } = useI18n();
  const { debt, onClose } = props;

  return (
    <Dialog open={debt !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-y-auto sm:h-[50vh] sm:w-[50vw] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{t("debts.amortize.title")}</DialogTitle>
          <DialogDescription>{debt?.description}</DialogDescription>
        </DialogHeader>
        {debt ? <AmortizeForm {...props} debt={debt} /> : null}
      </DialogContent>
    </Dialog>
  );
}
