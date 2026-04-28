"use client"

import { TrendingUp, TrendingDown, PiggyBank, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { summaryData } from "@/lib/data"
import { useI18n } from "@/lib/i18n"

const cards = [
  {
    titleKey: "dashboard.summary.totalIncome",
    value: summaryData.totalIncome,
    icon: TrendingUp,
    trend: "+12.5%",
    trendUp: true,
    colorClass: "text-[#22C55E]",
    bgClass: "bg-[#22C55E]/10",
    iconBgClass: "bg-[#22C55E]/20"
  },
  {
    titleKey: "dashboard.summary.totalExpenses",
    value: summaryData.totalExpenses,
    icon: TrendingDown,
    trend: "-8.2%",
    trendUp: false,
    colorClass: "text-[#FB7185]",
    bgClass: "bg-[#FB7185]/10",
    iconBgClass: "bg-[#FB7185]/20"
  },
  {
    titleKey: "dashboard.summary.totalSaved",
    value: summaryData.totalSaved,
    icon: PiggyBank,
    trend: "+24.3%",
    trendUp: true,
    colorClass: "text-[#8B5CF6]",
    bgClass: "bg-[#8B5CF6]/10",
    iconBgClass: "bg-[#8B5CF6]/20"
  },
  {
    titleKey: "dashboard.summary.currentBalance",
    value: summaryData.currentBalance,
    icon: Wallet,
    trend: "+5.1%",
    trendUp: true,
    colorClass: "text-[#22C55E]",
    bgClass: "bg-[#22C55E]/10",
    iconBgClass: "bg-[#22C55E]/20"
  }
]

export function SummaryCards() {
  const { formatCurrency, t } = useI18n()

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
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
