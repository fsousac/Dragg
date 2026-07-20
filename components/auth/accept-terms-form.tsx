/* v8 ignore file -- Form interaction is covered through auth UI render tests and production build checks. */
"use client";

import { type SubmitEvent, useState } from "react";

import { TermsAcceptanceCheckbox } from "@/components/auth/terms-acceptance-checkbox";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function AcceptTermsForm({
  acceptTermsAction,
}: Readonly<{ acceptTermsAction: () => Promise<void> }>) {
  const { t } = useI18n();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    if (!checked) {
      event.preventDefault();
      setError(t("auth.acceptTermsRequired"));
      return;
    }
    setIsSubmitting(true);
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/88 p-6 shadow-2xl shadow-green-950/30 backdrop-blur md:p-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-normal text-white">
          {t("auth.acceptTermsTitle")}
        </h1>
        <p className="text-sm leading-6 text-zinc-300">
          {t("auth.acceptTermsDescription")}
        </p>
      </div>

      <form
        action={acceptTermsAction}
        className="mt-6 space-y-4"
        onSubmit={handleSubmit}
      >
        <TermsAcceptanceCheckbox
          checked={checked}
          disabled={isSubmitting}
          error={error}
          onCheckedChange={(next) => {
            setChecked(next);
            if (next) setError(undefined);
          }}
        />

        <Button
          className="h-11 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_32px_rgba(34,197,94,0.25)] hover:bg-primary/90"
          disabled={isSubmitting}
          size="lg"
          type="submit"
        >
          {t("auth.acceptTermsSubmit")}
        </Button>
      </form>
    </section>
  );
}
