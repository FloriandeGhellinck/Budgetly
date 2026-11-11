"use client";

import { Button } from "@budgetly/ui/components/button";
import { Field, FieldError, FieldLabel, FieldSeparator } from "@budgetly/ui/components/field";
import { Input } from "@budgetly/ui/components/input";
import { MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { type MagicLinkState, sendMagicLink, signInWithGoogle } from "@/lib/auth-actions";

export function LoginForm({
  googleEnabled,
  linkInvalid,
}: {
  googleEnabled: boolean;
  linkInvalid: boolean;
}) {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <output className="flex items-start gap-2 text-sm">
        <MailIcon className="mt-0.5 size-4 shrink-0" />
        {t("sent", { email: state.email })}
      </output>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {linkInvalid && (
        <p role="alert" className="text-sm text-destructive">
          {t("linkInvalid")}
        </p>
      )}
      <form action={action} className="flex flex-col gap-4">
        <Field data-invalid={state.status === "error" || undefined}>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder={t("emailPlaceholder")}
            aria-invalid={state.status === "error" || undefined}
          />
          {state.status === "error" && <FieldError>{t(state.error)}</FieldError>}
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t("sending") : t("sendLink")}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <FieldSeparator>{t("or")}</FieldSeparator>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              {t("google")}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
