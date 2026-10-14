import { AppShell } from "@/components/dashboard/app-shell";
import { ImportStatementScreen } from "@/components/dashboard/import-statement-screen";
import { importStatementAction } from "@/app/transactions/actions";
import { getTransactionFormOptions } from "@/lib/finance/transactions";

export default async function ImportStatementPage() {
  const { paymentMethods } = await getTransactionFormOptions();

  return (
    <AppShell>
      <ImportStatementScreen
        importStatementAction={importStatementAction}
        paymentMethods={paymentMethods.map(({ id, label }) => ({
          id,
          name: label,
        }))}
      />
    </AppShell>
  );
}
