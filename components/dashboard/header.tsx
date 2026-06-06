"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getCurrentMonthValue,
  withSelectedMonth,
} from "@/components/dashboard/month-route";
import { MonthWheelPicker } from "@/components/dashboard/month-wheel-picker";
import { useI18n } from "@/lib/i18n";
import {
  getGreetingPeriodFromHour,
  type GreetingPeriod,
} from "@/lib/time/greeting";

interface HeaderProps {
  initials?: string;
  userAvatarUrl?: string | null;
  userName?: string;
}

function isMonthValue(value: string | null) {
  return Boolean(value?.match(/^\d{4}-\d{2}$/));
}

function capitalizeFirstLetter(value: string) {
  return value
    ? `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}`
    : value;
}

function LocalTimeGreeting() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<GreetingPeriod | null>(null);

  useEffect(() => {
    setPeriod(getGreetingPeriodFromHour(new Date().getHours()));
  }, []);

  return (
    <span>
      {period
        ? t(`dashboard.greeting.${period}`)
        : t("dashboard.greeting.fallback")}
    </span>
  );
}

export function Header({
  initials = "JD",
  userAvatarUrl,
  userName = "John",
}: HeaderProps) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const selectedMonth = isMonthValue(monthParam)
    ? monthParam!
    : getCurrentMonthValue();

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);

  const [selYear, selMonthIdx] = selectedMonth.split("-").map(Number);
  const selectedMonthZeroBased = selMonthIdx - 1;

  const updateSelectedMonth = (month: number, year: number) => {
    const value = `${year}-${String(month + 1).padStart(2, "0")}`;
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("month", value);
    router.push(`${pathname}?${nextSearchParams.toString()}`);
  };

  const selectedMonthLabel = capitalizeFirstLetter(
    new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(new Date(selYear, selectedMonthZeroBased, 1)),
  );

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            <LocalTimeGreeting />, {userName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.headerDescription")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month picker trigger */}
          <div ref={pickerAnchorRef} className="relative">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold shadow-sm transition-colors hover:bg-muted"
            >
              {selectedMonthLabel}
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform"
                style={{ transform: pickerOpen ? "rotate(180deg)" : "none" }}
              />
            </button>
            {pickerOpen && (
              <MonthWheelPicker
                month={selectedMonthZeroBased}
                year={selYear}
                onChange={updateSelectedMonth}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>

          <ThemeToggle />
          <Link
            href={withSelectedMonth("/settings", searchParams)}
            prefetch
            onMouseEnter={() =>
              router.prefetch(withSelectedMonth("/settings", searchParams))
            }
            onFocus={() =>
              router.prefetch(withSelectedMonth("/settings", searchParams))
            }
          >
            <Avatar className="w-10 h-10 border-2 border-primary">
              {userAvatarUrl ? (
                <AvatarImage
                  src={userAvatarUrl}
                  alt={userName}
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <AvatarFallback className="bg-linear-to-br from-primary to-emerald-400 text-primary-foreground font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card">
            <Image
              src="/dragg-icon.svg"
              alt=""
              width={24}
              height={24}
              priority
              loading="eager"
              className="size-6"
              aria-hidden="true"
            />
          </div>
          <span className="text-lg font-bold text-foreground">Dragg</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Mobile month picker trigger */}
          <div className="relative">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold"
            >
              {selectedMonthLabel}
              <ChevronDown
                className="size-3.5 text-muted-foreground"
                style={{ transform: pickerOpen ? "rotate(180deg)" : "none" }}
              />
            </button>
            {pickerOpen && (
              <MonthWheelPicker
                month={selectedMonthZeroBased}
                year={selYear}
                onChange={updateSelectedMonth}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
          <Link
            href={withSelectedMonth("/settings", searchParams)}
            prefetch
            aria-label={t("nav.settings")}
          >
            <Avatar className="size-9 border-2 border-primary">
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
          </Link>
        </div>
      </div>
    </header>
  );
}
