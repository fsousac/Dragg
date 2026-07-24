"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
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

interface MonthPickerState {
  readonly pickerOpen: boolean;
  readonly setPickerOpen: Dispatch<SetStateAction<boolean>>;
  readonly selectedMonthLabel: string;
  readonly selectedMonthZeroBased: number;
  readonly selYear: number;
  readonly updateSelectedMonth: (month: number, year: number) => void;
}

interface MonthPickerTriggerProps extends MonthPickerState {
  readonly anchorRef: RefObject<HTMLDivElement | null>;
  readonly buttonClassName: string;
  readonly iconClassName: string;
}

function MonthPickerTrigger({
  pickerOpen,
  setPickerOpen,
  selectedMonthLabel,
  selectedMonthZeroBased,
  selYear,
  updateSelectedMonth,
  anchorRef,
  buttonClassName,
  iconClassName,
}: MonthPickerTriggerProps) {
  return (
    <div ref={anchorRef} className="relative">
      <button
        onClick={() => setPickerOpen((v) => !v)}
        className={buttonClassName}
      >
        {selectedMonthLabel}
        <ChevronDown
          className={iconClassName}
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
  );
}

function HeaderAvatar({
  userAvatarUrl,
  userName,
  initials,
  avatarClassName,
  fallbackClassName,
}: {
  userAvatarUrl?: string | null;
  userName: string;
  initials: string;
  avatarClassName: string;
  fallbackClassName: string;
}) {
  return (
    <Avatar className={avatarClassName}>
      {userAvatarUrl ? (
        <AvatarImage
          src={userAvatarUrl}
          alt={userName}
          referrerPolicy="no-referrer"
        />
      ) : null}
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}

interface DesktopHeaderProps extends MonthPickerState {
  readonly userName: string;
  readonly t: (key: string) => string;
  readonly pickerAnchorRef: RefObject<HTMLDivElement | null>;
  readonly userAvatarUrl?: string | null;
  readonly initials: string;
  readonly settingsHref: string;
  readonly prefetchSettings: () => void;
}

function DesktopGreeting({
  userName,
  t,
}: {
  readonly userName: string;
  readonly t: (key: string) => string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">
        <LocalTimeGreeting />, {userName} 👋
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{t("dashboard.headerDescription")}</p>
    </div>
  );
}

function DesktopSettingsAvatarLink({
  settingsHref,
  prefetchSettings,
  userAvatarUrl,
  userName,
  initials,
}: {
  readonly settingsHref: string;
  readonly prefetchSettings: () => void;
  readonly userAvatarUrl?: string | null;
  readonly userName: string;
  readonly initials: string;
}) {
  return (
    <Link href={settingsHref} prefetch onMouseEnter={prefetchSettings} onFocus={prefetchSettings}>
      <HeaderAvatar
        userAvatarUrl={userAvatarUrl}
        userName={userName}
        initials={initials}
        avatarClassName="w-10 h-10 border-2 border-primary"
        fallbackClassName="bg-linear-to-br from-primary to-emerald-400 text-primary-foreground font-bold"
      />
    </Link>
  );
}

function DesktopHeader({
  userName,
  t,
  pickerOpen,
  setPickerOpen,
  pickerAnchorRef,
  selectedMonthLabel,
  selectedMonthZeroBased,
  selYear,
  updateSelectedMonth,
  userAvatarUrl,
  initials,
  settingsHref,
  prefetchSettings,
}: DesktopHeaderProps) {
  return (
    <div className="hidden lg:flex items-center justify-between px-8 py-4">
      <DesktopGreeting userName={userName} t={t} />
      <div className="flex items-center gap-3">
        <MonthPickerTrigger
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
          selectedMonthLabel={selectedMonthLabel}
          selectedMonthZeroBased={selectedMonthZeroBased}
          selYear={selYear}
          updateSelectedMonth={updateSelectedMonth}
          anchorRef={pickerAnchorRef}
          buttonClassName="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold shadow-sm transition-colors hover:bg-muted"
          iconClassName="size-4 text-muted-foreground transition-transform"
        />

        <ThemeToggle />
        <DesktopSettingsAvatarLink
          settingsHref={settingsHref}
          prefetchSettings={prefetchSettings}
          userAvatarUrl={userAvatarUrl}
          userName={userName}
          initials={initials}
        />
      </div>
    </div>
  );
}

interface MobileHeaderProps extends MonthPickerState {
  readonly t: (key: string) => string;
  readonly userName: string;
  readonly userAvatarUrl?: string | null;
  readonly initials: string;
  readonly mobilePickerAnchorRef: RefObject<HTMLDivElement | null>;
  readonly settingsHref: string;
}

function DraggLogo() {
  return (
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
  );
}

function MobileHeader({
  t,
  userName,
  userAvatarUrl,
  initials,
  pickerOpen,
  setPickerOpen,
  mobilePickerAnchorRef,
  selectedMonthLabel,
  selectedMonthZeroBased,
  selYear,
  updateSelectedMonth,
  settingsHref,
}: MobileHeaderProps) {
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3">
      <DraggLogo />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <MonthPickerTrigger
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
          selectedMonthLabel={selectedMonthLabel}
          selectedMonthZeroBased={selectedMonthZeroBased}
          selYear={selYear}
          updateSelectedMonth={updateSelectedMonth}
          anchorRef={mobilePickerAnchorRef}
          buttonClassName="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold"
          iconClassName="size-3.5 text-muted-foreground"
        />
        <Link href={settingsHref} prefetch aria-label={t("nav.settings")}>
          <HeaderAvatar
            userAvatarUrl={userAvatarUrl}
            userName={userName}
            initials={initials}
            avatarClassName="size-9 border-2 border-primary"
            fallbackClassName="bg-linear-to-br from-primary to-emerald-400 text-xs font-bold text-primary-foreground"
          />
        </Link>
      </div>
    </div>
  );
}

function useMonthPickerOutsideClick({
  pickerOpen,
  setPickerOpen,
  pickerAnchorRef,
  mobilePickerAnchorRef,
}: {
  pickerOpen: boolean;
  setPickerOpen: Dispatch<SetStateAction<boolean>>;
  pickerAnchorRef: RefObject<HTMLDivElement | null>;
  mobilePickerAnchorRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!pickerOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        pickerAnchorRef.current?.contains(target) ||
        mobilePickerAnchorRef.current?.contains(target)
      ) {
        return;
      }
      setPickerOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);
}

function useSelectedMonthNavigation({
  searchParams,
  pathname,
  router,
  locale,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
  pathname: string;
  router: ReturnType<typeof useRouter>;
  locale: string;
}) {
  const monthParam = searchParams.get("month");
  const selectedMonth = isMonthValue(monthParam) ? monthParam! : getCurrentMonthValue();
  const [selYear, selMonthIdx] = selectedMonth.split("-").map(Number);
  const selectedMonthZeroBased = selMonthIdx - 1;

  const updateSelectedMonth = (month: number, year: number) => {
    const value = `${year}-${String(month + 1).padStart(2, "0")}`;
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("month", value);
    router.push(`${pathname}?${nextSearchParams.toString()}`);
  };

  const selectedMonthLabel = capitalizeFirstLetter(
    new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
      new Date(selYear, selectedMonthZeroBased, 1),
    ),
  );

  return { selYear, selectedMonthZeroBased, selectedMonthLabel, updateSelectedMonth };
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

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);
  const mobilePickerAnchorRef = useRef<HTMLDivElement>(null);
  useMonthPickerOutsideClick({ pickerOpen, setPickerOpen, pickerAnchorRef, mobilePickerAnchorRef });

  const monthPicker = { pickerOpen, setPickerOpen, ...useSelectedMonthNavigation({ searchParams, pathname, router, locale }) };

  const settingsHref = withSelectedMonth("/settings", searchParams);
  const prefetchSettings = () => router.prefetch(settingsHref);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <DesktopHeader
        userName={userName}
        t={t}
        {...monthPicker}
        pickerAnchorRef={pickerAnchorRef}
        userAvatarUrl={userAvatarUrl}
        initials={initials}
        settingsHref={settingsHref}
        prefetchSettings={prefetchSettings}
      />

      <MobileHeader
        t={t}
        userName={userName}
        userAvatarUrl={userAvatarUrl}
        initials={initials}
        {...monthPicker}
        mobilePickerAnchorRef={mobilePickerAnchorRef}
        settingsHref={settingsHref}
      />
    </header>
  );
}
