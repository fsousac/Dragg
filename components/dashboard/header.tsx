"use client";

import { Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n";

interface HeaderProps {
  greeting?: string;
  initials?: string;
  userAvatarUrl?: string | null;
  userName?: string;
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isMonthValue(value: string | null) {
  return Boolean(value?.match(/^\d{4}-\d{2}$/));
}

function getMonthOptions(selectedMonth: string) {
  const [selectedYear, selectedMonthIndex] = selectedMonth
    .split("-")
    .map(Number);
  const selectedDate = new Date(selectedYear, selectedMonthIndex - 1, 1);
  const currentDate = new Date();
  const baseDate = Number.isNaN(selectedDate.getTime())
    ? currentDate
    : selectedDate;

  return Array.from({ length: 18 }, (_, index) => {
    const date = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() - 12 + index,
      1,
    );
    return {
      date,
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    };
  });
}

function capitalizeFirstLetter(value: string) {
  return value ? `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}` : value;
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
  const monthOptions = getMonthOptions(selectedMonth);

  const updateSelectedMonth = (value: string) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("month", value);
    router.push(`${pathname}?${nextSearchParams.toString()}`);
  };

  const selectedMonthLabel = (value: string) => {
    const option = monthOptions.find((month) => month.value === value);
    const label = option
      ? new Intl.DateTimeFormat(locale, {
          month: "long",
          year: "numeric",
        }).format(option.date)
      : t("common.selectMonth");

    return capitalizeFirstLetter(label);
  };

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
          <Select value={selectedMonth} onValueChange={updateSelectedMonth}>
            <SelectTrigger className="w-44 bg-card border-border card-shadow">
              <SelectValue placeholder={t("common.selectMonth")} />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {capitalizeFirstLetter(
                    new Intl.DateTimeFormat(locale, {
                      month: "long",
                      year: "numeric",
                    }).format(month.date),
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ThemeToggle />
          <Avatar className="w-10 h-10 border-2 border-primary">
            {userAvatarUrl ? (
              <AvatarImage src={userAvatarUrl} alt={userName} />
            ) : null}
            <AvatarFallback className="bg-linear-to-br from-primary to-emerald-400 text-primary-foreground font-bold">
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
          <Select value={selectedMonth} onValueChange={updateSelectedMonth}>
            <SelectTrigger className="h-9 w-36 bg-card text-xs">
              <SelectValue placeholder={t("common.selectMonth")}>
                {selectedMonthLabel(selectedMonth)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {capitalizeFirstLetter(
                    new Intl.DateTimeFormat(locale, {
                      month: "long",
                      year: "numeric",
                    }).format(month.date),
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Avatar className="size-9 border-2 border-primary">
            {userAvatarUrl ? (
              <AvatarImage src={userAvatarUrl} alt={userName} />
            ) : null}
            <AvatarFallback className="bg-linear-to-br from-primary to-emerald-400 text-xs font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
