"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { withSelectedMonth } from "@/components/dashboard/month-route";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navigationItems = [
  { nameKey: "nav.overview", icon: LayoutDashboard, href: "/dashboard" },
  { nameKey: "nav.transactions", icon: ArrowLeftRight, href: "/transactions" },
  { nameKey: "nav.categories", icon: Folder, href: "/categories" },
  { nameKey: "nav.budgets", icon: PieChart, href: "/budgets" },
  { nameKey: "nav.payments", icon: CreditCard, href: "/payments" },
  { nameKey: "nav.reports", icon: BarChart3, href: "/reports" },
  { nameKey: "nav.goals", icon: Target, href: "/goals" },
  { nameKey: "nav.settings", icon: Settings, href: "/settings" },
];

interface SidebarProps {
  initials: string;
  signOutAction: () => Promise<void>;
  userAvatarUrl?: string | null;
  userEmail: string;
  userName: string;
}

export function Sidebar({
  initials,
  signOutAction,
  userAvatarUrl,
  userEmail,
  userName,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

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
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const href = withSelectedMonth(item.href, searchParams);
            return (
              <li key={item.nameKey}>
                <Link
                  href={href}
                  prefetch
                  onMouseEnter={() => router.prefetch(href)}
                  onFocus={() => router.prefetch(href)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {t(item.nameKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-6 border-t border-border">
        <Link
          href={withSelectedMonth("/settings", searchParams)}
          prefetch
          onMouseEnter={() =>
            router.prefetch(withSelectedMonth("/settings", searchParams))
          }
          onFocus={() =>
            router.prefetch(withSelectedMonth("/settings", searchParams))
          }
          className="flex items-center gap-3 rounded-xl transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Avatar className="size-8">
            {userAvatarUrl ? (
              <AvatarImage
                src={userAvatarUrl}
                alt={userName}
                referrerPolicy="no-referrer"
              />
            ) : null}
            <AvatarFallback className="bg-linear-to-br from-primary to-emerald-400 text-xs font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {userName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {userEmail}
            </p>
          </div>
        </Link>
        <form action={signOutAction} className="mt-4 cursor-pointer">
          <Button
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            size="sm"
            type="submit"
            variant="ghost"
          >
            <LogOut className="w-4 h-4" />
            {t("user.logout")}
          </Button>
        </form>
      </div>
    </aside>
  );
}
