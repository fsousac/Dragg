/* v8 ignore file -- Checkbox interaction is covered through auth UI render tests and production build checks. */
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

const termsOfUseUrl =
  "https://github.com/fsousac/Dragg/blob/main/docs/terms-of-use.md";
const privacyPolicyUrl =
  "https://github.com/fsousac/Dragg/blob/main/docs/privacy-policy.md";

export function TermsAcceptanceCheckbox({
  checked,
  disabled,
  error,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  error?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Checkbox
          aria-invalid={Boolean(error)}
          checked={checked}
          disabled={disabled}
          id="auth-accept-terms"
          onCheckedChange={(next) => onCheckedChange(next === true)}
        />
        <Label
          htmlFor="auth-accept-terms"
          className="text-sm font-normal leading-5 text-zinc-300"
        >
          {t("auth.acceptTermsPrefix")}{" "}
          <a
            className="underline underline-offset-4 hover:text-white"
            href={termsOfUseUrl}
            onClick={(event) => event.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("auth.termsOfUse")}
          </a>{" "}
          {t("auth.acceptTermsAnd")}{" "}
          <a
            className="underline underline-offset-4 hover:text-white"
            href={privacyPolicyUrl}
            onClick={(event) => event.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("auth.privacyPolicy")}
          </a>.
        </Label>
      </div>
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
