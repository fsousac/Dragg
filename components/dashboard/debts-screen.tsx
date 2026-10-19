"use client";

import { useState } from "react";
import { ChevronDown, Landmark, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { AmortizeDebtDialog } from "@/components/dashboard/amortize-debt-dialog";
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import { FinancingBreakdown } from "@/components/dashboard/financing-breakdown";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  DEFAULT_ADVANCED_OPTIONS,
  type AdvancedOptionsState,
} from "@/components/dashboard/transaction-advanced-options";
import type { TransactionFormData } from "@/components/dashboard/transaction-form";
import { buildNewTransactionInput } from "@/components/dashboard/transactions-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import type { DebtItem, DebtOverview } from "@/lib/finance/debts";
import { GROUP_COLORS } from "@/lib/finance/group-colors";
import type {
  AmortizeDebtInput,
  CreateCategoryInput,
  CreatePaymentMethodInput,
  NewTransactionInput,
  TransactionFormCategory,
  TransactionFormPaymentMethod,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";

type DebtsScreenProps = {
  readonly overview: DebtOverview;
  readonly categories: TransactionFormCategory[];
  readonly paymentMethods: TransactionFormPaymentMethod[];
  readonly availableSavings: number;
  readonly amortizeDebtAction: (data: AmortizeDebtInput) => Promise<void>;
  readonly createTransactionAction: (data: NewTransactionInput) => Promise<void>;
  readonly createCategoryAction: (data: CreateCategoryInput) => Promise<void>;
  readonly createPaymentMethodAction: (data: CreatePaymentMethodInput) => Promise<void>;
};

const INTEREST_COLOR = GROUP_COLORS.wants;

// The "new purchase with interest" entry point opens the form ready for it.
const WITH_INTEREST: AdvancedOptionsState = {
  ...DEFAULT_ADVANCED_OPTIONS,
  enabled: true,
  interestEnabled: true,
};

function Figure({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

// The one loud element of the page: how much of what is still owed is interest.
function PrincipalInterestBar({ totals }: { readonly totals: DebtOverview["totals"] }) {
  const { t, formatCurrency } = useI18n();
  const interestShare = totals.outstanding > 0 ? totals.outstandingInterest / totals.outstanding : 0;
  const summary = t("debts.summary.split")
    .replace("{principal}", formatCurrency(totals.outstandingPrincipal))
    .replace("{interest}", formatCurrency(totals.outstandingInterest));

  return (
    <div className="mt-6 space-y-2">
      <div role="img" aria-label={summary} className="flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ flexGrow: 1 - interestShare }} />
        <div style={{ flexGrow: interestShare, backgroundColor: INTEREST_COLOR }} />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2.5 rounded-full bg-primary" />
          {t("debts.summary.principal")}
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(totals.outstandingPrincipal)}
          </span>
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: INTEREST_COLOR }} />
          {t("debts.summary.interest")}
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(totals.outstandingInterest)}
          </span>
        </span>
      </div>
    </div>
  );
}

function DebtsSummaryCard({ totals }: { readonly totals: DebtOverview["totals"] }) {
  const { t, formatCurrency } = useI18n();

  return (
    <Card className="mb-6 border-border bg-card card-shadow">
      <CardContent className="px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Figure label={t("debts.summary.outstanding")} value={formatCurrency(totals.outstanding)} />
          <Figure label={t("debts.summary.dueThisMonth")} value={formatCurrency(totals.dueThisMonth)} />
          <Figure label={t("debts.summary.interestPaid")} value={formatCurrency(totals.interestPaid)} />
        </div>
        {totals.outstanding > 0 ? <PrincipalInterestBar totals={totals} /> : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
      {detail ? <dd className="text-xs tabular-nums text-muted-foreground">{detail}</dd> : null}
    </div>
  );
}

type DebtCardProps = {
  readonly debt: DebtItem;
  readonly paymentMethodLabel: string | null;
  readonly onOpenSchedule: (debt: DebtItem) => void;
  readonly onAmortize: (debt: DebtItem) => void;
};

function DebtCardStats({ debt }: { readonly debt: DebtItem }) {
  const { t, formatCurrency, formatDate, formatNumber } = useI18n();
  const next = debt.nextInstallment;

  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      <Stat label={t("financing.outstanding")} value={formatCurrency(debt.outstanding.total)} />
      <Stat
        label={t("debts.card.next")}
        value={next ? formatCurrency(next.amount) : "—"}
        detail={next ? formatDate(next.date) : undefined}
      />
      <Stat label={t("debts.card.interestLeft")} value={formatCurrency(debt.outstanding.interest)} />
      <Stat
        label={t("transaction.advanced.cet")}
        value={`${formatNumber(debt.annualCet * 100, { maximumFractionDigits: 2 })}% ${t("transaction.advanced.perYear")}`}
      />
    </dl>
  );
}

function DebtCard({ debt, paymentMethodLabel, onOpenSchedule, onAmortize }: DebtCardProps) {
  const { t } = useI18n();
  const progress = debt.installmentCount ? (debt.paidInstallments / debt.installmentCount) * 100 : 0;
  const kind = t(`debts.operation.${debt.operationType}`);

  return (
    <Card className={`border-border bg-card card-shadow ${debt.isSettled ? "opacity-70" : ""}`}>
      <CardContent className="space-y-4 px-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-lg font-semibold text-foreground">{debt.description}</h3>
          <span className="shrink-0 text-right text-xs text-muted-foreground">
            {paymentMethodLabel ? `${kind} · ${paymentMethodLabel}` : kind}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("debts.card.installments")
              .replace("{paid}", String(debt.paidInstallments))
              .replace("{total}", String(debt.installmentCount))}
          </p>
          <Progress value={progress} className="h-2" />
        </div>
        <DebtCardStats debt={debt} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenSchedule(debt)}>
            {t("debts.card.schedule")}
          </Button>
          {debt.isSettled ? null : (
            <Button size="sm" className="flex-1" onClick={() => onAmortize(debt)}>
              {t("debts.card.amortize")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DebtGrid({
  debts,
  paymentMethods,
  onOpenSchedule,
  onAmortize,
}: {
  readonly debts: DebtItem[];
  readonly paymentMethods: TransactionFormPaymentMethod[];
  readonly onOpenSchedule: (debt: DebtItem) => void;
  readonly onAmortize: (debt: DebtItem) => void;
}) {
  const { t } = useI18n();
  const labelOf = (id: string | null) => {
    const method = paymentMethods.find((pm) => pm.id === id);
    return method ? t(method.label) : null;
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {debts.map((debt) => (
        <DebtCard
          key={debt.planId}
          debt={debt}
          paymentMethodLabel={labelOf(debt.paymentMethodId)}
          onOpenSchedule={onOpenSchedule}
          onAmortize={onAmortize}
        />
      ))}
    </div>
  );
}

function SettledDebts(props: {
  readonly debts: DebtItem[];
  readonly paymentMethods: TransactionFormPaymentMethod[];
  readonly onOpenSchedule: (debt: DebtItem) => void;
  readonly onAmortize: (debt: DebtItem) => void;
}) {
  const { t } = useI18n();
  if (!props.debts.length) return null;

  return (
    <Collapsible className="mt-8">
      <CollapsibleTrigger className="group flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronDown className="size-4 transition-transform group-data-[state=closed]:-rotate-90" />
        {t("debts.settled").replace("{count}", String(props.debts.length))}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <DebtGrid {...props} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function DebtsEmptyState({ onCreate }: { readonly onCreate: () => void }) {
  const { t } = useI18n();

  return (
    <Empty className="border border-border bg-card card-shadow">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Landmark className="size-6" />
        </EmptyMedia>
        <EmptyTitle>{t("debts.emptyTitle")}</EmptyTitle>
        <EmptyDescription>{t("debts.emptyDescription")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <NewDebtButton onCreate={onCreate} />
      </EmptyContent>
    </Empty>
  );
}

function NewDebtButton({ onCreate }: { readonly onCreate: () => void }) {
  const { t } = useI18n();

  return (
    <Button className="gap-2" onClick={onCreate}>
      <Plus className="size-4" />
      {t("screen.debts.new")}
    </Button>
  );
}

function ScheduleDialog({ debt, onClose }: { readonly debt: DebtItem | null; readonly onClose: () => void }) {
  const { t } = useI18n();

  return (
    <Dialog open={debt !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-y-auto sm:h-[50vh] sm:w-[50vw] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{debt?.description}</DialogTitle>
          <DialogDescription>{t("debts.card.schedule")}</DialogDescription>
        </DialogHeader>
        {debt ? <FinancingBreakdown planId={debt.planId} /> : null}
      </DialogContent>
    </Dialog>
  );
}

export function DebtsScreen(props: DebtsScreenProps) {
  const { overview, paymentMethods } = props;
  const { t } = useI18n();
  const router = useRouter();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [scheduleDebt, setScheduleDebt] = useState<DebtItem | null>(null);
  const [amortizeDebt, setAmortizeDebt] = useState<DebtItem | null>(null);
  const openNew = () => setIsNewOpen(true);
  const hasDebts = overview.active.length + overview.settled.length > 0;

  return (
    <>
      <PageHeader
        title={t("screen.debts.title")}
        description={t("screen.debts.description")}
        actions={<NewDebtButton onCreate={openNew} />}
      />

      {hasDebts ? <DebtsSummaryCard totals={overview.totals} /> : null}
      {overview.active.length ? (
        <DebtGrid debts={overview.active} paymentMethods={paymentMethods} onOpenSchedule={setScheduleDebt} onAmortize={setAmortizeDebt} />
      ) : null}
      {hasDebts ? null : <DebtsEmptyState onCreate={openNew} />}
      <SettledDebts debts={overview.settled} paymentMethods={paymentMethods} onOpenSchedule={setScheduleDebt} onAmortize={setAmortizeDebt} />

      <ScheduleDialog debt={scheduleDebt} onClose={() => setScheduleDebt(null)} />
      <AmortizeDebtDialog
        debt={amortizeDebt}
        availableSavings={props.availableSavings}
        onClose={() => setAmortizeDebt(null)}
        onSubmit={async (data) => {
          await props.amortizeDebtAction(data);
          router.refresh();
        }}
      />
      <AddTransactionDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        categories={props.categories}
        paymentMethods={paymentMethods}
        createCategoryAction={props.createCategoryAction}
        createPaymentMethodAction={props.createPaymentMethodAction}
        initialAdvanced={WITH_INTEREST}
        onSubmit={async (data: TransactionFormData) => {
          await props.createTransactionAction(buildNewTransactionInput(data));
          router.refresh();
        }}
      />
    </>
  );
}
