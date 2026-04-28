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
import { useI18n } from "@/lib/i18n"
import { months } from "@/lib/data"

interface HeaderProps {
  greeting?: string
  initials?: string
  userName?: string
}

export function Header({
  initials = "JD",
  userName = "John",
}: HeaderProps) {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("dashboard.greeting")}, {userName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.headerDescription")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="2024-01">
            <SelectTrigger className="w-44 bg-card border-border card-shadow">
              <SelectValue placeholder={t("common.selectMonth")} />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {t(month.key)}
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
            {t("data.month.jan")} 2024
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
