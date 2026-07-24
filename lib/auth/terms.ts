import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireAcceptedTerms(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("terms_accepted")
    .eq("id", userId)
    .single();

  if (!data?.terms_accepted) {
    redirect("/auth/accept-terms");
  }
}
