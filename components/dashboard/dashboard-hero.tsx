"use client";

import { TrendingUp, TrendingDown, PiggyBank, Plus } from "lucide-react";
import { type SummaryData } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DashboardHeroProps = {
  summaryData: SummaryData;
  onAdd?: () => void;
};

export function DashboardHero({ summaryData, onAdd }: DashboardHeroProps) {
  const { formatCurrency, t } = useI18n();
  const isHealthy = summaryData.currentBalance >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      {/* Hero card */}
      <div
        className="relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--hero-from) 0%, var(--hero-mid) 50%, var(--hero-to) 100%)",
          boxShadow: "var(--shadow-raised)",
        }}
      >
        {/* decorative glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full"
          style={{
            background:
              "radial-gradient(circle, var(--ribbon-a), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full"
          style={{
            background:
              "radial-gradient(circle, var(--ribbon-b), transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Balance */}
          <div>
            <p className="text-sm font-semibold text-white/80">
              {t("dashboard.summary.currentBalance")}
            </p>
            <p className="mt-1.5 text-4xl font-bold tracking-tight tabular-nums leading-none">
              {formatCurrency(summaryData.currentBalance)}
            </p>
            <span
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur-sm"
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  isHealthy ? "bg-white" : "bg-yellow-300",
                )}
              />
              {isHealthy
                ? t("dashboard.hero.healthyBalance")
                : t("dashboard.hero.tightBalance")}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-stretch gap-0 rounded-xl bg-white/10 backdrop-blur-sm">
            <HeroStat
              icon={TrendingUp}
              label={t("dashboard.summary.totalIncome")}
              value={formatCurrency(summaryData.totalIncome)}
            />
            <div className="w-px bg-white/20" />
            <HeroStat
              icon={TrendingDown}
              label={t("dashboard.summary.totalExpenses")}
              value={formatCurrency(summaryData.totalExpenses)}
            />
            <div className="w-px bg-white/20" />
            <HeroStat
              icon={PiggyBank}
              label={t("dashboard.summary.totalSaved")}
              value={formatCurrency(summaryData.totalSaved)}
            />
          </div>

          {/* CTA */}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-white py-3.5 text-[15px] font-bold shadow-lg transition-transform hover:-translate-y-px active:translate-y-0"
              style={{ color: "var(--hero-from)" }}
            >
              <Plus className="size-5" strokeWidth={2.4} />
              {t("dashboard.hero.addTransaction")}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards (right side) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
        {[
          {
            titleKey: "dashboard.summary.totalIncome",
            value: summaryData.totalIncome,
            icon: TrendingUp,
            trend: summaryData.trends.totalIncome,
            iconBgVar: "var(--color-positive-bg)",
            iconColorVar: "var(--color-positive)",
            valueColorVar: "var(--color-positive)",
          },
          {
            titleKey: "dashboard.summary.totalExpenses",
            value: summaryData.totalExpenses,
            icon: TrendingDown,
            trend: summaryData.trends.totalExpenses,
            noteKey: "dashboard.summary.predictedExpenses" as const,
            noteValue: summaryData.predictedExpenses,
            iconBgVar: "var(--color-negative-bg)",
            iconColorVar: "var(--color-negative)",
            valueColorVar: "var(--foreground)",
          },
          {
            titleKey: "dashboard.summary.totalSaved",
            value: summaryData.totalSaved,
            icon: PiggyBank,
            trend: summaryData.trends.totalSaved,
            iconBgVar: "var(--color-info-bg)",
            iconColorVar: "var(--color-info)",
            valueColorVar: "var(--foreground)",
          },
          {
            titleKey: "dashboard.summary.currentBalance",
            value: summaryData.currentBalance,
            icon: TrendingUp,
            iconBgVar:
              summaryData.currentBalance >= 0
                ? "var(--color-positive-bg)"
                : "var(--color-negative-bg)",
            iconColorVar:
              summaryData.currentBalance >= 0
                ? "var(--color-positive)"
                : "var(--color-negative)",
            valueColorVar:
              summaryData.currentBalance >= 0
                ? "var(--color-positive)"
                : "var(--color-negative)",
          },
        ].map((card) => {
          const Icon = card.icon;
          const formatTrend = (v: number) =>
            `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
          return (
            <div
              key={card.titleKey}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-card lg:p-5"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ background: card.iconBgVar }}
                >
                  <Icon className="size-5" style={{ color: card.iconColorVar }} />
                </div>
                {"trend" in card && typeof card.trend === "number" ? (
                  <span
                    className="rounded-full px-2 py-1 text-xs font-semibold"
                    style={{
                      background: card.iconBgVar,
                      color: card.iconColorVar,
                    }}
                  >
                    {formatTrend(card.trend)}
                  </span>
                ) : null}
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t(card.titleKey)}
                </p>
                <p
                  className="mt-1 text-xl font-bold tabular-nums lg:text-2xl"
                  style={{ color: card.valueColorVar }}
                >
                  {formatCurrency(card.value)}
                </p>
                {"noteKey" in card && card.noteKey ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t(card.noteKey)}: {formatCurrency(card.noteValue)}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-2.5 px-3 py-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-white/75">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-bold tabular-nums leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}
