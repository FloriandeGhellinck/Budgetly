import {
  ANALYSIS_DEFAULT_TYPES,
  ANALYSIS_TYPES,
  AnalysisCompare,
  AnalysisDisplay,
  AnalysisGroupBy,
  AnalysisPreset,
  type AnalysisType,
  AnalysisView,
  comparisonRange,
  type DayRange,
  Id,
  IsoDate,
  resolvePeriod,
} from "@budgetly/contract";
import { z } from "zod";
import { monthDays } from "../dates";
import type { TransactionFilters } from "../transactions/filters";

// The Analysis view lives in the URL, like the transaction filters (ADR
// 0036): a bookmarkable page the server renders. Lists are comma-separated
// ids; defaults are left out; a bad value is dropped, never an error.

type SearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_VIEW: AnalysisView = AnalysisView.parse({});

const LIST_PARAMS = {
  groupIds: "groups",
  categoryIds: "categories",
  beneficiaryIds: "beneficiaries",
  accountIds: "accounts",
  tagIds: "tags",
} as const;
type ListKey = keyof typeof LIST_PARAMS;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// The valid, distinct entries of a comma-separated list.
function list<T extends string>(raw: string | undefined, schema: z.ZodType<T>): T[] {
  if (!raw) return [];
  const values = raw.split(",").flatMap((part) => {
    const parsed = schema.safeParse(part.trim());
    return parsed.success ? [parsed.data] : [];
  });
  return [...new Set(values)];
}

function option<T>(raw: string | undefined, schema: z.ZodType<T>): T | undefined {
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

// Grouping by month or tag has no meaningful donut (a month is not a share;
// a transaction with two tags would count twice), so those always show bars.
export function donutAllowed(groupBy: AnalysisView["groupBy"]): boolean {
  return groupBy !== "month" && groupBy !== "tag";
}

function normalize(view: AnalysisView): AnalysisView {
  const types = ANALYSIS_TYPES.filter((type) => view.types.includes(type));
  return {
    ...view,
    types: types.length > 0 ? types : [...ANALYSIS_DEFAULT_TYPES],
    display: donutAllowed(view.groupBy) ? view.display : "bars",
  };
}

export function parseAnalysisView(params: SearchParams): AnalysisView {
  const raw = (key: string) => first(params[key]);
  const from = option(raw("from"), IsoDate);
  const to = option(raw("to"), IsoDate);
  const preset = option(raw("period"), AnalysisPreset);
  const period =
    from && to
      ? { kind: "fixed" as const, from: from <= to ? from : to, to: from <= to ? to : from }
      : preset
        ? { kind: "relative" as const, preset }
        : DEFAULT_VIEW.period;
  const text = option(raw("text"), z.string().trim().min(1).max(200));
  const types = list(raw("types"), z.enum(ANALYSIS_TYPES));
  const lists = Object.fromEntries(
    Object.entries(LIST_PARAMS).map(([key, param]) => [key, list(raw(param), Id)]),
  ) as Record<ListKey, string[]>;
  return normalize({
    ...DEFAULT_VIEW,
    ...lists,
    types: types.length > 0 ? types : DEFAULT_VIEW.types,
    ...(text ? { text } : {}),
    period,
    groupBy: option(raw("groupBy"), AnalysisGroupBy) ?? DEFAULT_VIEW.groupBy,
    display: option(raw("display"), AnalysisDisplay) ?? DEFAULT_VIEW.display,
    compare: option(raw("compare"), AnalysisCompare) ?? DEFAULT_VIEW.compare,
  });
}

// Where the page is: the view's state, the saved view (tab) it belongs to, if
// any, and whether the URL carries a state at all. Without one, the page shows
// the saved view's own state (ADR 0037).
export type AnalysisLocation = {
  view: AnalysisView;
  savedViewId?: string;
  hasState: boolean;
};

const SAVED_VIEW_PARAM = "view";

export function parseAnalysisLocation(params: SearchParams): AnalysisLocation {
  const savedViewId = option(first(params[SAVED_VIEW_PARAM]), Id);
  const hasState = Object.keys(params).some((key) => key !== SAVED_VIEW_PARAM);
  return { view: parseAnalysisView(params), ...(savedViewId ? { savedViewId } : {}), hasState };
}

// The Analysis URL for a view, in a stable order, defaults left out. On a
// saved view the period is always written, so the URL keeps a state of its
// own even when it is all defaults (`?view=<id>` alone opens the saved state).
export function analysisHref(view: AnalysisView, savedViewId?: string): string {
  const next = normalize(view);
  const params = new URLSearchParams();
  if (savedViewId) params.set(SAVED_VIEW_PARAM, savedViewId);
  if (next.period.kind === "fixed") {
    params.set("from", next.period.from);
    params.set("to", next.period.to);
  } else if (
    savedViewId ||
    DEFAULT_VIEW.period.kind !== "relative" ||
    next.period.preset !== DEFAULT_VIEW.period.preset
  ) {
    params.set("period", next.period.preset);
  }
  if (next.types.join(",") !== DEFAULT_VIEW.types.join(",")) {
    params.set("types", next.types.join(","));
  }
  for (const [key, param] of Object.entries(LIST_PARAMS)) {
    const ids = next[key as ListKey];
    if (ids.length > 0) params.set(param, ids.join(","));
  }
  if (next.text) params.set("text", next.text);
  if (next.groupBy !== DEFAULT_VIEW.groupBy) params.set("groupBy", next.groupBy);
  if (next.display !== DEFAULT_VIEW.display) params.set("display", next.display);
  if (next.compare !== DEFAULT_VIEW.compare) params.set("compare", next.compare);
  const query = params.toString();
  return query ? `/analysis?${query}` : "/analysis";
}

// Whether two views show the same thing (the draft vs its saved view).
export function sameView(a: AnalysisView, b: AnalysisView): boolean {
  return analysisHref(a) === analysisHref(b);
}

// The ids a user still has, per filter.
export type KnownIds = Record<ListKey, ReadonlySet<string>>;

// A saved view without ids that no longer exist (a deleted category or tag):
// they would match nothing and show as "…" (ADR 0037).
export function pruneView(view: AnalysisView, known: KnownIds): AnalysisView {
  const kept = Object.fromEntries(
    (Object.keys(LIST_PARAMS) as ListKey[]).map((key) => [
      key,
      view[key].filter((id) => known[key].has(id)),
    ]),
  ) as Record<ListKey, string[]>;
  return normalize({ ...view, ...kept });
}

// What a group counts as: income for income groups, else its kind
// (a group without one counts as spending, like uncategorized).
export type GroupTypes = ReadonlyMap<string, AnalysisType>;
export type CategoryGroups = ReadonlyMap<string, string>;

// New types; groups and categories of other types are dropped.
export function withTypes(
  view: AnalysisView,
  types: readonly AnalysisType[],
  groupTypes: GroupTypes,
  categoryGroups: CategoryGroups,
): AnalysisView {
  const keep = (groupId: string | undefined) => {
    const type = groupId ? groupTypes.get(groupId) : undefined;
    return type !== undefined && types.includes(type);
  };
  return normalize({
    ...view,
    types: [...types],
    groupIds: view.groupIds.filter(keep),
    categoryIds: view.categoryIds.filter((id) => keep(categoryGroups.get(id))),
  });
}

// New groups; categories outside them are dropped.
export function withGroups(
  view: AnalysisView,
  groupIds: readonly string[],
  categoryGroups: CategoryGroups,
): AnalysisView {
  return {
    ...view,
    groupIds: [...groupIds],
    categoryIds:
      groupIds.length === 0
        ? view.categoryIds
        : view.categoryIds.filter((id) => groupIds.includes(categoryGroups.get(id) ?? "")),
  };
}

export function withGroupBy(view: AnalysisView, groupBy: AnalysisView["groupBy"]): AnalysisView {
  return normalize({ ...view, groupBy });
}

// Clicking a group: only that group, by category.
export function drillDown(view: AnalysisView, groupId: string): AnalysisView {
  return { ...view, groupIds: [groupId], categoryIds: [], groupBy: "category" };
}

// Back from a group to all groups.
export function drillUp(view: AnalysisView): AnalysisView {
  return { ...view, groupIds: [], categoryIds: [], groupBy: "group" };
}

// The group the view is drilled into, if any.
export function drilledGroup(view: AnalysisView): string | null {
  return view.groupBy === "category" && view.groupIds.length === 1
    ? (view.groupIds[0] ?? null)
    : null;
}

export type AnalysisInput = Omit<AnalysisView, "period" | "display" | "compare"> &
  DayRange & { compare: DayRange };

// The days a view covers today, and the reports.analysis call for it.
export function analysisInput(view: AnalysisView, today: string): AnalysisInput {
  const range = resolvePeriod(view.period, today);
  const { period: _period, display: _display, compare, ...filters } = view;
  return { ...filters, ...range, compare: comparisonRange(range, compare) };
}

// The month of a `YYYY-MM` key inside the range: a month at either end of
// a day-precision period keeps only the days the period covers.
export function monthInRange(month: string, range: DayRange): DayRange {
  const days = monthDays(month);
  return {
    from: days.from < range.from ? range.from : days.from,
    to: days.to > range.to ? range.to : days.to,
  };
}

// The transactions page's filters for a view, narrowed to one item. The list
// takes several groups or categories but one beneficiary, account and tag,
// and a direction: those with several values, and spending without saving
// (or the reverse), are not carried over, so the list shows more than the
// figure.
export function transactionFilters(
  view: AnalysisView,
  range: DayRange,
  item: { groupBy: AnalysisView["groupBy"]; key: string },
  tagName: (id: string) => string | undefined,
): TransactionFilters {
  const one = (ids: readonly string[]) => (ids.length === 1 ? ids[0] : undefined);
  const types = new Set(view.types);
  const direction = !types.has("income") ? "expense" : types.size === 1 ? "income" : undefined;
  const days = item.groupBy === "month" ? monthInRange(item.key, range) : range;
  const tagId = item.groupBy === "tag" ? item.key : one(view.tagIds);
  const many = (ids: readonly string[]) => (ids.length > 1 ? [...ids] : undefined);
  const filters: TransactionFilters = {
    ...days,
    direction,
    groupId: item.groupBy === "group" ? item.key : one(view.groupIds),
    groupIds: item.groupBy === "group" ? undefined : many(view.groupIds),
    categoryId: item.groupBy === "category" ? item.key : one(view.categoryIds),
    categoryIds: item.groupBy === "category" ? undefined : many(view.categoryIds),
    beneficiaryId: item.groupBy === "beneficiary" ? item.key : one(view.beneficiaryIds),
    accountId: item.groupBy === "account" ? item.key : one(view.accountIds),
    tag: tagId ? tagName(tagId) : undefined,
    text: view.text,
  };
  // A category implies its group: keep the narrower one.
  if (filters.categoryId || filters.categoryIds) {
    delete filters.groupId;
    delete filters.groupIds;
  }
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as TransactionFilters;
}
