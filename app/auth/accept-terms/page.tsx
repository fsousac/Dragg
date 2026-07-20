import { redirect } from "next/navigation";

import { acceptTermsAction } from "@/app/auth/accept-terms/actions";
import { AcceptTermsForm } from "@/components/auth/accept-terms-form";
import { createClient } from "@/lib/supabase/server";

export default async function AcceptTermsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted")
    .eq("id", userData.user.id)
    .single();

  if (profile?.terms_accepted) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-900 p-6">
      <AcceptTermsForm acceptTermsAction={acceptTermsAction} />
    </main>
  );
}
