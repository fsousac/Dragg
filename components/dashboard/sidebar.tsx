"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Folder,
  PieChart,
  CreditCard,
  BarChart3,
  Target,
  Settings,
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

function getActivePillRect(
  pathname: string,
  linkRefs: Map<string, HTMLAnchorElement | null>,
  ul: HTMLUListElement,
) {
  const activeLink = linkRefs.get(pathname);
  if (!activeLink) return null;

  const ulRect = ul.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  return { top: linkRect.top - ulRect.top, height: linkRect.height };
}

function activatePillTransition(pill: HTMLDivElement) {
  requestAnimationFrame(() => {
    pill.style.transition =
      "top 200ms ease-in-out, height 200ms ease-in-out, opacity 150ms ease-out";
  });
}

type SyncPillPositionParams = {
  pathname: string;
  linkRefs: Map<string, HTMLAnchorElement | null>;
  ul: HTMLUListElement;
  pill: HTMLDivElement;
  pillReady: boolean;
  setPillReady: (ready: boolean) => void;
};

function syncPillPosition({
  pathname,
  linkRefs,
  ul,
  pill,
  pillReady,
  setPillReady,
}: SyncPillPositionParams) {
  const rect = getActivePillRect(pathname, linkRefs, ul);
  if (!rect) {
    pill.style.opacity = "0";
    return;
  }

  if (!pillReady) {
    pill.style.transition = "none";
    pill.style.top = `${rect.top}px`;
    pill.style.height = `${rect.height}px`;
    pill.style.opacity = "1";
    setPillReady(true);
    activatePillTransition(pill);
    return;
  }

  pill.style.top = `${rect.top}px`;
  pill.style.height = `${rect.height}px`;
  pill.style.opacity = "1";
}

function SidebarLogo() {
  return (
    <div className="flex items-center gap-3 px-6 py-6">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card">
        <Image
          src="/dragg-icon.svg"
          alt=""
          width={28}
          height={28}
          priority
          loading="eager"
          className="size-7"
          aria-hidden="true"
        />
      </div>
      <span className="text-xl font-bold text-foreground">Dragg</span>
    </div>
  );
}

interface SidebarNavProps {
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
  readonly router: ReturnType<typeof useRouter>;
  readonly t: (key: string) => string;
  readonly ulRef: React.RefObject<HTMLUListElement | null>;
  readonly pillRef: React.RefObject<HTMLDivElement | null>;
  readonly linkRefs: React.RefObject<Map<string, HTMLAnchorElement | null>>;
}

function SidebarNav({
  pathname,
  searchParams,
  router,
  t,
  ulRef,
  pillRef,
  linkRefs,
}: SidebarNavProps) {
  return (
    <nav className="flex-1 px-4 py-4">
      <ul ref={ulRef} className="relative space-y-1">
        {/* Sliding pill background */}
        <div
          ref={pillRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 rounded-xl bg-primary"
          style={{ opacity: 0, top: 0, height: 0 }}
        />
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const href = withSelectedMonth(item.href, searchParams);
          return (
            <li key={item.nameKey}>
              <Link
                ref={(el) => {
                  linkRefs.current.set(item.href, el);
                }}
                href={href}
                prefetch
                onMouseEnter={() => router.prefetch(href)}
                onFocus={() => router.prefetch(href)}
                className={cn(
                  "relative z-10 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "text-card"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
  );
}

interface SidebarFooterProps {
  readonly searchParams: URLSearchParams;
  readonly router: ReturnType<typeof useRouter>;
  readonly userAvatarUrl?: string | null;
  readonly userName: string;
  readonly userEmail: string;
  readonly initials: string;
  readonly signOutAction: () => Promise<void>;
  readonly t: (key: string) => string;
}

function SidebarUserAvatar({
  userAvatarUrl,
  userName,
  initials,
}: Pick<SidebarFooterProps, "userAvatarUrl" | "userName" | "initials">) {
  return (
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
  );
}

function SidebarFooter({
  searchParams,
  router,
  userAvatarUrl,
  userName,
  userEmail,
  initials,
  signOutAction,
  t,
}: SidebarFooterProps) {
  const settingsHref = withSelectedMonth("/settings", searchParams);
  const prefetchSettings = () => router.prefetch(settingsHref);

  return (
    <div className="px-6 py-6 border-t border-border">
      <Link
        href={settingsHref}
        prefetch
        onMouseEnter={prefetchSettings}
        onFocus={prefetchSettings}
        className="flex items-center gap-3 rounded-xl transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <SidebarUserAvatar
          userAvatarUrl={userAvatarUrl}
          userName={userName}
          initials={initials}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {userName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
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
  );
}

interface SidebarProps {
  readonly initials: string;
  readonly signOutAction: () => Promise<void>;
  readonly userAvatarUrl?: string | null;
  readonly userEmail: string;
  readonly userName: string;
}

function useActivePillRefs(pathname: string) {
  const ulRef = useRef<HTMLUListElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement | null>>(new Map());
  const [pillReady, setPillReady] = useState(false);

  useLayoutEffect(() => {
    const ul = ulRef.current;
    const pill = pillRef.current;
    if (!ul || !pill) return;
    syncPillPosition({ pathname, linkRefs: linkRefs.current, ul, pill, pillReady, setPillReady });
  }, [pathname, pillReady]);

  return { ulRef, pillRef, linkRefs };
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
  const { ulRef, pillRef, linkRefs } = useActivePillRefs(pathname);

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0 card-shadow">
      <SidebarLogo />

      <SidebarNav
        pathname={pathname}
        searchParams={searchParams}
        router={router}
        t={t}
        ulRef={ulRef}
        pillRef={pillRef}
        linkRefs={linkRefs}
      />

      <SidebarFooter
        searchParams={searchParams}
        router={router}
        userAvatarUrl={userAvatarUrl}
        userName={userName}
        userEmail={userEmail}
        initials={initials}
        signOutAction={signOutAction}
        t={t}
      />
    </aside>
  );
}
