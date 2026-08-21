import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireAcceptedTerms(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("terms_accepted")
    .eq("id", userId)
    .single();

  // PGRST116 = nenhuma linha encontrada (genuinamente "termos não
  // aceitos"). Qualquer outro erro não pode ser mascarado como isso,
  // ou uma falha transitória entra em loop com o redirect assim que
  // a falha passa.
  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data?.terms_accepted) {
    redirect("/auth/accept-terms");
  }
}
