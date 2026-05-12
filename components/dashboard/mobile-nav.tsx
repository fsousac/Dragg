"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  Folder,
  LayoutDashboard,
  MoreHorizontal,
  PieChart,
  Settings,
  Target,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { withSelectedMonth } from "@/components/dashboard/month-route";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { nameKey: "nav.overview", icon: LayoutDashboard, href: "/dashboard" },
  { nameKey: "nav.transactions", icon: ArrowLeftRight, href: "/transactions" },
  { nameKey: "nav.budgets", icon: PieChart, href: "/budgets" },
  { nameKey: "nav.payments", icon: CreditCard, href: "/payments" },
];

const moreNavItems = [
  { nameKey: "nav.categories", icon: Folder, href: "/categories" },
  { nameKey: "nav.goals", icon: Target, href: "/goals" },
  { nameKey: "nav.reports", icon: BarChart3, href: "/reports" },
  { nameKey: "nav.settings", icon: Settings, href: "/settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="grid grid-cols-5 items-stretch px-2 py-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const href = withSelectedMonth(item.href, searchParams)
          return (
            <Link
              key={item.nameKey}
              href={href}
              prefetch
              onTouchStart={() => router.prefetch(href)}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon
                className={cn("h-5 w-5 shrink-0", isActive && "text-primary")}
              />
              <span className="block w-full whitespace-normal text-center text-[10px] font-medium leading-tight">
                {t(item.nameKey)}
              </span>
            </Link>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-all duration-200",
                moreNavItems.some((item) => item.href === pathname)
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
              aria-label={t("nav.more")}
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span className="block w-full whitespace-normal text-center text-[10px] font-medium leading-tight">
                {t("nav.more")}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="mb-2 w-56 rounded-xl border-border bg-popover p-2 shadow-xl"
            side="top"
            sideOffset={10}
          >
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const href = withSelectedMonth(item.href, searchParams);

              return (
                <DropdownMenuItem key={item.nameKey} asChild>
                  <Link
                    href={href}
                    prefetch
                    onTouchStart={() => router.prefetch(href)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      isActive && "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.nameKey)}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
