import { redirect } from "next/navigation";

import { LoginCard } from "@/components/auth/login-card";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/transactions/new");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(236,72,153,0.14),transparent_24%),radial-gradient(circle_at_50%_88%,rgba(249,115,22,0.12),transparent_28%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-green-400/60 to-transparent" />

        <LoginCard />
      </div>
    </main>
  );
}
