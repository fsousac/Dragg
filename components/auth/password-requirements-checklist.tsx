/* v8 ignore file -- Password requirement checklist is covered through validation unit tests and auth UI render tests. */
"use client";

import { Check, Circle } from "lucide-react";

import {
  type PasswordRequirementKey,
  getPasswordRequirementChecks,
} from "@/lib/auth/email-password";
import { useI18n } from "@/lib/i18n";

const requirementOrder: PasswordRequirementKey[] = [
  "minLength",
  "lowercase",
  "uppercase",
  "number",
  "symbol",
];

const requirementLabelKeys: Record<PasswordRequirementKey, string> = {
  lowercase: "auth.passwordRequirementLowercase",
  minLength: "auth.passwordRequirementMinLength",
  number: "auth.passwordRequirementNumber",
  symbol: "auth.passwordRequirementSymbol",
  uppercase: "auth.passwordRequirementUppercase",
};

type PasswordRequirementsChecklistProps = {
  password: string;
};

export function PasswordRequirementsChecklist({
  password,
}: PasswordRequirementsChecklistProps) {
  const { t } = useI18n();
  const checks = getPasswordRequirementChecks(password);

  return (
    <div
      aria-live="polite"
      className="rounded-md border border-white/10 bg-zinc-900/60 p-3"
      role="group"
    >
      <p className="mb-2 text-xs font-medium text-zinc-300">
        {t("auth.passwordRequirementsTitle")}
      </p>
      <ul className="space-y-1.5">
        {requirementOrder.map((requirement) => {
          const isMet = checks[requirement];

          return (
            <li
              className="flex items-center gap-2 text-xs"
              key={requirement}
            >
              {isMet ? (
                <Check
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-green-400"
                />
              ) : (
                <Circle
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-zinc-500"
                />
              )}
              <span className={isMet ? "text-zinc-200" : "text-zinc-400"}>
                {t(requirementLabelKeys[requirement])}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
