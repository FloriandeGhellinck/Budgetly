"use client";

import type { Transaction } from "@budgetly/contract";
import { Button } from "@budgetly/ui/components/button";
import { DatePicker } from "@budgetly/ui/components/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@budgetly/ui/components/field";
import { Input } from "@budgetly/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@budgetly/ui/components/select";
import { formatAmountInput, parseAmountMinor } from "@budgetly/ui/lib/money";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionErrorCode } from "@/lib/action-result";
import { fromIsoDay, toIsoDay } from "@/lib/dates";
import type { EntryOptions } from "@/lib/entry-options";
import { createTransaction, suggestForName, updateTransaction } from "@/lib/transactions/actions";
import { CategoryCombobox } from "./category-combobox";
import { applySuggestion, type SuggestableField, type SuggestedFields } from "./suggestion";
import { TagsInput } from "./tags-input";
import { useCalendarLocale } from "./use-calendar-locale";

const NONE = "none";
const SUGGEST_DELAY_MS = 250;

type Direction = "expense" | "income";

// Create or edit one expense or income. Amounts are typed as decimals and
// sent as integer cents (parseAmountMinor). A new transaction carries an
// idempotency key that lives as long as this form: a retried submission
// (double tap, network error) cannot record it twice (ADR 0027).
export function TransactionForm({
  direction,
  directionTouched,
  onDirectionChange,
  transaction,
  options,
  onDone,
  onCancel,
}: {
  direction: Direction;
  // Set once the user picks expense or income by hand: suggestions keep it.
  directionTouched: boolean;
  onDirectionChange: (direction: Direction) => void;
  transaction?: Transaction | undefined;
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

  const activeAccounts = useMemo(
    () => options.accounts.filter((a) => !a.archived || a.id === transaction?.accountId),
    [options.accounts, transaction?.accountId],
  );
  const [amount, setAmount] = useState(
    transaction ? formatAmountInput(transaction.amountMinor, locale) : "",
  );
  const [name, setName] = useState(transaction?.name ?? "");
  const [date, setDate] = useState<Date>(() =>
    transaction ? fromIsoDay(transaction.occurredOn) : new Date(),
  );
  const [fields, setFields] = useState<Omit<SuggestedFields, "direction">>({
    accountId: transaction?.accountId ?? activeAccounts[0]?.id ?? "",
    categoryId: transaction?.categoryId ?? null,
    beneficiaryId: transaction?.beneficiaryId ?? null,
  });
  const [tags, setTags] = useState<string[]>(transaction?.tags ?? []);
  const touched = useRef(new Set<SuggestableField>());
  const [suggested, setSuggested] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);

  const amountMinor = parseAmountMinor(amount);
  const amountInvalid = submitted && amountMinor === null;
  const nameInvalid = submitted && name.trim() === "";

  // The category belongs to one direction: switching drops a category of the other.
  const categoryDirection = useMemo(() => {
    const group = options.categoryGroups.find((g) =>
      g.categories.some((c) => c.id === fields.categoryId),
    );
    return group?.direction ?? null;
  }, [options.categoryGroups, fields.categoryId]);
  const categoryId = categoryDirection === direction ? fields.categoryId : null;

  // History-based suggestions (ADR 0024), only while creating.
  const latest = useRef({ direction, directionTouched, fields });
  useEffect(() => {
    latest.current = { direction, directionTouched, fields };
  });
  useEffect(() => {
    if (transaction) return;
    const query = name.trim();
    if (query.length < 2) return;
    const timer = setTimeout(async () => {
      const result = await suggestForName(query);
      if (!result.ok || !result.data) return;
      const current = latest.current;
      const next = applySuggestion(
        { direction: current.direction, ...current.fields },
        result.data,
        current.directionTouched
          ? new Set<SuggestableField>([...touched.current, "direction"])
          : touched.current,
        new Set(activeAccounts.map((a) => a.id)),
      );
      setFields({
        accountId: next.accountId,
        categoryId: next.categoryId,
        beneficiaryId: next.beneficiaryId,
      });
      if (next.direction !== current.direction) onDirectionChange(next.direction);
      setSuggested(true);
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [name, transaction, activeAccounts, onDirectionChange]);

  function setField<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    touched.current.add(key);
    setFields((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (amountMinor === null || name.trim() === "" || !fields.accountId) return;
    const values = {
      direction,
      amountMinor,
      occurredOn: toIsoDay(date),
      name: name.trim(),
      accountId: fields.accountId,
      tags,
    };
    startTransition(async () => {
      const result = transaction
        ? await updateTransaction({
            id: transaction.id,
            ...values,
            categoryId,
            beneficiaryId: fields.beneficiaryId,
          })
        : await createTransaction({
            ...values,
            ...(categoryId ? { categoryId } : {}),
            ...(fields.beneficiaryId ? { beneficiaryId: fields.beneficiaryId } : {}),
            idempotencyKey: idempotencyKey.current,
          });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t("saved"));
      onDone();
    });
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

      <Field data-invalid={nameInvalid || undefined}>
        <FieldLabel htmlFor={`${id}-name`}>{t("name")}</FieldLabel>
        <Input
          id={`${id}-name`}
          autoComplete="off"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={nameInvalid || undefined}
        />
        {nameInvalid && <FieldError>{t("nameRequired")}</FieldError>}
        {suggested && !nameInvalid && <FieldDescription>{t("suggested")}</FieldDescription>}
      </Field>

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
          <FieldLabel htmlFor={`${id}-account`}>{t("account")}</FieldLabel>
          <Select
            items={activeAccounts.map((a) => ({ value: a.id, label: a.label }))}
            value={fields.accountId}
            onValueChange={(value: string | null) => value && setField("accountId", value)}
          >
            <SelectTrigger id={`${id}-account`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${id}-category`}>{t("category")}</FieldLabel>
        <CategoryCombobox
          id={`${id}-category`}
          groups={options.categoryGroups}
          direction={direction}
          value={categoryId}
          onValueChange={(value) => setField("categoryId", value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-beneficiary`}>{t("beneficiary")}</FieldLabel>
        <Select
          items={[
            { value: NONE, label: t("noBeneficiary") },
            ...options.beneficiaries.map((b) => ({ value: b.id, label: b.label })),
          ]}
          value={fields.beneficiaryId ?? NONE}
          onValueChange={(value: string | null) =>
            setField("beneficiaryId", value && value !== NONE ? value : null)
          }
        >
          <SelectTrigger id={`${id}-beneficiary`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("noBeneficiary")}</SelectItem>
            {options.beneficiaries.map((beneficiary) => (
              <SelectItem key={beneficiary.id} value={beneficiary.id}>
                {beneficiary.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-tags`}>{t("tags")}</FieldLabel>
        <TagsInput id={`${id}-tags`} known={options.tags} value={tags} onValueChange={setTags} />
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
