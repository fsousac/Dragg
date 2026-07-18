import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LandingContent } from "@/components/landing/landing-content";

const translations: Record<string, string> = {
  "landing.description": "Personal finance, open source and free.",
  "landing.feature.control.description":
    "Supabase RLS: only you can access your data.",
  "landing.feature.control.title": "Your data, your control",
  "landing.feature.free.description":
    "Self-hostable. No paid plans, no tracking.",
  "landing.feature.free.title": "Free & open source",
  "landing.feature.goals.description":
    "Set objectives and track your progress.",
  "landing.feature.goals.title": "Financial goals",
  "landing.feature.income.description":
    "Log earnings, spending, and installments.",
  "landing.feature.income.title": "Income & expenses",
  "landing.feature.reports.description":
    "Visualize the 50/30/20 balance and net worth.",
  "landing.feature.reports.title": "Monthly reports",
  "landing.feature.smartCategories.description":
    "Needs, wants, and savings — neatly organized.",
  "landing.feature.smartCategories.title": "Smart categories",
  "landing.featuresLabel": "Features",
  "landing.heading": "Dragg – Personal Finance Dashboard",
  "landing.license": "MIT License",
  "landing.openSource": "Open source",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
    },
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    locale: "en",
    setLocale: vi.fn(),
    t: (key: string) => translations[key] ?? key,
  }),
}));

describe("LandingContent", () => {
  it("renders translated headings, features, and footer", () => {
    const html = renderToStaticMarkup(<LandingContent />);

    expect(html).toContain("Dragg – Personal Finance Dashboard");
    expect(html).toContain("Personal finance, open source and free.");
    expect(html).toContain("Your data, your control");
    expect(html).toContain("Financial goals");
    expect(html).toContain("Income &amp; expenses");
    expect(html).toContain("Monthly reports");
    expect(html).toContain("Smart categories");
    expect(html).toContain("Free &amp; open source");
    expect(html).toContain("Open source");
    expect(html).toContain("MIT License");
  });

  it("uses theme-aware tokens for the page shell instead of hardcoded colors", () => {
    const html = renderToStaticMarkup(<LandingContent />);
    const mainTag = html.match(/<main class="[^"]*"/)?.[0];

    expect(mainTag).toBe('<main class="min-h-screen bg-background text-foreground"');
  });
});
