"use client";

import Image from "next/image";

import { LoginCard } from "@/components/auth/login-card";
import { useI18n } from "@/lib/i18n";

const FEATURES = [
  { icon: "💰", key: "income" },
  { icon: "🎯", key: "goals" },
  { icon: "📊", key: "reports" },
  { icon: "🔒", key: "control" },
  { icon: "🏷️", key: "smartCategories" },
  { icon: "🆓", key: "free" },
] as const;

export function LandingContent() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <h1 className="sr-only">{t("landing.heading")}</h1>

      <header className="flex flex-col items-center gap-3 pt-12 pb-6 px-4">
        <Image
          src="/dragg-logo-wordmark.svg"
          alt="Dragg"
          width={140}
          height={40}
          priority
        />
        <p className="text-foreground/60 text-sm text-center">
          {t("landing.description")}
        </p>
      </header>

      <div className="relative isolate flex min-h-0 items-center justify-center overflow-hidden px-4 py-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(236,72,153,0.14),transparent_24%),radial-gradient(circle_at_50%_88%,rgba(249,115,22,0.12),transparent_28%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-green-400/60 to-transparent" />

        <LoginCard />
      </div>

      <section
        aria-label={t("landing.featuresLabel")}
        className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {FEATURES.map((f) => (
          <div
            key={f.key}
            className="rounded-xl border border-foreground/10 bg-foreground/5 p-5 flex flex-col gap-2"
          >
            <span className="text-2xl" aria-hidden="true">
              {f.icon}
            </span>
            <h2 className="font-semibold text-foreground text-sm">
              {t(`landing.feature.${f.key}.title`)}
            </h2>
            <p className="text-foreground/60 text-xs">
              {t(`landing.feature.${f.key}.description`)}
            </p>
          </div>
        ))}
      </section>

      <footer className="text-center py-8 px-4 text-foreground/40 text-xs">
        <a
          href="https://github.com/fsousac/Dragg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground/70 transition-colors"
        >
          {t("landing.openSource")}
        </a>{" "}
        — {t("landing.license")}
      </footer>
    </main>
  );
}
