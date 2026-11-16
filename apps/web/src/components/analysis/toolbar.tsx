"use client";

import {
  ANALYSIS_GROUP_BYS,
  ANALYSIS_PRESETS,
  ANALYSIS_TYPES,
  type AnalysisPeriod,
  type AnalysisType,
  type AnalysisView,
  resolvePeriod,
} from "@budgetly/contract";
import { Button } from "@budgetly/ui/components/button";
import { Checkbox } from "@budgetly/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@budgetly/ui/components/dropdown-menu";
import { FilterChip } from "@budgetly/ui/components/filter-chip";
import { Input } from "@budgetly/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@budgetly/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@budgetly/ui/components/select";
import { ToggleGroup, ToggleGroupItem } from "@budgetly/ui/components/toggle-group";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { useEntry } from "@/components/transactions/entry-context";
import { fromIsoDay } from "@/lib/dates";
import { donutAllowed, withGroupBy, withGroups, withTypes } from "@/lib/analysis/view";
import { useAnalysisNavigation } from "./navigation";

type Extra = "beneficiary" | "account" | "tag" | "text";
type Choice = { id: string; label: string; detail?: string };
type Section = { title?: string; items: Choice[] };

// The Notion-style filter row (period, type, group, category, then the
// optional ones behind "+ Filter") and, beside it, group-by and display.
// Values inside one chip are OR, chips are AND.
export function AnalysisToolbar({
  today,
}: {
  // The user's day (YYYY-MM-DD), to show what each preset covers.
  today: string;
}) {
  const t = useTranslations("analysis");
  const tFigures = useTranslations("dashboard.figures");
  const { options } = useEntry();
  const { view, go } = useAnalysisNavigation();
  const [open, setOpen] = useState<string | null>(null);
  const [added, setAdded] = useState<Extra[]>([]);

  const typeOf = (group: (typeof options.categoryGroups)[number]): AnalysisType =>
    group.direction === "income" ? "income" : (group.kind ?? "spending");
  const groupTypes = new Map(options.categoryGroups.map((g) => [g.id, typeOf(g)]));
  const categoryGroups = new Map(
    options.categoryGroups.flatMap((g) => g.categories.map((c) => [c.id, g.id] as const)),
  );
  const groupsInTypes = options.categoryGroups.filter((g) => view.types.includes(typeOf(g)));
  const groupsInScope = groupsInTypes.filter(
    (g) => view.groupIds.length === 0 || view.groupIds.includes(g.id),
  );

  const extras: Record<Extra, boolean> = {
    beneficiary: view.beneficiaryIds.length > 0,
    account: view.accountIds.length > 0,
    tag: view.tagIds.length > 0,
    text: view.text !== undefined,
  };
  const shown = (extra: Extra) => extras[extra] || added.includes(extra);
  const hidden = (["beneficiary", "account", "tag", "text"] as const).filter((e) => !shown(e));
  const chipProps = (key: string) => ({
    open: open === key,
    onOpenChange: (next: boolean) => setOpen(next ? key : null),
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <fieldset className="flex min-w-0 flex-wrap gap-1.5">
        <legend className="sr-only">{t("filters.label")}</legend>
        <PeriodChip {...chipProps("period")} today={today} />
        <MultiChip
          {...chipProps("type")}
          label={t("filters.type")}
          sections={[
            { items: ANALYSIS_TYPES.map((type) => ({ id: type, label: tFigures(type) })) },
          ]}
          selected={view.types}
          required
          summary={(labels) => labels.join(" + ")}
          hint={t("filters.typeHint")}
          onChange={(types) =>
            go(withTypes(view, types as AnalysisType[], groupTypes, categoryGroups))
          }
        />
        <MultiChip
          {...chipProps("group")}
          label={t("filters.group")}
          sections={[
            {
              items: groupsInTypes.map((g) => ({
                id: g.id,
                label: g.label,
                detail: tFigures(typeOf(g)),
              })),
            },
          ]}
          selected={view.groupIds}
          onChange={(ids) => go(withGroups(view, ids, categoryGroups))}
        />
        <MultiChip
          {...chipProps("category")}
          label={t("filters.category")}
          sections={groupsInScope.map((g) => ({
            title: g.label,
            items: g.categories.map((c) => ({ id: c.id, label: c.label })),
          }))}
          selected={view.categoryIds}
          onChange={(categoryIds) => go({ ...view, categoryIds })}
        />
        {shown("beneficiary") && (
          <MultiChip
            {...chipProps("beneficiary")}
            label={t("filters.beneficiary")}
            sections={[{ items: options.beneficiaries.map((b) => ({ id: b.id, label: b.label })) }]}
            selected={view.beneficiaryIds}
            onChange={(beneficiaryIds) => go({ ...view, beneficiaryIds })}
          />
        )}
        {shown("account") && (
          <MultiChip
            {...chipProps("account")}
            label={t("filters.account")}
            sections={[{ items: options.accounts.map((a) => ({ id: a.id, label: a.label })) }]}
            selected={view.accountIds}
            onChange={(accountIds) => go({ ...view, accountIds })}
          />
        )}
        {shown("tag") && (
          <MultiChip
            {...chipProps("tag")}
            label={t("filters.tag")}
            sections={[{ items: options.tags }]}
            selected={view.tagIds}
            onChange={(tagIds) => go({ ...view, tagIds })}
          />
        )}
        {shown("text") && <TextChip {...chipProps("text")} />}
        {hidden.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <FilterChip
                  label={
                    <span className="flex items-center gap-1">
                      <PlusIcon aria-hidden className="size-3" />
                      {t("filters.add")}
                    </span>
                  }
                  chevron={false}
                />
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("filters.addTitle")}</DropdownMenuLabel>
                {hidden.map((extra) => (
                  <DropdownMenuItem
                    key={extra}
                    onClick={() => {
                      setAdded((list) => [...list, extra]);
                      setOpen(extra);
                    }}
                  >
                    {t(`filters.${extra}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <GroupBySelect />
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          aria-label={t("display")}
          value={[view.display]}
          onValueChange={(value: string[]) => {
            const display = value[0];
            if (display === "donut" || display === "bars") go({ ...view, display });
          }}
        >
          <ToggleGroupItem
            value="donut"
            disabled={!donutAllowed(view.groupBy)}
            title={donutAllowed(view.groupBy) ? undefined : t("donutDisabled")}
          >
            {t("donut")}
          </ToggleGroupItem>
          <ToggleGroupItem value="bars">{t("bars")}</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

function GroupBySelect() {
  const t = useTranslations("analysis");
  const { view, go } = useAnalysisNavigation();
  const items = ANALYSIS_GROUP_BYS.map((value) => ({ value, label: t(`groupBys.${value}`) }));
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      {t("groupBy")}
      <Select
        items={items}
        value={view.groupBy}
        onValueChange={(value: AnalysisView["groupBy"] | null) =>
          value && go(withGroupBy(view, value))
        }
      >
        <SelectTrigger size="sm" className="w-36 text-foreground">
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
    </label>
  );
}

type ChipState = { open: boolean; onOpenChange: (open: boolean) => void };

// "A, B" for one or two values, "A +2" beyond.
function useSummary() {
  const t = useTranslations("analysis.filters");
  return (labels: string[]) =>
    labels.length <= 2
      ? labels.join(", ")
      : t("more", { first: labels[0] ?? "", count: labels.length - 1 });
}

function PeriodChip({ today, ...state }: ChipState & { today: string }) {
  const t = useTranslations("analysis");
  const format = useFormatter();
  const { view, go } = useAnalysisNavigation();
  const id = useId();
  const current = resolvePeriod(view.period, today);
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const range = (p: AnalysisPeriod) => {
    const days = resolvePeriod(p, today);
    return format.dateTimeRange(fromIsoDay(days.from), fromIsoDay(days.to), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const value =
    view.period.kind === "relative" ? t(`presets.${view.period.preset}`) : range(view.period);
  const choose = (period: AnalysisPeriod) => {
    state.onOpenChange(false);
    go({ ...view, period });
  };
  // The toolbar outlives navigation: start from the current period on each open.
  const onOpenChange = (next: boolean) => {
    if (next) {
      setFrom(current.from);
      setTo(current.to);
    }
    state.onOpenChange(next);
  };

  return (
    <Popover open={state.open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<FilterChip label={t("filters.period")} value={value} active />} />
      <PopoverContent align="start" className="w-80 gap-1 p-1.5">
        <SectionTitle>{t("relativeTitle")}</SectionTitle>
        {ANALYSIS_PRESETS.map((preset) => {
          const selected = view.period.kind === "relative" && view.period.preset === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => choose({ kind: "relative", preset })}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <CheckIcon aria-hidden className={selected ? "size-3.5" : "size-3.5 opacity-0"} />
              <span className="flex-1">{t(`presets.${preset}`)}</span>
              <span className="text-xs text-muted-foreground">
                {range({ kind: "relative", preset })}
              </span>
            </button>
          );
        })}
        <div className="my-1 h-px bg-border" />
        <SectionTitle>{t("fixedTitle")}</SectionTitle>
        <form
          className="flex flex-col gap-2 px-2 pb-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!from || !to) return;
            const [start, end] = from <= to ? [from, to] : [to, from];
            choose({ kind: "fixed", from: start, to: end });
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label
              className="flex flex-col gap-1 text-xs text-muted-foreground"
              htmlFor={`${id}-from`}
            >
              {t("from")}
              <Input
                id={`${id}-from`}
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label
              className="flex flex-col gap-1 text-xs text-muted-foreground"
              htmlFor={`${id}-to`}
            >
              {t("to")}
              <Input
                id={`${id}-to`}
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </div>
          <Button type="submit" size="sm" className="self-end">
            {t("filters.apply")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function MultiChip({
  label,
  sections,
  selected,
  onChange,
  required = false,
  hint,
  summary: summarize,
  ...state
}: ChipState & {
  label: string;
  sections: Section[];
  selected: readonly string[];
  onChange: (ids: string[]) => void;
  // At least one value stays checked (types).
  required?: boolean;
  hint?: string;
  // How the chip spells its values; default "A, B" then "A +2".
  summary?: (labels: string[]) => string;
}) {
  const t = useTranslations("analysis.filters");
  const summary = useSummary();
  // Ticks collect in a draft, applied once when the popover closes: one
  // navigation per edit, not one per checkbox.
  const [draft, setDraft] = useState<readonly string[]>(selected);
  const shown = state.open ? draft : selected;
  const all = sections.flatMap((section) => section.items);
  const labels = shown.map((id) => all.find((item) => item.id === id)?.label ?? "…");
  const toggle = (id: string, checked: boolean) => {
    const next = checked ? [...draft, id] : draft.filter((value) => value !== id);
    // Keep the options' order, so the URL and the chip read the same way.
    setDraft(all.map((item) => item.id).filter((value) => next.includes(value)));
  };
  const onOpenChange = (open: boolean) => {
    if (open) setDraft(selected);
    else if (draft.join(",") !== selected.join(",")) onChange([...draft]);
    state.onOpenChange(open);
  };

  return (
    <Popover open={state.open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={<FilterChip label={label} value={(summarize ?? summary)(labels)} />}
      />
      <PopoverContent align="start" className="max-h-[70vh] w-72 gap-0.5 overflow-y-auto p-1.5">
        {all.length === 0 && <p className="px-2 py-1.5 text-muted-foreground">{t("noOptions")}</p>}
        {sections.map((section, index) => (
          <div key={section.title ?? index} className="flex flex-col">
            {section.title && <SectionTitle>{section.title}</SectionTitle>}
            {section.items.map((item) => {
              const checked = draft.includes(item.id);
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    disabled={required && checked && draft.length === 1}
                    onCheckedChange={(value) => toggle(item.id, value)}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.detail && (
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  )}
                </label>
              );
            })}
          </div>
        ))}
        {hint && <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">{hint}</p>}
        {!required && draft.length > 0 && (
          <div className="mt-1 flex justify-end border-t px-1 pt-1.5">
            <Button variant="ghost" size="sm" onClick={() => setDraft([])}>
              {t("clear")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TextChip(state: ChipState) {
  const t = useTranslations("analysis.filters");
  const { view, go } = useAnalysisNavigation();
  const [text, setText] = useState(view.text ?? "");
  const apply = (value: string | undefined) => {
    state.onOpenChange(false);
    const { text: _old, ...rest } = view;
    go(value ? { ...rest, text: value } : rest);
  };
  const onOpenChange = (next: boolean) => {
    if (next) setText(view.text ?? "");
    state.onOpenChange(next);
  };
  return (
    <Popover open={state.open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<FilterChip label={t("text")} value={view.text ?? ""} />} />
      <PopoverContent align="start" className="w-72">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply(text.trim() || undefined);
          }}
        >
          <Input
            type="search"
            aria-label={t("text")}
            placeholder={t("textPlaceholder")}
            value={text}
            maxLength={200}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex justify-end gap-1.5">
            {view.text && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setText("");
                  apply(undefined);
                }}
              >
                {t("clear")}
              </Button>
            )}
            <Button type="submit" size="sm">
              {t("apply")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pt-2 pb-1 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}
