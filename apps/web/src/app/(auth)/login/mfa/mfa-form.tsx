"use client";

import { Button } from "@budgetly/ui/components/button";
import { Field, FieldError, FieldLabel } from "@budgetly/ui/components/field";
import { Input } from "@budgetly/ui/components/input";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { type MfaState, signOut, verifyMfa } from "@/lib/auth-actions";

export function MfaForm() {
  const t = useTranslations("mfa");
  const [state, action, pending] = useActionState<MfaState, FormData>(verifyMfa, { error: null });
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <Field data-invalid={state.error !== null || undefined}>
          <FieldLabel htmlFor="code">{t("code")}</FieldLabel>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
          />
          {state.error && <FieldError>{t(state.error)}</FieldError>}
        </Field>
        <Button type="submit" disabled={pending}>
          {t("verify")}
        </Button>
      </form>
      <form action={signOut}>
        <Button type="submit" variant="link" className="w-full">
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}
