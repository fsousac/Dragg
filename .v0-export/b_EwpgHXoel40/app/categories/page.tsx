"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { categories, formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState("all")

  const filteredCategories = activeTab === "all" 
    ? categories 
    : categories.filter(c => c.group === activeTab)

  const groupColors: Record<string, string> = {
    needs: "bg-needs",
    wants: "bg-wants",
    savings: "bg-savings"
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
              <h2 className="text-2xl font-bold text-foreground">Categories</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Organize your spending with categories
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Category
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="needs">Needs</TabsTrigger>
              <TabsTrigger value="wants">Wants</TabsTrigger>
              <TabsTrigger value="savings">Savings</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => {
              const percentage = category.budget > 0 
                ? Math.round((category.spent / category.budget) * 100) 
                : 0
              const isOverBudget = percentage > 100
              
              return (
                <Card key={category.id} className="bg-card border-border card-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          {category.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{category.name}</h3>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs mt-1 text-white",
                              groupColors[category.group]
                            )}
                          >
                            {category.group}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {category.budget > 0 ? (
                      <>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Spent</span>
                          <span className={cn(
                            "font-medium",
                            isOverBudget ? "text-destructive" : "text-foreground"
                          )}>
                            {formatCurrency(category.spent)} / {formatCurrency(category.budget)}
                          </span>
                        </div>
                        <div 
                          className="h-2 rounded-full bg-secondary overflow-hidden"
                          style={{ 
                            ['--progress-foreground' as string]: isOverBudget ? 'var(--destructive)' : category.color 
                          }}
                        >
                          <Progress value={Math.min(percentage, 100)} className="h-2" />
                        </div>
                        <p className={cn(
                          "text-xs mt-2",
                          isOverBudget ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {isOverBudget 
                            ? `${percentage - 100}% over budget` 
                            : `${100 - percentage}% remaining`}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Income category - no budget set</p>
                    )}
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
