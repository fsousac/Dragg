"use client";

import { Globe, Palette, User } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { type OAuthProfile } from "@/lib/auth/profile";
import { useI18n } from "@/lib/i18n";
import { isSupportedCurrency } from "@/lib/i18n/currency";

function SettingsCard({
  children,
  description,
  icon: Icon,
  title,
}: Readonly<{
  children: React.ReactNode;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}>) {
  return (
    <Card className="border-border bg-card card-shadow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="size-5 text-primary" />
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function getInitials(name: string) {
  return (
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "D"
  );
}

type I18n = ReturnType<typeof useI18n>;

function ProfileAvatarRow({
  profile,
  fallbackValue,
}: Readonly<{ profile: OAuthProfile; fallbackValue: string }>) {
  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16 border-2 border-primary">
        {profile.avatarUrl ? (
          <AvatarImage
            src={profile.avatarUrl}
            alt={profile.fullName}
            referrerPolicy="no-referrer"
          />
        ) : null}
        <AvatarFallback className="bg-linear-to-br from-primary to-emerald-400 text-xl font-bold text-primary-foreground">
          {getInitials(profile.fullName)}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold text-foreground">{profile.fullName}</p>
        <p className="text-sm text-muted-foreground">
          {profile.email || fallbackValue}
        </p>
      </div>
    </div>
  );
}

function ReadOnlyProfileField({
  id,
  label,
  type,
  value,
}: Readonly<{
  id?: string;
  label: string;
  type?: string;
  value: string;
}>) {
  return (
    <div className="space-y-2">
      {id ? <Label htmlFor={id}>{label}</Label> : <Label>{label}</Label>}
      <Input id={id} type={type} value={value} readOnly />
    </div>
  );
}

function ProfileFieldsGrid({
  profile,
  formatDate,
  fallbackValue,
  t,
}: Readonly<{
  profile: OAuthProfile;
  formatDate: I18n["formatDate"];
  fallbackValue: string;
  t: I18n["t"];
}>) {
  const createdAtValue = profile.createdAt
    ? formatDate(profile.createdAt, { dateStyle: "medium", timeStyle: "short" })
    : fallbackValue;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ReadOnlyProfileField
        id="firstName"
        label={t("screen.settings.firstName")}
        value={profile.firstName || fallbackValue}
      />
      <ReadOnlyProfileField
        id="lastName"
        label={t("screen.settings.lastName")}
        value={profile.lastName || fallbackValue}
      />
      <ReadOnlyProfileField
        id="email"
        type="email"
        label={t("screen.settings.email")}
        value={profile.email || fallbackValue}
      />
      <ReadOnlyProfileField
        label={t("settings.createdAt")}
        value={createdAtValue}
      />
    </div>
  );
}

function ProfileSettingsCard({
  profile,
  formatDate,
  fallbackValue,
  t,
}: Readonly<{
  profile: OAuthProfile;
  formatDate: I18n["formatDate"];
  fallbackValue: string;
  t: I18n["t"];
}>) {
  return (
    <SettingsCard
      icon={User}
      title={t("screen.settings.profile")}
      description={t("screen.settings.profileDescription")}
    >
      <ProfileAvatarRow profile={profile} fallbackValue={fallbackValue} />
      <Separator />
      <ProfileFieldsGrid
        profile={profile}
        formatDate={formatDate}
        fallbackValue={fallbackValue}
        t={t}
      />
    </SettingsCard>
  );
}

function AppearanceSettingsCard({ t }: Readonly<{ t: I18n["t"] }>) {
  return (
    <SettingsCard
      icon={Palette}
      title={t("screen.settings.appearance")}
      description={t("screen.settings.appearanceDescription")}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">
            {t("screen.settings.theme")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("screen.settings.themeDescription")}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </SettingsCard>
  );
}

function CurrencySelectField({
  currency,
  setCurrency,
  t,
}: Readonly<{
  currency: I18n["currency"];
  setCurrency: I18n["setCurrency"];
  t: I18n["t"];
}>) {
  return (
    <div className="space-y-2">
      <Label>{t("screen.settings.currency")}</Label>
      <Select
        value={currency}
        onValueChange={(value) =>
          setCurrency(isSupportedCurrency(value) ? value : "USD")
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BRL">BRL (R$)</SelectItem>
          <SelectItem value="USD">USD ($)</SelectItem>
          <SelectItem value="EUR">EUR (€)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function LanguageSelectField({
  locale,
  setLocale,
  t,
}: Readonly<{
  locale: I18n["locale"];
  setLocale: I18n["setLocale"];
  t: I18n["t"];
}>) {
  return (
    <div className="space-y-2">
      <Label>{t("screen.settings.language")}</Label>
      <Select
        value={locale}
        onValueChange={(value) => setLocale(value === "pt-BR" ? "pt-BR" : "en")}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="pt-BR">Português</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function RegionalSettingsCard({
  currency,
  setCurrency,
  locale,
  setLocale,
  t,
}: Readonly<{
  currency: I18n["currency"];
  setCurrency: I18n["setCurrency"];
  locale: I18n["locale"];
  setLocale: I18n["setLocale"];
  t: I18n["t"];
}>) {
  return (
    <SettingsCard
      icon={Globe}
      title={t("screen.settings.regional")}
      description={t("screen.settings.regionalDescription")}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CurrencySelectField currency={currency} setCurrency={setCurrency} t={t} />
        <LanguageSelectField locale={locale} setLocale={setLocale} t={t} />
      </div>
    </SettingsCard>
  );
}

type SettingsScreenProps = {
  readonly profile: OAuthProfile;
};

export function SettingsScreen({ profile }: SettingsScreenProps) {
  const { currency, formatDate, locale, setCurrency, setLocale, t } = useI18n();
  const fallbackValue = t("settings.notAvailable");

  return (
    <main className="max-w-4xl">
      <PageHeader
        title={t("screen.settings.title")}
        description={t("screen.settings.description")}
      />

      <div className="space-y-6">
        <ProfileSettingsCard
          profile={profile}
          formatDate={formatDate}
          fallbackValue={fallbackValue}
          t={t}
        />
        <AppearanceSettingsCard t={t} />
        <RegionalSettingsCard
          currency={currency}
          setCurrency={setCurrency}
          locale={locale}
          setLocale={setLocale}
          t={t}
        />
      </div>
    </main>
  );
}
