"use client";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type CategoryColor,
  type CategoryIcon,
} from "@budgetly/contract";
import { FieldLegend, FieldSet } from "@budgetly/ui/components/field";
import { Input } from "@budgetly/ui/components/input";
import { paletteVar } from "@budgetly/ui/lib/palette";
import { cn } from "@budgetly/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import type { ActionResult } from "@/lib/action-result";
import { CategoryChip } from "./category-chip";
import { CATEGORY_ICON_COMPONENTS } from "./icons";
import { iconSearchText } from "./icon-search";

export type AppearanceValue = { color: CategoryColor | null; icon: CategoryIcon | null };

// Pick a colour (swatches) and an icon (searchable grid) for a group or a
// category (ADR 0034). With `inherited`, null is offered as "same as the
// group", shown in the group's look. Mount it keyed per target.
export function AppearanceDialog({
  open,
  onOpenChange,
  title,
  name,
  initial,
  inherited,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // What is being styled, shown in the preview.
  name: string;
  initial: AppearanceValue;
  // The group's look, for a category; absent for a group (no null allowed).
  inherited?: { color: CategoryColor; icon: CategoryIcon };
  onSave: (value: AppearanceValue) => Promise<ActionResult<unknown>>;
}) {
  const t = useTranslations("categories");
  const id = useId();
  const [value, setValue] = useState(initial);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const icons = CATEGORY_ICONS.filter((icon) => iconSearchText(icon).includes(needle));
  const shown = {
    color: value.color ?? inherited?.color ?? null,
    icon: value.icon ?? inherited?.icon ?? null,
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      saved={t("saved")}
      onSubmit={() => onSave(value)}
    >
      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
        <CategoryChip color={shown.color} icon={shown.icon} size="lg" />
        <span className="truncate font-medium">{name}</span>
      </div>

      <FieldSet>
        <FieldLegend variant="label">{t("color")}</FieldLegend>
        <div className="flex flex-wrap gap-2">
          {inherited && (
            <Swatch
              name={`${id}-color`}
              label={t("sameAsGroup")}
              color={inherited.color}
              checked={value.color === null}
              onSelect={() => setValue({ ...value, color: null })}
              dashed
            />
          )}
          {CATEGORY_COLORS.map((color) => (
            <Swatch
              key={color}
              name={`${id}-color`}
              label={t(`colors.${color}`)}
              color={color}
              checked={value.color === color}
              onSelect={() => setValue({ ...value, color })}
            />
          ))}
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">{t("icon")}</FieldLegend>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchIcon")}
          aria-label={t("searchIcon")}
          autoComplete="off"
        />
        <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto p-0.5 sm:grid-cols-8">
          {inherited && needle === "" && (
            <IconOption
              name={`${id}-icon`}
              label={t("sameAsGroup")}
              icon={inherited.icon}
              checked={value.icon === null}
              onSelect={() => setValue({ ...value, icon: null })}
              dashed
            />
          )}
          {icons.map((icon) => (
            <IconOption
              key={icon}
              name={`${id}-icon`}
              label={iconSearchText(icon)}
              icon={icon}
              checked={value.icon === icon}
              onSelect={() => setValue({ ...value, icon })}
            />
          ))}
        </div>
        {icons.length === 0 && <p className="text-sm text-muted-foreground">{t("noIcon")}</p>}
      </FieldSet>
    </FormDialog>
  );
}

// A native radio, so arrow keys and screen readers work; the circle is its label.
function Swatch({
  name,
  label,
  color,
  checked,
  onSelect,
  dashed = false,
}: {
  name: string;
  label: string;
  color: CategoryColor;
  checked: boolean;
  onSelect: () => void;
  dashed?: boolean;
}) {
  return (
    <label title={label} className="relative cursor-pointer">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
          dashed && "outline-2 outline-offset-2 outline-muted-foreground outline-dashed",
        )}
        style={{ backgroundColor: paletteVar(color) }}
      >
        {checked && <CheckIcon aria-hidden className="size-4 text-white drop-shadow-sm" />}
      </span>
    </label>
  );
}

function IconOption({
  name,
  label,
  icon,
  checked,
  onSelect,
  dashed = false,
}: {
  name: string;
  label: string;
  icon: CategoryIcon;
  checked: boolean;
  onSelect: () => void;
  dashed?: boolean;
}) {
  const Icon = CATEGORY_ICON_COMPONENTS[icon];
  return (
    <label title={label} className="cursor-pointer">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        className={cn(
          "grid aspect-square place-items-center rounded-lg border text-muted-foreground hover:bg-muted peer-checked:border-foreground peer-checked:bg-muted peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
          dashed && "border-dashed",
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
    </label>
  );
}
