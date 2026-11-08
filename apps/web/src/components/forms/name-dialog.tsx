"use client";

import { Field, FieldError, FieldLabel } from "@expense/ui/components/field";
import { Input } from "@expense/ui/components/input";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { FormDialog } from "./form-dialog";

// Create or rename something that is just a name (category, beneficiary).
// Mount it keyed per target so each opening starts from `initial`.
export function NameDialog({
  open,
  onOpenChange,
  title,
  saved,
  initial = "",
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  saved: string;
  initial?: string;
  onSave: (name: string) => Promise<ActionResult<unknown>>;
}) {
  const t = useTranslations("forms");
  const id = useId();
  const [name, setName] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const invalid = submitted && name.trim() === "";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      saved={saved}
      onSubmit={() => {
        setSubmitted(true);
        return name.trim() === "" ? null : onSave(name.trim());
      }}
    >
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor={`${id}-name`}>{t("name")}</FieldLabel>
        <Input
          id={`${id}-name`}
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={invalid || undefined}
        />
        {invalid && <FieldError>{t("nameRequired")}</FieldError>}
      </Field>
    </FormDialog>
  );
}
