import { redirect } from "next/navigation";
import {
  NewTransactionForm,
  type NewTransactionFormData,
} from "@/components/dashboard/new-transaction-form";
import { AppShell } from "@/components/dashboard/app-shell";
import { createClient } from "@/lib/supabase/server";

async function handleTransactionSubmit(data: NewTransactionFormData) {
  "use server";

  const supabase = await createClient();
  const { data: session } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  // TODO: Implement transaction saving to Supabase
  // For now, just log the data
  console.log("New transaction:", data);

  // Redirect to dashboard after successful submission
  redirect("/dashboard");
}

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/");
  }

  return (
    <AppShell>
      <NewTransactionForm />
    </AppShell>
  );
}
