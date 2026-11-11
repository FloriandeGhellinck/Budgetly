"use client";

import { Button } from "@budgetly/ui/components/button";
import { Field, FieldError, FieldLabel } from "@budgetly/ui/components/field";
import { Input } from "@budgetly/ui/components/input";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  confirmTotpEnrollment,
  removeTotp,
  startTotpEnrollment,
  type TotpEnrollment,
} from "@/lib/mfa-actions";

// Minimal TOTP management: turn on (scan, confirm a code) or turn off.
export function TotpSetup({ factorId }: { factorId: string | null }) {
  const t = useTranslations("security");
  const [pending, startTransition] = useTransition();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  if (factorId) {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (await removeTotp(factorId)) toast.success(t("turnedOff"));
            else toast.error(t("failed"));
          })
        }
      >
        {t("remove")}
      </Button>
    );
  }

  if (!enrollment) {
    return (
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const started = await startTotpEnrollment();
            if (started) setEnrollment(started);
            else toast.error(t("failed"));
          })
        }
      >
        {t("enable")}
      </Button>
    );
  }

  return (
    <form
      className="flex max-w-sm flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const ok = await confirmTotpEnrollment(enrollment.factorId, code.replace(/\s/g, ""));
          setInvalid(!ok);
          if (ok) {
            setEnrollment(null);
            toast.success(t("turnedOn"));
          }
        });
      }}
    >
      <p className="text-sm">{t("scan")}</p>
      <Image
        src={enrollment.qrCode}
        alt=""
        width={180}
        height={180}
        unoptimized
        className="rounded-md bg-white p-2"
      />
      <p className="text-xs break-all text-muted-foreground">
        {t("secret", { secret: enrollment.secret })}
      </p>
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="totp-code">{t("code")}</FieldLabel>
        <Input
          id="totp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        {invalid && <FieldError>{t("invalidCode")}</FieldError>}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {t("confirm")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setEnrollment(null)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
