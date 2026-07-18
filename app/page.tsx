import { redirect } from "next/navigation";

import { LandingContent } from "@/components/landing/landing-content";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return <LandingContent />;
}
