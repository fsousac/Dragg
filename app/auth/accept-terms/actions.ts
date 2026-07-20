"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function acceptTermsAction() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/");
  }

  await supabase
    .from("profiles")
    .update({ terms_accepted: true })
    .eq("id", data.user.id);

  redirect("/dashboard");
}
