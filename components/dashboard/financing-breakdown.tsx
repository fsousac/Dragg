"use client";

import { useEffect, useState } from "react";

import { getFinancingBreakdownAction } from "@/app/transactions/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FinancingBreakdown as Breakdown } from "@/lib/finance/financing";
import { useI18n } from "@/lib/i18n";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; breakdown: Breakdown | null };

function useFinancingBreakdown(planId: string) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getFinancingBreakdownAction(planId)
      .then((breakdown) => active && setState({ status: "ready", breakdown }))
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, [planId]);

  return state;
}

function SummaryCards({ breakdown }: { readonly breakdown: Breakdown }) {
  const { t, formatCurrency, formatNumber } = useI18n();
  const { plan, monthlyRate, cet, totals, outstanding } = breakdown;
  const percent = (rate: number) => `${formatNumber(rate * 100)}%`;
  const perMonth = t("transaction.advanced.perMonth");
  const perYear = t("transaction.advanced.perYear");
  const enteredRate = `${formatNumber(plan.rate)}% ${plan.ratePeriod === "annual" ? perYear : perMonth}`;
  const cards: [string, string][] = [
    [t("financing.principal"), formatCurrency(totals.principal)],
    [t("transaction.advanced.downPayment"), formatCurrency(totals.downPayment)],
    [t("transaction.advanced.fees"), formatCurrency(totals.fees)],
    [t("transaction.advanced.totalInterest"), formatCurrency(totals.interest)],
    [t("transaction.advanced.totalPayable"), formatCurrency(totals.payable)],
    [t("financing.outstanding"), formatCurrency(outstanding.total)],
    [t("financing.fromSavings"), formatCurrency(totals.savingsFunded)],
    [t("financing.rate"), enteredRate],
    [
      t("transaction.advanced.cet"),
      `${percent(cet.monthly)} ${perMonth} · ${percent(cet.annual)} ${perYear}`,
    ],
  ];

  if (plan.ratePeriod === "annual") {
    cards.push([
      t("financing.equivalentMonthly"),
      `${percent(monthlyRate)} ${perMonth}`,
    ]);
  }

  return (
    <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-border/40 p-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const SCHEDULE_COLUMNS = [
  "number",
  "date",
  "payment",
  "principal",
  "interest",
  "savings",
  "balance",
] as const;

type Row = Breakdown["rows"][number];

function useRowLabel() {
  const { t } = useI18n();
  return (row: Row) => {
    const base =
      row.number ??
      t(
        row.isAmortization
          ? "financing.table.amortized"
          : "financing.table.downPayment",
      );
    return row.isPaid ? `${base} · ${t("financing.paid")}` : String(base);
  };
}

function ScheduleTable({ rows }: { readonly rows: Row[] }) {
  const { t, formatCurrency, formatDate } = useI18n();
  const rowLabel = useRowLabel();

  return (
    <div className="max-h-72 max-w-full overflow-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            {SCHEDULE_COLUMNS.map((column) => (
              <TableHead key={column}>
                {t(`financing.table.${column}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={row.isPaid ? "text-muted-foreground" : undefined}
            >
              <TableCell>{rowLabel(row)}</TableCell>
              <TableCell>{formatDate(row.date)}</TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(row.payment)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(row.principal)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(row.interest)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(row.savingsFunded)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(row.balanceAfter)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function FinancingBreakdown({ planId }: { readonly planId: string }) {
  const { t } = useI18n();
  const state = useFinancingBreakdown(planId);

  if (state.status === "loading") {
    return (
      <p className="text-xs text-muted-foreground">{t("financing.loading")}</p>
    );
  }
  if (state.status === "error") {
    return <p className="text-xs text-destructive">{t("financing.error")}</p>;
  }
  if (!state.breakdown) return null;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className="text-sm font-semibold">{t("financing.title")}</h3>
      <SummaryCards breakdown={state.breakdown} />
      <ScheduleTable rows={state.breakdown.rows} />
    </section>
  );
}
