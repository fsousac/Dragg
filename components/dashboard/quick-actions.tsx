"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Minus,
  ArrowLeftRight,
  Target,
  PieChart,
  BarChart3
} from "lucide-react"

const actions = [
  {
    name: "Add Income",
    icon: Plus,
    color: "bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20"
  },
  {
    name: "Add Expense",
    icon: Minus,
    color: "bg-[#FB7185]/10 text-[#FB7185] hover:bg-[#FB7185]/20"
  },
  {
    name: "Transfer",
    icon: ArrowLeftRight,
    color: "bg-[#FACC15]/10 text-[#FACC15] hover:bg-[#FACC15]/20"
  },
  {
    name: "Add Goal",
    icon: Target,
    color: "bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20"
  },
  {
    name: "Create Budget",
    icon: PieChart,
    color: "bg-[#EC4899]/10 text-[#EC4899] hover:bg-[#EC4899]/20"
  },
  {
    name: "View Reports",
    icon: BarChart3,
    color: "bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316]/20"
  }
]

export function QuickActions() {
  return (
    <Card className="bg-card border-border card-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-semibold text-foreground">
          Quick Actions
        </CardTitle>
        <p className="text-xs lg:text-sm text-muted-foreground">
          Common tasks at your fingertips
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.name}
                variant="ghost"
                className={`flex flex-col items-center gap-2 h-auto py-4 lg:py-6 ${action.color} transition-all duration-200`}
              >
                <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                <span className="text-[10px] lg:text-xs font-medium text-center leading-tight">
                  {action.name}
                </span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
