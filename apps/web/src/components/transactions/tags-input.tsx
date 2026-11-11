"use client";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@budgetly/ui/components/combobox";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// Pick existing tags or create one by typing it: the API creates unknown
// names on write, matching case-insensitively (tags contract).
export function TagsInput({
  id,
  known,
  value,
  onValueChange,
}: {
  id: string;
  known: string[];
  value: string[];
  onValueChange: (tags: string[]) => void;
}) {
  const t = useTranslations("entry");
  const anchor = useComboboxAnchor();
  const [query, setQuery] = useState("");

  const typed = query.trim();
  const items = useMemo(() => {
    const all = [...new Set([...known, ...value])];
    const exists = all.some((tag) => tag.toLocaleLowerCase() === typed.toLocaleLowerCase());
    return typed && !exists ? [typed, ...all] : all;
  }, [known, value, typed]);
  const isNew = (tag: string) =>
    !known.some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase());

  return (
    <Combobox
      multiple
      items={items}
      value={value}
      onValueChange={(tags: string[]) => {
        onValueChange(tags);
        setQuery("");
      }}
      inputValue={query}
      onInputValueChange={setQuery}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(tags: string[]) => (
            <>
              {tags.map((tag) => (
                <ComboboxChip key={tag}>{tag}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                placeholder={tags.length === 0 ? t("tagsPlaceholder") : ""}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxList>
          {(tag: string) => (
            <ComboboxItem key={tag} value={tag}>
              {tag === typed && isNew(tag) ? t("createTag", { name: tag }) : tag}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
