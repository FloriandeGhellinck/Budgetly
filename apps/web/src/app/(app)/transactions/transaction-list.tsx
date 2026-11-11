"use client";

import type { Transaction } from "@budgetly/contract";
import { Badge } from "@budgetly/ui/components/badge";
import { Button } from "@budgetly/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@budgetly/ui/components/dropdown-menu";
import { IconChip } from "@budgetly/ui/components/icon-chip";
import { Money } from "@budgetly/ui/components/money";
import {
  ArrowLeftRightIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryChip, NO_CATEGORY_COLOR } from "@/components/categories/category-chip";
import { draftFromTransaction, draftFromTransferLegs } from "@/components/transactions/duplicate";
import { useEntry } from "@/components/transactions/entry-context";
import { categoryLookup } from "@/lib/categories/lookup";
import { fromIsoDay } from "@/lib/dates";
import {
  deleteTransaction,
  deleteTransfer,
  loadTransactions,
  restoreTransaction,
  restoreTransfer,
  type TransactionPage,
} from "@/lib/transactions/actions";
import { hasFilters, type TransactionFilters } from "@/lib/transactions/filters";

// The first page comes from the server; "Load more" appends the next pages.
// After a write the server sends a fresh first page and the appended pages
// are dropped, so the list never shows a stale row.
export function TransactionList({
  filters,
  firstPage,
}: {
  filters: TransactionFilters;
  firstPage: TransactionPage;
}) {
  const t = useTranslations("transactions");
  const tError = useTranslations("errors");
  const [more, setMore] = useState<{ base: TransactionPage; pages: TransactionPage[] }>({
    base: firstPage,
    pages: [],
  });
  const [loading, startLoading] = useTransition();
  // Derived reset: a new first page from the server replaces appended pages.
  const pages = more.base === firstPage ? more.pages : [];
  if (more.base !== firstPage) setMore({ base: firstPage, pages: [] });

  const seen = new Set<string>();
  const items = [firstPage, ...pages]
    .flatMap((page) => page.items)
    .filter((item) => !seen.has(item.id) && seen.add(item.id));
  const nextCursor = (pages.at(-1) ?? firstPage).nextCursor;

  function loadMore() {
    if (!nextCursor) return;
    startLoading(async () => {
      const result = await loadTransactions(filters, nextCursor);
      if (!result.ok) {
        toast.error(tError(result.error));
        return;
      }
      setMore((current) => ({ base: current.base, pages: [...current.pages, result.data] }));
    });
  }

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {hasFilters(filters) ? t("emptyFiltered") : t("empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DayGroups items={items} />
      {nextCursor && (
        <Button variant="outline" onClick={loadMore} disabled={loading} className="self-center">
          {loading ? t("loading") : t("loadMore")}
        </Button>
      )}
    </div>
  );
}

function DayGroups({ items }: { items: Transaction[] }) {
  const format = useFormatter();
  const days = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    for (const item of items)
      byDay.set(item.occurredOn, [...(byDay.get(item.occurredOn) ?? []), item]);
    return [...byDay];
  }, [items]);
  // Both legs of each loaded transfer, so Duplicate knows both accounts.
  const legsByTransfer = useMemo(() => {
    const legs = new Map<string, Transaction[]>();
    for (const item of items)
      if (item.transferId) legs.set(item.transferId, [...(legs.get(item.transferId) ?? []), item]);
    return legs;
  }, [items]);
  return days.map(([day, dayItems]) => (
    <section key={day} aria-labelledby={`day-${day}`}>
      <h2 id={`day-${day}`} className="pb-1 text-xs font-medium text-muted-foreground uppercase">
        {format.dateTime(fromIsoDay(day), { dateStyle: "full" })}
      </h2>
      <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
        {dayItems.map((item) => (
          <TransactionRow
            key={item.id}
            transaction={item}
            legs={item.transferId ? legsByTransfer.get(item.transferId) : undefined}
          />
        ))}
      </ul>
    </section>
  ));
}

// A short list of transactions outside the day groups (dashboard), each row
// with its date.
export function RecentTransactionList({ items, label }: { items: Transaction[]; label: string }) {
  return (
    <ul aria-label={label} className="divide-y">
      {items.map((item) => (
        <TransactionRow key={item.id} transaction={item} showDate />
      ))}
    </ul>
  );
}

function TransactionRow({
  transaction,
  legs,
  showDate = false,
}: {
  transaction: Transaction;
  legs?: Transaction[] | undefined;
  showDate?: boolean;
}) {
  const t = useTranslations("transactions");
  const format = useFormatter();
  const tError = useTranslations("errors");
  const locale = useLocale();
  const { options, openEdit, openDuplicate } = useEntry();
  const isTransfer = transaction.transferId !== null;

  const account = options.accounts.find((a) => a.id === transaction.accountId)?.label;
  const category = useMemo(
    () => categoryLookup(options.categoryGroups)(transaction.categoryId),
    [options.categoryGroups, transaction.categoryId],
  );
  const detail = isTransfer ? t("transfer") : (category?.label ?? t("uncategorized"));

  async function duplicate() {
    const { transferId } = transaction;
    if (!transferId) {
      openDuplicate(draftFromTransaction(transaction));
      return;
    }
    let known = legs ?? [transaction];
    // The other leg may be filtered out or on a page not loaded yet.
    if (known.length < 2) {
      const result = await loadTransactions(
        {
          from: transaction.occurredOn,
          to: transaction.occurredOn,
          direction: transaction.direction === "transfer_out" ? "transfer_in" : "transfer_out",
        },
        null,
      );
      if (!result.ok) {
        toast.error(tError(result.error));
        return;
      }
      known = [...known, ...result.data.items.filter((item) => item.transferId === transferId)];
    }
    openDuplicate(draftFromTransferLegs(known));
  }

  async function remove() {
    const { transferId } = transaction;
    const result = transferId
      ? await deleteTransfer(transferId)
      : await deleteTransaction(transaction.id);
    if (!result.ok) {
      toast.error(tError(result.error));
      return;
    }
    toast(transferId ? t("transferDeleted") : t("deleted"), {
      description: transaction.name,
      // Long enough to reach for Undo.
      duration: 8000,
      action: {
        label: t("undo"),
        onClick: async () => {
          const restored = transferId
            ? await restoreTransfer(transferId)
            : await restoreTransaction(transaction.id);
          if (restored.ok) toast.success(t("restored"));
          else toast.error(tError(restored.error));
        },
      },
    });
  }

  const summary = (
    <>
      {isTransfer ? (
        <IconChip color={NO_CATEGORY_COLOR}>
          <ArrowLeftRightIcon />
        </IconChip>
      ) : (
        <CategoryChip color={category?.color ?? null} icon={category?.icon ?? null} />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{transaction.name}</span>
        <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {showDate && (
            <span>
              {format.dateTime(fromIsoDay(transaction.occurredOn), { dateStyle: "medium" })}
            </span>
          )}
          {showDate && <span aria-hidden>·</span>}
          <span>{detail}</span>
          {account && <span aria-hidden>·</span>}
          {account && <span>{account}</span>}
          {transaction.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </span>
      </span>
      <Money
        amountMinor={transaction.amountMinor}
        direction={transaction.direction}
        locale={locale}
        className={
          transaction.direction === "income" ? "text-emerald-600 dark:text-emerald-400" : undefined
        }
      />
    </>
  );

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      {isTransfer ? (
        // Transfers have no edit form yet (no transfers.update): not clickable.
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-1 py-1">
          {summary}
        </div>
      ) : (
        <Button
          variant="ghost"
          className="h-auto min-w-0 flex-1 justify-between gap-3 px-1 py-1 text-left font-normal"
          onClick={() => openEdit(transaction)}
        >
          {summary}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("actions", { name: transaction.name })}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {!isTransfer && (
            <DropdownMenuItem onClick={() => openEdit(transaction)}>
              <PencilIcon />
              {t("edit")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => void duplicate()}>
            <CopyIcon />
            {t("duplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => void remove()}>
            <Trash2Icon />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
