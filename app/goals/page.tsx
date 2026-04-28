"use client"

import { Plus, Calendar, Target, TrendingUp } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { goals, formatCurrency, formatDate } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function GoalsPage() {
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0)
  const totalCurrent = goals.reduce((acc, g) => acc + g.currentAmount, 0)
  const overallProgress = Math.round((totalCurrent / totalTarget) * 100)

  const getDaysRemaining = (deadline: string) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getMonthlyNeeded = (goal: typeof goals[0]) => {
    const remaining = goal.targetAmount - goal.currentAmount
    const daysRemaining = getDaysRemaining(goal.deadline)
    const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30))
    return remaining / monthsRemaining
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col pb-20 lg:pb-0">
        <Header />
        
        <main className="flex-1 px-4 lg:px-8 py-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Financial Goals</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Track progress towards your savings goals
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Goal
            </Button>
          </div>

          {/* Overview Card */}
          <Card className="bg-card border-border card-shadow mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Progress</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {formatCurrency(totalCurrent)} <span className="text-lg text-muted-foreground font-normal">/ {formatCurrency(totalTarget)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
                    <p className="text-sm text-muted-foreground">Complete</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{goals.length}</p>
                    <p className="text-sm text-muted-foreground">Active Goals</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Progress value={overallProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Goals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => {
              const percentage = Math.round((goal.currentAmount / goal.targetAmount) * 100)
              const daysRemaining = getDaysRemaining(goal.deadline)
              const monthlyNeeded = getMonthlyNeeded(goal)
              const isCloseToDeadline = daysRemaining < 90
              const isOnTrack = percentage >= (100 - (daysRemaining / 365 * 100))

              return (
                <Card key={goal.id} className="bg-card border-border card-shadow overflow-hidden">
                  <div 
                    className="h-2"
                    style={{ backgroundColor: goal.color }}
                  />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex items-center justify-center w-14 h-14 rounded-xl text-3xl"
                          style={{ backgroundColor: `${goal.color}20` }}
                        >
                          {goal.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                isOnTrack ? "bg-income/20 text-income" : "bg-yellow/20 text-yellow"
                              )}
                            >
                              {isOnTrack ? "On Track" : "Behind"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">{percentage}%</p>
                        <p className="text-xs text-muted-foreground">complete</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                        <div 
                          className="h-3 rounded-full bg-secondary overflow-hidden"
                          style={{ ['--progress-foreground' as string]: goal.color }}
                        >
                          <Progress value={percentage} className="h-3" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Deadline</p>
                            <p className={cn(
                              "text-sm font-medium",
                              isCloseToDeadline ? "text-yellow" : "text-foreground"
                            )}>
                              {daysRemaining > 0 ? `${daysRemaining} days left` : "Overdue"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly needed</p>
                            <p className="text-sm font-medium text-foreground">
                              {formatCurrency(monthlyNeeded)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" size="sm">
                          Edit Goal
                        </Button>
                        <Button className="flex-1" size="sm" style={{ backgroundColor: goal.color }}>
                          Add Funds
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </main>

        <MobileNav />
      </div>
    </div>
  )
}
