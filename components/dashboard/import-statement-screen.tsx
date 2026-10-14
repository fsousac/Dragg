"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  parseStatement,
  type ImportedRow,
} from "@/lib/finance/import/parse-statement";
import type { ImportStatementResult } from "@/lib/finance/import/import-statement";
import { useI18n } from "@/lib/i18n";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PREVIEW_ROWS = 10;

type ImportStatementScreenProps = {
  importStatementAction: (data: {
    paymentMethod: string;
    rows: ImportedRow[];
  }) => Promise<ImportStatementResult>;
  paymentMethods: { id: string; name: string }[];
};

export function ImportStatementScreen({
  importStatementAction,
  paymentMethods,
}: ImportStatementScreenProps) {
  const { formatCurrency, formatDate, t } = useI18n();
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("none");
  const [isPending, startTransition] = useTransition();

  const handleFile = async (file: File | undefined) => {
    setRows([]);

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("import.tooLarge"));
      return;
    }

    // Parsed in the browser: the file itself never leaves the device.
    const parsed = parseStatement(file.name, await file.text());

    if (parsed.length === 0) {
      toast.error(t("import.noRows"));
      return;
    }

    setRows(parsed);
  };

  const handleImport = () => {
    startTransition(async () => {
      try {
        const result = await importStatementAction({ paymentMethod, rows });

        toast.success(
          t("import.done")
            .replace("{imported}", String(result.imported))
            .replace("{duplicates}", String(result.duplicates))
            .replace("{categorized}", String(result.categorized)),
        );
        setRows([]);
      } catch {
        toast.error(t("import.error"));
      }
    });
  };

  return (
    <>
      <PageHeader
        title={t("import.title")}
        description={t("import.description")}
      />

      <Card className="mb-4 flex flex-col gap-4 p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Upload className="size-4" />
          {t("import.chooseFile")}
          <input
            accept=".csv,.ofx,.txt"
            className="text-sm font-normal"
            onChange={(event) => void handleFile(event.target.files?.[0])}
            type="file"
          />
        </label>
        <p className="text-xs text-muted-foreground">{t("import.hint")}</p>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("import.paymentMethod")}
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm font-normal"
            onChange={(event) => setPaymentMethod(event.target.value)}
            value={paymentMethod}
          >
            <option value="none">{t("import.noPaymentMethod")}</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {rows.length > 0 && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-medium">
            {t("import.preview").replace("{count}", String(rows.length))}
          </p>
          <ul className="divide-y text-sm">
            {rows.slice(0, PREVIEW_ROWS).map((row, index) => (
              <li
                className="flex items-center justify-between gap-3 py-2"
                key={`${row.date}-${index}`}
              >
                <span className="truncate">
                  {formatDate(row.date, { day: "numeric", month: "short" })} ·{" "}
                  {row.description}
                </span>
                <span
                  className={row.amount < 0 ? "text-expense" : "text-income"}
                >
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-4 text-background"
            disabled={isPending}
            onClick={handleImport}
          >
            {t("import.confirm")}
          </Button>
        </Card>
      )}
    </>
  );
}
