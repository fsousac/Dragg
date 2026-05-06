"use client"

import { TrendingUp, TrendingDown, PiggyBank, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { type SummaryData } from "@/lib/finance/transactions"
import { useI18n } from "@/lib/i18n"

type SummaryCardsProps = {
  summaryData: SummaryData
}

export function SummaryCards({ summaryData }: SummaryCardsProps) {
  const { formatCurrency, t } = useI18n()
  const cards = [
    {
      titleKey: "dashboard.summary.totalIncome",
      value: summaryData.totalIncome,
      icon: TrendingUp,
      trend: "+0.0%",
      trendUp: true,
      colorClass: "text-[#22C55E]",
      bgClass: "bg-[#22C55E]/10",
      iconBgClass: "bg-[#22C55E]/20"
    },
    {
      titleKey: "dashboard.summary.totalExpenses",
      value: summaryData.totalExpenses,
      icon: TrendingDown,
      trend: "+0.0%",
      noteKey: "dashboard.summary.predictedExpenses",
      noteValue: summaryData.predictedExpenses,
      trendUp: false,
      colorClass: "text-[#FB7185]",
      bgClass: "bg-[#FB7185]/10",
      iconBgClass: "bg-[#FB7185]/20"
    },
    {
      titleKey: "dashboard.summary.totalSaved",
      value: summaryData.totalSaved,
      icon: PiggyBank,
      trend: "+0.0%",
      trendUp: true,
      colorClass: "text-[#8B5CF6]",
      bgClass: "bg-[#8B5CF6]/10",
      iconBgClass: "bg-[#8B5CF6]/20"
    },
    {
      titleKey: "dashboard.summary.currentBalance",
      value: summaryData.currentBalance,
      icon: Wallet,
      trend: "+0.0%",
      trendUp: true,
      colorClass: "text-[#22C55E]",
      bgClass: "bg-[#22C55E]/10",
      iconBgClass: "bg-[#22C55E]/20"
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.titleKey} className="bg-card border-border overflow-hidden card-shadow">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div className={`p-2 lg:p-3 rounded-xl ${card.iconBgClass}`}>
                  <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${card.colorClass}`} />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.bgClass} ${card.colorClass}`}>
                  {card.trend}
                </span>
              </div>
              <div className="mt-3 lg:mt-4">
                <p className="text-xs lg:text-sm text-muted-foreground">{t(card.titleKey)}</p>
                <p className={`text-xl lg:text-2xl font-bold mt-1 ${card.colorClass}`}>
                  {formatCurrency(card.value)}
                </p>
                {"noteKey" in card && card.noteKey ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t(card.noteKey)}: {formatCurrency(card.noteValue)}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
