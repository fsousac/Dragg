"use client"

import { ChevronDown, Wallet } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"
import { months } from "@/lib/data"

interface HeaderProps {
  greeting?: string
  initials?: string
  userName?: string
}

export function Header({
  greeting = "Good evening",
  initials = "JD",
  userName = "John",
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {userName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {"Here's"} what&apos;s happening with your finances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="January 2024">
            <SelectTrigger className="w-44 bg-card border-border card-shadow">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ThemeToggle />
          <Avatar className="w-10 h-10 border-2 border-primary">
            <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-400 text-primary-foreground font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
            <Wallet className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Dragg</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" className="gap-1 text-sm">
            Jan 2024
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
