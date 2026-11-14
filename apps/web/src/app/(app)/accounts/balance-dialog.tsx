"use client";

import { DatePicker } from "@budgetly/ui/components/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@budgetly/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@budgetly/ui/components/input-group";
import { parseBalanceMinor } from "@budgetly/ui/lib/money";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { useCalendarLocale } from "@/components/transactions/use-calendar-locale";
import { setAccountBalance } from "@/lib/accounts/actions";
import { toIsoDay } from "@/lib/dates";

// Align an account with the bank: the user types the bank's figure and its
// day; the API derives the opening balance (ADR 0035). Not a transaction.
export function BalanceDialog({
  account,
  open,
  onOpenChange,
}: {
  account: { id: string; label: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("accounts");
  const locale = useLocale();
  const calendarLocale = useCalendarLocale();
  const id = useId();
  const [balance, setBalance] = useState("");
  const [date, setDate] = useState(() => new Date());
  const [submitted, setSubmitted] = useState(false);

  const balanceMinor = parseBalanceMinor(balance);
  const invalid = submitted && balanceMinor === null;

  function submit() {
    setSubmitted(true);
    if (balanceMinor === null) return null;
    return setAccountBalance({ id: account.id, balanceMinor, asOf: toIsoDay(date) });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("adjustTitle", { name: account.label })}
      description={t("adjustDescription")}
      saved={t("balanceSaved")}
      onSubmit={submit}
    >
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor={`${id}-balance`}>{t("bankBalance")}</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id={`${id}-balance`}
            inputMode="decimal"
            autoComplete="off"
            placeholder={t("bankBalancePlaceholder")}
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            aria-invalid={invalid || undefined}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>€</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        {invalid ? (
          <FieldError>{t("bankBalanceInvalid")}</FieldError>
        ) : (
          <FieldDescription>{t("bankBalanceHelp")}</FieldDescription>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-date`}>{t("balanceDate")}</FieldLabel>
        <DatePicker
          id={`${id}-date`}
          value={date}
          onValueChange={(value) => value && setDate(value)}
          locale={locale}
          calendarLocale={calendarLocale}
        />
        <FieldDescription>{t("balanceDateHelp")}</FieldDescription>
      </Field>
    </FormDialog>
  );
}
