"use client"

import { Plus, Calendar, MoreVertical, Pause, Play, Trash2 } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { payments, formatCurrency, formatDate } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function PaymentsPage() {
  const activePayments = payments.filter(p => p.status === "active")
  const pausedPayments = payments.filter(p => p.status === "paused")
  
  const monthlyTotal = activePayments
    .filter(p => p.frequency === "monthly")
    .reduce((acc, p) => acc + p.amount, 0)
  
  const yearlyTotal = activePayments
    .filter(p => p.frequency === "yearly")
    .reduce((acc, p) => acc + p.amount, 0)

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "monthly": return "Monthly"
      case "yearly": return "Yearly"
      case "weekly": return "Weekly"
      default: return frequency
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-income text-white"
      case "paused": return "bg-yellow text-black"
      case "cancelled": return "bg-destructive text-white"
      default: return "bg-secondary"
    }
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
              <h2 className="text-2xl font-bold text-foreground">Payments & Subscriptions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your recurring payments
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Subscription
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Monthly Subscriptions</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(monthlyTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activePayments.filter(p => p.frequency === "monthly").length} active
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Yearly Subscriptions</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(yearlyTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(yearlyTotal / 12)}/month avg
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-shadow">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Annual Cost</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency((monthlyTotal * 12) + yearlyTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All subscriptions combined
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Subscriptions */}
          <Card className="bg-card border-border card-shadow mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {activePayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-2xl">
                      {payment.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{payment.name}</p>
                        <Badge variant="secondary" className={cn("text-xs", getStatusColor(payment.status))}>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{payment.category}</span>
                        <span>•</span>
                        <span>{getFrequencyLabel(payment.frequency)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        Next: {formatDate(payment.nextDate)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Paused Subscriptions */}
          {pausedPayments.length > 0 && (
            <Card className="bg-card border-border card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Paused Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {pausedPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center gap-4 p-4 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-2xl">
                        {payment.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{payment.name}</p>
                          <Badge variant="secondary" className={cn("text-xs", getStatusColor(payment.status))}>
                            {payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{payment.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getFrequencyLabel(payment.frequency)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Play className="w-3 h-3" />
                        Resume
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>

        <MobileNav />
      </div>
    </div>
  )
}
