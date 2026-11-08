"use client";

import { DIRECTIONS } from "@expense/contract";
import { Button } from "@expense/ui/components/button";
import { Input } from "@expense/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@expense/ui/components/select";
import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useEntry } from "@/components/transactions/entry-context";
import {
  type FilterKey,
  filtersToSearch,
  hasFilters,
  type TransactionFilters,
  withFilter,
} from "@/lib/transactions/filters";

const ALL = "all";
const SEARCH_DELAY_MS = 300;

// Every filter is a URL search param: changing one navigates, the server
// renders the matching first page.
export function FilterBar({ filters }: { filters: TransactionFilters }) {
  const t = useTranslations("transactions.filters");
  const tDirection = useTranslations("directions");
  const { options } = useEntry();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(filters.text ?? "");

  function navigate(next: TransactionFilters) {
    startTransition(() => router.replace(`${pathname}${filtersToSearch(next)}`, { scroll: false }));
  }
  const set = (key: FilterKey, value: string | null | undefined) =>
    navigate(withFilter(filters, key, value && value !== ALL ? value : undefined));

  // Typing waits for a pause before it filters.
  useEffect(() => {
    if (text.trim() === (filters.text ?? "")) return;
    const timer = setTimeout(() => set("text", text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  });

  const directionItems = [
    { value: ALL, label: t("all") },
    ...DIRECTIONS.map((value) => ({ value, label: tDirection(value) })),
  ];
  const accountItems = [
    { value: ALL, label: t("all") },
    ...options.accounts.map((a) => ({ value: a.id, label: a.label })),
  ];
  const categoryItems = [
    { value: ALL, label: t("all") },
    ...options.categoryGroups.flatMap((g) =>
      g.categories.map((c) => ({ value: c.id, label: c.label })),
    ),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4" aria-busy={pending}>
      <div className="relative min-w-48 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("search")}
          placeholder={t("searchPlaceholder")}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="pl-8"
        />
      </div>
      <Select
        items={directionItems}
        value={filters.direction ?? ALL}
        onValueChange={(v: string | null) => set("direction", v)}
      >
        <SelectTrigger aria-label={t("direction")} className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {directionItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        items={accountItems}
        value={filters.accountId ?? ALL}
        onValueChange={(v: string | null) => set("accountId", v)}
      >
        <SelectTrigger aria-label={t("account")} className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {accountItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        items={categoryItems}
        value={filters.categoryId ?? ALL}
        onValueChange={(v: string | null) => set("categoryId", v)}
      >
        <SelectTrigger aria-label={t("category")} className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("all")}</SelectItem>
          {options.categoryGroups.map((group) => (
            <SelectGroup key={group.id}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        aria-label={t("from")}
        value={filters.from ?? ""}
        onChange={(event) => set("from", event.target.value)}
        className="w-auto"
      />
      <Input
        type="date"
        aria-label={t("to")}
        value={filters.to ?? ""}
        onChange={(event) => set("to", event.target.value)}
        className="w-auto"
      />
      {hasFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setText("");
            navigate({});
          }}
        >
          <XIcon />
          {t("clear")}
        </Button>
      )}
    </div>
  );
}
