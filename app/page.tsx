import { redirect } from "next/navigation";
import Image from "next/image";

import { LoginCard } from "@/components/auth/login-card";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    icon: "💰",
    title: "Income & expenses",
    description: "Log earnings, spending, and installments.",
  },
  {
    icon: "🎯",
    title: "Financial goals",
    description: "Set objectives and track your progress.",
  },
  {
    icon: "📊",
    title: "Monthly reports",
    description: "Visualize the 50/30/20 balance and net worth.",
  },
  {
    icon: "🔒",
    title: "Your data, your control",
    description: "Supabase RLS: only you can access your data.",
  },
  {
    icon: "🏷️",
    title: "Smart categories",
    description: "Needs, wants, and savings — neatly organized.",
  },
  {
    icon: "🆓",
    title: "Free & open source",
    description: "Self-hostable. No paid plans, no tracking.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <h1 className="sr-only">Dragg – Personal Finance Dashboard</h1>

      <header className="flex flex-col items-center gap-3 pt-12 pb-6 px-4">
        <Image
          src="/dragg-logo-wordmark.svg"
          alt="Dragg"
          width={140}
          height={40}
          priority
        />
        <p className="text-white/60 text-sm text-center">
          Personal finance, open source and free.
        </p>
      </header>

      <div className="relative isolate flex min-h-0 items-center justify-center overflow-hidden px-4 py-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(236,72,153,0.14),transparent_24%),radial-gradient(circle_at_50%_88%,rgba(249,115,22,0.12),transparent_28%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-green-400/60 to-transparent" />

        <LoginCard />
      </div>

      <section
        aria-label="Features"
        className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-2"
          >
            <span className="text-2xl" aria-hidden="true">
              {f.icon}
            </span>
            <h2 className="font-semibold text-white text-sm">{f.title}</h2>
            <p className="text-white/60 text-xs">{f.description}</p>
          </div>
        ))}
      </section>

      <footer className="text-center py-8 px-4 text-white/40 text-xs">
        <a
          href="https://github.com/fsousac/Dragg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white/70 transition-colors"
        >
          Open source
        </a>{" "}
        — MIT License
      </footer>
    </main>
  );
}
