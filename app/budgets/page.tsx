"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { budgetData, budgetSplitData, categories, formatCurrency } from "@/lib/data"
import { Settings, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BudgetsPage() {
  const totalBudget = budgetData.needs.budget + budgetData.wants.budget + budgetData.savings.budget
  const totalSpent = budgetData.needs.spent + budgetData.wants.spent + budgetData.savings.spent
  const remaining = totalBudget - totalSpent

  const budgetGroups = [
    { 
      name: "Needs", 
      key: "needs" as const,
      description: "Essential expenses like rent, groceries, utilities",
      icon: "🏠",
      color: "var(--needs)",
      ...budgetData.needs 
    },
    { 
      name: "Wants", 
      key: "wants" as const,
      description: "Non-essential spending like entertainment, dining",
      icon: "🎉",
      color: "var(--wants)",
      ...budgetData.wants 
    },
    { 
      name: "Savings", 
      key: "savings" as const,
      description: "Investments and emergency fund contributions",
      icon: "💰",
      color: "var(--savings)",
      ...budgetData.savings 
    }
  ]

  const categoryBudgets = categories.filter(c => c.budget > 0)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col pb-20 lg:pb-0">
        <Header />
        
        <main className="flex-1 px-4 lg:px-8 py-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Budgets</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Track your 50/30/20 budget allocation
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Configure Budget
            </Button>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(totalBudget)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Monthly allocation</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(totalSpent)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((totalSpent / totalBudget) * 100)}% of budget
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  remaining >= 0 ? "text-income" : "text-destructive"
                )}>
                  {formatCurrency(remaining)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Left to spend</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 50/30/20 Chart */}
            <Card className="bg-card border-border card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">50/30/20 Rule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={budgetSplitData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {budgetSplitData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, "Allocation"]}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Budget Groups */}
            <Card className="bg-card border-border card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Budget Groups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {budgetGroups.map((group) => {
                  const percentage = Math.round((group.spent / group.budget) * 100)
                  const isOver = percentage > 100
                  const trend = percentage > 80 ? "over" : percentage > 50 ? "normal" : "under"
                  
                  return (
                    <div key={group.key}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{group.icon}</span>
                          <div>
                            <p className="font-medium text-foreground">{group.name}</p>
                            <p className="text-xs text-muted-foreground">{group.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {formatCurrency(group.spent)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            of {formatCurrency(group.budget)}
                          </p>
                        </div>
                      </div>
                      <div 
                        className="h-3 rounded-full bg-secondary overflow-hidden"
                        style={{ ['--progress-foreground' as string]: group.color }}
                      >
                        <Progress value={Math.min(percentage, 100)} className="h-3" />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={cn(
                          "text-xs flex items-center gap-1",
                          isOver ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {trend === "over" && <TrendingUp className="w-3 h-3" />}
                          {trend === "under" && <TrendingDown className="w-3 h-3" />}
                          {trend === "normal" && <Minus className="w-3 h-3" />}
                          {percentage}% used
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(group.budget - group.spent)} left
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Category Budgets */}
          <Card className="bg-card border-border card-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Category Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryBudgets.map((cat) => {
                  const percentage = Math.round((cat.spent / cat.budget) * 100)
                  return (
                    <div key={cat.id} className="p-4 rounded-xl bg-accent/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span className="font-medium text-foreground">{cat.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(cat.spent)} / {formatCurrency(cat.budget)}
                        </span>
                      </div>
                      <div 
                        className="h-2 rounded-full bg-secondary overflow-hidden"
                        style={{ ['--progress-foreground' as string]: cat.color }}
                      >
                        <Progress value={Math.min(percentage, 100)} className="h-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </main>

        <MobileNav />
      </div>
    </div>
  )
}
