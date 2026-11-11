"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@budgetly/ui/components/responsive-dialog";
import { ToggleGroup, ToggleGroupItem } from "@budgetly/ui/components/toggle-group";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { EntryOptions } from "@/lib/entry-options";
import type { EntryKind, EntryTarget } from "./entry-context";

const ENTRY_KINDS: readonly EntryKind[] = ["expense", "income", "transfer"];
import { TransactionForm } from "./transaction-form";
import { TransferForm } from "./transfer-form";

export function EntryDialog({
  target,
  options,
  onClose,
}: {
  target: EntryTarget | null;
  options: EntryOptions;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Keyed so each opening starts from a fresh form and idempotency key. */}
      {target && (
        <EntryDialogBody
          key={entryKey(target)}
          target={target}
          options={options}
          onClose={onClose}
        />
      )}
    </ResponsiveDialog>
  );
}

function entryKey(target: EntryTarget): string {
  if (target.mode === "edit") return target.transaction.id;
  if (target.mode === "duplicate") return `duplicate-${target.draft.idempotencyKey}`;
  return `new-${target.kind}`;
}

function initialKind(target: EntryTarget): EntryKind {
  if (target.mode === "new") return target.kind;
  if (target.mode === "duplicate") return target.draft.kind;
  return target.transaction.direction === "income" ? "income" : "expense";
}

function EntryDialogBody({
  target,
  options,
  onClose,
}: {
  target: EntryTarget;
  options: EntryOptions;
  onClose: () => void;
}) {
  const t = useTranslations("entry");
  const [kind, setKind] = useState<EntryKind>(() => initialKind(target));
  const [kindTouched, setKindTouched] = useState(target.mode !== "new");
  const draft = target.mode === "duplicate" ? target.draft : undefined;
  const title =
    target.mode === "edit"
      ? t("editTitle")
      : kind === "transfer"
        ? t("transferTitle")
        : t("newTitle");

  return (
    <ResponsiveDialogContent>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">
          {t("description")}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <ToggleGroup
        aria-label={t("kind")}
        variant="outline"
        className="w-full"
        value={[kind]}
        onValueChange={(value: string[]) => {
          const next = ENTRY_KINDS.find((candidate) => candidate === value[0]);
          if (!next) return;
          setKind(next);
          setKindTouched(true);
        }}
      >
        <ToggleGroupItem value="expense" className="flex-1">
          {t("expense")}
        </ToggleGroupItem>
        <ToggleGroupItem value="income" className="flex-1">
          {t("income")}
        </ToggleGroupItem>
        {target.mode !== "edit" && (
          <ToggleGroupItem value="transfer" className="flex-1">
            {t("transfer")}
          </ToggleGroupItem>
        )}
      </ToggleGroup>
      {kind === "transfer" ? (
        <TransferForm
          draft={draft?.kind === "transfer" ? draft : undefined}
          options={options}
          onDone={onClose}
          onCancel={onClose}
        />
      ) : (
        <TransactionForm
          direction={kind}
          directionTouched={kindTouched}
          onDirectionChange={setKind}
          transaction={target.mode === "edit" ? target.transaction : undefined}
          draft={draft?.kind === "transfer" ? undefined : draft}
          options={options}
          onDone={onClose}
          onCancel={onClose}
        />
      )}
    </ResponsiveDialogContent>
  );
}
