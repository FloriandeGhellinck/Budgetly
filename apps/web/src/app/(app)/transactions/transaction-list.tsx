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
import { Money } from "@budgetly/ui/components/money";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useEntry } from "@/components/transactions/entry-context";
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
  return days.map(([day, dayItems]) => (
    <section key={day} aria-labelledby={`day-${day}`}>
      <h2 id={`day-${day}`} className="pb-1 text-xs font-medium text-muted-foreground uppercase">
        {format.dateTime(fromIsoDay(day), { dateStyle: "full" })}
      </h2>
      <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
        {dayItems.map((item) => (
          <TransactionRow key={item.id} transaction={item} />
        ))}
      </ul>
    </section>
  ));
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const t = useTranslations("transactions");
  const tError = useTranslations("errors");
  const locale = useLocale();
  const { options, openEdit } = useEntry();
  const isTransfer = transaction.transferId !== null;

  const account = options.accounts.find((a) => a.id === transaction.accountId)?.label;
  const category = useMemo(() => {
    for (const group of options.categoryGroups) {
      const found = group.categories.find((c) => c.id === transaction.categoryId);
      if (found) return found.label;
    }
    return null;
  }, [options.categoryGroups, transaction.categoryId]);
  const detail = isTransfer ? t("transfer") : (category ?? t("uncategorized"));

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
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{transaction.name}</span>
        <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
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
          <DropdownMenuItem variant="destructive" onClick={() => void remove()}>
            <Trash2Icon />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
