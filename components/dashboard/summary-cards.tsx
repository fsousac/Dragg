"use client";

import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type SummaryData } from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { Button } from "../ui/button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { NumberCounter } from "@/components/ui/number-counter";

const COLOR_POSITIVE = "#22C55E";
const COLOR_NEGATIVE = "#EF4444";
const COLOR_SAVINGS  = "#8B5CF6";

function cardColor(hex: string) {
  return { color: hex, bg: `${hex}1A` };
}

type SummaryCardsProps = {
  summaryData: SummaryData;
  onAddTransaction?: () => void;
};

export function SummaryCards({ summaryData, onAddTransaction }: SummaryCardsProps) {
  const { formatCurrency, t } = useI18n();
  const formatTrend = (value: number) =>
    `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

  const balancePalette = cardColor(
    summaryData.currentBalance < 0 ? COLOR_NEGATIVE : COLOR_POSITIVE,
  );

  const cards = [
    {
      titleKey: "dashboard.summary.totalIncome",
      value: summaryData.totalIncome,
      icon: TrendingUp,
      trend: summaryData.trends.totalIncome,
      ...cardColor(COLOR_POSITIVE),
    },
    {
      titleKey: "dashboard.summary.totalExpenses",
      value: summaryData.totalExpenses,
      icon: TrendingDown,
      trend: summaryData.trends.totalExpenses,
      noteKey: "dashboard.summary.predictedExpenses",
      noteValue: summaryData.predictedExpenses,
      ...cardColor(COLOR_NEGATIVE),
    },
    {
      titleKey: "dashboard.summary.totalSaved",
      value: summaryData.totalSaved,
      icon: PiggyBank,
      trend: summaryData.trends.totalSaved,
      ...cardColor(COLOR_SAVINGS),
    },
    {
      titleKey: "dashboard.summary.currentBalance",
      value: summaryData.currentBalance,
      icon: Wallet,
      ...balancePalette,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <AnimatedCard key={card.titleKey} index={index} className="h-full">
              <Card className="bg-card border-border overflow-hidden card-shadow h-full">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start justify-between">
                    <div
                      className="p-2 lg:p-3 rounded-xl"
                      style={{ background: card.bg }}
                    >
                      <Icon
                        className="w-4 h-4 lg:w-5 lg:h-5"
                        style={{ color: card.color }}
                      />
                    </div>
                    {"trend" in card && typeof card.trend === "number" ? (
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          background: card.bg,
                          color: card.color,
                        }}
                      >
                        {formatTrend(card.trend)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-xs lg:text-sm text-muted-foreground">
                      {t(card.titleKey)}
                    </p>
                    <p
                      className="text-xl lg:text-2xl font-bold mt-1"
                      style={{ color: card.color }}
                    >
                      <NumberCounter
                        value={card.value}
                        duration={800}
                        format={formatCurrency}
                        className="text-xl lg:text-2xl font-bold"
                      />
                    </p>
                    {"noteKey" in card && card.noteKey ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t(card.noteKey)}: {formatCurrency(card.noteValue)}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          );
        })}
      </div>
      <div className="flex flex-col items-center my-3 lg:my-4">
        <Button
          className="gap-2 w-[90%] h-10 text-background"
          onClick={onAddTransaction}
        >
          <Plus className="size-4" />
          {t("screen.transactions.add")}
        </Button>
      </div>
    </>
  );
}
