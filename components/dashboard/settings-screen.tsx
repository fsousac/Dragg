"use client"

import { Bell, Globe, HelpCircle, Palette, Shield, User } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { type OAuthProfile } from "@/lib/auth/profile"
import { useI18n } from "@/lib/i18n"

function SettingsCard({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  description: string
  icon: React.ComponentType<{ className?: string }>
  title: string
}) {
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
  )
}

type SettingsScreenProps = {
  profile: OAuthProfile
}

function getInitials(name: string) {
  return (
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "D"
  )
}

export function SettingsScreen({ profile }: SettingsScreenProps) {
  const { formatDate, locale, setLocale, t } = useI18n()
  const fallbackValue = t("settings.notAvailable")

  return (
    <main className="max-w-4xl">
      <PageHeader title={t("screen.settings.title")} description={t("screen.settings.description")} />

      <div className="space-y-6">
        <SettingsCard
          icon={User}
          title={t("screen.settings.profile")}
          description={t("screen.settings.profileDescription")}
        >
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-primary">
              {profile.avatarUrl ? (
                <AvatarImage
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-400 text-xl font-bold text-primary-foreground">
                {getInitials(profile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">
                {profile.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                {profile.email || fallbackValue}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("screen.settings.firstName")}</Label>
              <Input id="firstName" value={profile.firstName || fallbackValue} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("screen.settings.lastName")}</Label>
              <Input id="lastName" value={profile.lastName || fallbackValue} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("screen.settings.email")}</Label>
              <Input id="email" type="email" value={profile.email || fallbackValue} readOnly />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.createdAt")}</Label>
              <Input
                value={
                  profile.createdAt
                    ? formatDate(profile.createdAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : fallbackValue
                }
                readOnly
              />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Palette}
          title={t("screen.settings.appearance")}
          description={t("screen.settings.appearanceDescription")}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">{t("screen.settings.theme")}</p>
              <p className="text-sm text-muted-foreground">{t("screen.settings.themeDescription")}</p>
            </div>
            <ThemeToggle />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">{t("screen.settings.compactMode")}</p>
              <p className="text-sm text-muted-foreground">{t("screen.settings.compactDescription")}</p>
            </div>
            <Switch />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Bell}
          title={t("screen.settings.notifications")}
          description={t("screen.settings.notificationsDescription")}
        >
          {[
            ["screen.settings.budgetAlerts", true],
            ["screen.settings.paymentReminders", true],
            ["screen.settings.goalProgress", false],
            ["screen.settings.emailNotifications", true],
          ].map(([key, checked]) => (
            <div key={String(key)} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <p className="font-medium text-foreground">{t(String(key))}</p>
              <Switch defaultChecked={Boolean(checked)} />
            </div>
          ))}
        </SettingsCard>

        <SettingsCard
          icon={Globe}
          title={t("screen.settings.regional")}
          description={t("screen.settings.regionalDescription")}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("screen.settings.currency")}</Label>
              <Select defaultValue={locale === "pt-BR" ? "brl" : "usd"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="brl">BRL (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("screen.settings.language")}</Label>
              <Select value={locale} onValueChange={(value) => setLocale(value === "pt-BR" ? "pt-BR" : "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt-BR">Português</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Shield}
          title={t("screen.settings.security")}
          description={t("screen.settings.securityDescription")}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-foreground">{t("screen.settings.twoFactor")}</p>
            <Button variant="outline" size="sm">{t("common.enable")}</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-foreground">{t("screen.settings.changePassword")}</p>
            <Button variant="outline" size="sm">{t("common.change")}</Button>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={HelpCircle}
          title={t("screen.settings.helpSupport")}
          description={t("screen.settings.helpDescription")}
        >
          {["screen.settings.helpCenter", "screen.settings.contactSupport", "screen.settings.privacyPolicy", "screen.settings.terms"].map((key) => (
            <Button key={key} variant="ghost" className="w-full justify-start">
              {t(key)}
            </Button>
          ))}
        </SettingsCard>
      </div>
    </main>
  )
}
