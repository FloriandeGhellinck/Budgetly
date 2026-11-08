"use client";

import { Button } from "@expense/ui/components/button";
import { DatePicker } from "@expense/ui/components/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@expense/ui/components/field";
import { Input } from "@expense/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@expense/ui/components/select";
import { parseAmountMinor } from "@expense/ui/lib/money";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionErrorCode } from "@/lib/action-result";
import { toIsoDay } from "@/lib/dates";
import type { EntryOptions } from "@/lib/entry-options";
import { createTransfer } from "@/lib/transactions/actions";
import { useCalendarLocale } from "./use-calendar-locale";

// Money moving between two of the user's accounts (ADR 0005, 0006). Like a
// new transaction, it carries one idempotency key for the life of the form.
export function TransferForm({
  options,
  onDone,
  onCancel,
}: {
  options: EntryOptions;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("entry");
  const tError = useTranslations("errors");
  const locale = useLocale();
  const calendarLocale = useCalendarLocale();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useRef(crypto.randomUUID());

  const accounts = useMemo(() => options.accounts.filter((a) => !a.archived), [options.accounts]);
  const items = accounts.map((a) => ({ value: a.id, label: a.label }));
  const [fromAccountId, setFrom] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setTo] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date());
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);

  const sentAmountMinor = parseAmountMinor(amount);
  const receivedAmountMinor = received.trim() === "" ? undefined : parseAmountMinor(received);
  const amountInvalid = submitted && sentAmountMinor === null;
  const receivedInvalid = submitted && receivedAmountMinor === null;
  const sameAccount = submitted && fromAccountId === toAccountId;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (
      sentAmountMinor === null ||
      receivedAmountMinor === null ||
      !fromAccountId ||
      fromAccountId === toAccountId
    ) {
      return;
    }
    startTransition(async () => {
      const result = await createTransfer({
        fromAccountId,
        toAccountId,
        sentAmountMinor,
        ...(receivedAmountMinor !== undefined ? { receivedAmountMinor } : {}),
        occurredOn: toIsoDay(date),
        ...(name.trim() ? { name: name.trim() } : {}),
        idempotencyKey: idempotencyKey.current,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t("transferSaved"));
      onDone();
    });
  }

  function accountSelect(key: "from" | "to", value: string, onChange: (value: string) => void) {
    return (
      <Field data-invalid={sameAccount || undefined}>
        <FieldLabel htmlFor={`${id}-${key}`}>{t(key)}</FieldLabel>
        <Select
          items={items}
          value={value}
          onValueChange={(next: string | null) => next && onChange(next)}
        >
          <SelectTrigger
            id={`${id}-${key}`}
            className="w-full"
            aria-invalid={sameAccount || undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field data-invalid={amountInvalid || undefined}>
        <FieldLabel htmlFor={`${id}-amount`}>{t("amount")}</FieldLabel>
        <Input
          id={`${id}-amount`}
          inputMode="decimal"
          autoComplete="off"
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the user opened this form to type an amount
          autoFocus
          placeholder={t("amountPlaceholder")}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={amountInvalid || undefined}
          className="h-12 text-2xl tabular-nums md:text-2xl"
        />
        {amountInvalid && <FieldError>{t("invalidAmount")}</FieldError>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        {accountSelect("from", fromAccountId, setFrom)}
        {accountSelect("to", toAccountId, setTo)}
      </div>
      {sameAccount && <FieldError>{t("sameAccount")}</FieldError>}

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-date`}>{t("date")}</FieldLabel>
          <DatePicker
            id={`${id}-date`}
            value={date}
            onValueChange={(value) => value && setDate(value)}
            locale={locale}
            calendarLocale={calendarLocale}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>{t("name")}</FieldLabel>
          <Input
            id={`${id}-name`}
            autoComplete="off"
            placeholder={t("transfer")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </div>

      <Field data-invalid={receivedInvalid || undefined}>
        <FieldLabel htmlFor={`${id}-received`}>{t("received")}</FieldLabel>
        <Input
          id={`${id}-received`}
          inputMode="decimal"
          autoComplete="off"
          value={received}
          onChange={(event) => setReceived(event.target.value)}
          aria-invalid={receivedInvalid || undefined}
        />
        {receivedInvalid ? (
          <FieldError>{t("invalidAmount")}</FieldError>
        ) : (
          <FieldDescription>{t("receivedHint")}</FieldDescription>
        )}
      </Field>

      {error && <FieldError>{tError(error)}</FieldError>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
