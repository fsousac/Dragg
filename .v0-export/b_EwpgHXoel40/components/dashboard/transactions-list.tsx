"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { transactions } from "@/lib/data"
import { cn } from "@/lib/utils"

const groupColors = {
  needs: "bg-[#F97316]/10 text-[#F97316]",
  wants: "bg-[#EC4899]/10 text-[#EC4899]",
  savings: "bg-[#8B5CF6]/10 text-[#8B5CF6]"
}

const amountColors = {
  income: "text-[#22C55E]",
  expense: "text-[#FB7185]",
  saving: "text-[#8B5CF6]"
}

export function TransactionsList() {
  const latestTransactions = transactions.slice(0, 5)

  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
            Latest Transactions
          </CardTitle>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">
            Your recent activity
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          View All
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {latestTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-3 lg:py-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-accent text-xl lg:text-2xl">
                {transaction.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {transaction.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[10px] lg:text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                    groupColors[transaction.group]
                  )}>
                    {transaction.group}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}
                  </span>
                </div>
              </div>
              <p className={cn(
                "text-sm lg:text-base font-semibold tabular-nums",
                amountColors[transaction.type]
              )}>
                {transaction.amount > 0 ? "+" : ""}
                ${Math.abs(transaction.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
