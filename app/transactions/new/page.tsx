import { redirect } from "next/navigation";
import {
  TransactionForm,
  type TransactionFormData,
} from "@/components/dashboard/transaction-form";
import { AppShell } from "@/components/dashboard/app-shell";
import { createClient } from "@/lib/supabase/server";
import {
  createCategoryAction,
  createTransactionAction,
} from "@/app/transactions/actions";
import { getTransactionFormOptions } from "@/lib/finance/transactions";

async function handleTransactionSubmit(data: TransactionFormData) {
  "use server";

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    redirect("/");
  }

  await createTransactionAction(data);

  // Redirect to dashboard after successful submission
  redirect("/dashboard");
}

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/");
  }

  const formOptions = await getTransactionFormOptions();

  return (
    <AppShell>
      <TransactionForm
        categories={formOptions.categories}
        createCategoryAction={createCategoryAction}
        onSubmit={handleTransactionSubmit}
        paymentMethods={formOptions.paymentMethods}
      />
    </AppShell>
  );
}
