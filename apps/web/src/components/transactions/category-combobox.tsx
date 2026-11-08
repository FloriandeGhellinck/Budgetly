"use client";

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@expense/ui/components/combobox";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { CategoryGroupOption, Option } from "@/lib/entry-options";

type Group = { value: string; items: Option[] };

// Categories of one direction, grouped and searchable (Base UI grouped items).
export function CategoryCombobox({
  id,
  groups,
  direction,
  value,
  onValueChange,
}: {
  id: string;
  groups: CategoryGroupOption[];
  direction: "expense" | "income";
  value: string | null;
  onValueChange: (categoryId: string | null) => void;
}) {
  const t = useTranslations("entry");
  const items = useMemo<Group[]>(
    () =>
      groups
        .filter((group) => group.direction === direction && group.categories.length > 0)
        .map((group) => ({ value: group.label, items: group.categories })),
    [groups, direction],
  );
  const selected = useMemo(
    () => items.flatMap((group) => group.items).find((item) => item.id === value) ?? null,
    [items, value],
  );

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(item: Option | null) => onValueChange(item?.id ?? null)}
      itemToStringLabel={(item: Option) => item.label}
      isItemEqualToValue={(a: Option, b: Option) => a.id === b.id}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder={t("categoryPlaceholder")}
        showClear={selected !== null}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("noMatch")}</ComboboxEmpty>
        <ComboboxList>
          {(group: Group) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(item: Option) => (
                  <ComboboxItem key={item.id} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
