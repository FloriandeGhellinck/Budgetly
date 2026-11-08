"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@expense/ui/components/field";
import { Input } from "@expense/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@expense/ui/components/input-group";
import { Switch } from "@expense/ui/components/switch";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { createAccount, updateAccount } from "@/lib/accounts/actions";
import { bpsToPercentInput, percentToBps } from "@/lib/accounts/share";

const FULL = 10_000;
const HALF = 5000;

export type EditableAccount = { id: string; label: string; shareBps: number };

// Create or edit an account. The share is typed as a percentage and sent as
// basis points (ADR 0026, 0027); a personal account is 100 %.
export function AccountDialog({
  account,
  open,
  onOpenChange,
}: {
  account: EditableAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("accounts");
  const tForms = useTranslations("forms");
  const locale = useLocale();
  const id = useId();
  const [name, setName] = useState(account?.label ?? "");
  const [shared, setShared] = useState((account?.shareBps ?? FULL) < FULL);
  const [share, setShare] = useState(
    bpsToPercentInput(account && account.shareBps < FULL ? account.shareBps : HALF, locale),
  );
  const [submitted, setSubmitted] = useState(false);

  const shareBps = shared ? percentToBps(share) : FULL;
  const nameInvalid = submitted && name.trim() === "";
  const shareInvalid = submitted && shareBps === null;

  function submit() {
    setSubmitted(true);
    if (name.trim() === "" || shareBps === null) return null;
    if (!account) return createAccount({ name: name.trim(), shareBps });
    // An unchanged name is not sent: renaming clears a default's seed key.
    return updateAccount({
      id: account.id,
      shareBps,
      ...(name.trim() !== account.label ? { name: name.trim() } : {}),
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={account ? t("editTitle") : t("newTitle")}
      saved={t("saved")}
      onSubmit={submit}
    >
      <Field data-invalid={nameInvalid || undefined}>
        <FieldLabel htmlFor={`${id}-name`}>{tForms("name")}</FieldLabel>
        <Input
          id={`${id}-name`}
          autoComplete="off"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={nameInvalid || undefined}
        />
        {nameInvalid && <FieldError>{tForms("nameRequired")}</FieldError>}
      </Field>

      <Field orientation="horizontal">
        <Switch id={`${id}-shared`} checked={shared} onCheckedChange={setShared} />
        <FieldContent>
          <FieldLabel htmlFor={`${id}-shared`}>{t("shared")}</FieldLabel>
          <FieldDescription>{t("sharedHelp")}</FieldDescription>
        </FieldContent>
      </Field>

      {shared && (
        <Field data-invalid={shareInvalid || undefined}>
          <FieldLabel htmlFor={`${id}-share`}>{t("share")}</FieldLabel>
          <InputGroup className="w-32">
            <InputGroupInput
              id={`${id}-share`}
              inputMode="decimal"
              autoComplete="off"
              value={share}
              onChange={(event) => setShare(event.target.value)}
              aria-invalid={shareInvalid || undefined}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>%</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          {shareInvalid ? (
            <FieldError>{t("shareInvalid")}</FieldError>
          ) : (
            <FieldDescription>{t("shareHelp")}</FieldDescription>
          )}
        </Field>
      )}
    </FormDialog>
  );
}
