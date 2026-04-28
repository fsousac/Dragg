"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Folder,
  PieChart,
  CreditCard,
  BarChart3,
  Target,
  Settings,
  Wallet,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigationItems = [
  { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Transactions", icon: ArrowLeftRight, href: "/transactions" },
  { name: "Categories", icon: Folder, href: "/categories" },
  { name: "Budgets", icon: PieChart, href: "/budgets" },
  { name: "Payments", icon: CreditCard, href: "/payments" },
  { name: "Reports", icon: BarChart3, href: "/reports" },
  { name: "Goals", icon: Target, href: "/goals" },
  { name: "Settings", icon: Settings, href: "/settings" }
]

interface SidebarProps {
  initials: string
  signOutAction: () => Promise<void>
  userEmail: string
  userName: string
}

export function Sidebar({
  initials,
  signOutAction,
  userEmail,
  userName,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0 card-shadow">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
          <Wallet className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">Dragg</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <form action={signOutAction} className="mt-4">
          <Button
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            size="sm"
            type="submit"
            variant="ghost"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </form>
      </div>
    </aside>
  )
}
