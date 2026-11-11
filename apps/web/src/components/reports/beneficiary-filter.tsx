"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@budgetly/ui/components/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import type { Option } from "@/lib/entry-options";

const ALL = "all";

// "For whom" on the breakdown (ADR 0010): a URL param, so the filtered view
// can be bookmarked and the server renders it.
export function BeneficiaryFilter({
  value,
  beneficiaries,
}: {
  value: string | undefined;
  beneficiaries: Option[];
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const items = [
    { value: ALL, label: t("everyone") },
    ...beneficiaries.map((b) => ({ value: b.id, label: b.label })),
  ];

  function select(next: string | null) {
    const params = new URLSearchParams(searchParams);
    if (next && next !== ALL) params.set("beneficiaryId", next);
    else params.delete("beneficiaryId");
    const query = params.toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }),
    );
  }

  return (
    <Select items={items} value={value ?? ALL} onValueChange={select}>
      <SelectTrigger aria-label={t("forWhom")} aria-busy={pending} className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
