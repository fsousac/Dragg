"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  BarChart3,
  MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"

const mobileNavItems = [
  { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Transactions", icon: ArrowLeftRight, href: "/transactions" },
  { name: "Budgets", icon: PieChart, href: "/budgets" },
  { name: "Reports", icon: BarChart3, href: "/reports" },
  { name: "More", icon: MoreHorizontal, href: "/more" }
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
