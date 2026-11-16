import type { AnalysisView, CategoryColor, DayRange } from "@budgetly/contract";
import { transactionsHref } from "../transactions/filters";
import { colorByPosition, distinctColors, NONE_COLOR, type SliceColor } from "./colors";
import { analysisHref, drillDown, drilledGroup, transactionFilters } from "./view";

// One row of the analysis, labelled and coloured for display.
export type AnalysisItem = {
  key: string;
  label: string;
  // Months: the axis label ("Nov").
  shortLabel?: string;
  // Categories: their group, when several groups are shown.
  detail?: string;
  // The month in progress.
  badge?: string;
  color: SliceColor;
  totalMinor: number;
  count: number;
  // Groups drill down; the rest open their transactions; none-buckets nothing.
  href?: string;
  action?: "drill" | "transactions";
};

// A row as reports.analysis returns it.
export type AnalysisRow = {
  key: string | null;
  name: string | null;
  color: CategoryColor | null;
  groupId: string | null;
  totalMinor: number;
  count: number;
};

export type ItemContext = {
  view: AnalysisView;
  // The days the view covers.
  range: DayRange;
  // The month in progress (YYYY-MM).
  thisMonth: string;
  // Translated label of a row with a key (stored names of defaults are translated).
  label: (row: AnalysisRow & { key: string }) => string;
  // The label of the bucket without a key (uncategorized, no beneficiary…).
  noneLabel: string;
  month: (key: string) => { label: string; short: string };
  inProgress: string;
  // A group's label, for a category's detail.
  groupLabel: (groupId: string) => string | undefined;
  // Users' own order of beneficiaries, accounts and tags: their colour follows it.
  order: (id: string) => number;
  tagName: (id: string) => string | undefined;
};

// Rows → display items: labels, colours that never repeat side by side
// (ADR 0034), and where a click goes: a group drills down, anything else
// with an id opens its transactions, the none-bucket goes nowhere.
export function analysisItems(rows: readonly AnalysisRow[], context: ItemContext): AnalysisItem[] {
  const { view, range } = context;
  const { groupBy } = view;
  const showGroup = groupBy === "category" && drilledGroup(view) === null;
  const items = rows.map((row): AnalysisItem => {
    const base = { totalMinor: row.totalMinor, count: row.count };
    if (row.key === null) {
      return { ...base, key: "none", label: context.noneLabel, color: NONE_COLOR };
    }
    const key = row.key;
    const link =
      groupBy === "group"
        ? { href: analysisHref(drillDown(view, key)), action: "drill" as const }
        : {
            href: transactionsHref(
              transactionFilters(view, range, { groupBy, key }, context.tagName),
            ),
            action: "transactions" as const,
          };
    if (groupBy === "month") {
      const { label, short } = context.month(key);
      return {
        ...base,
        ...link,
        key,
        label,
        shortLabel: short,
        color: NONE_COLOR,
        ...(key === context.thisMonth ? { badge: context.inProgress } : {}),
      };
    }
    const own = groupBy === "group" || groupBy === "category";
    const detail = showGroup && row.groupId ? context.groupLabel(row.groupId) : undefined;
    return {
      ...base,
      ...link,
      key,
      label: context.label({ ...row, key }),
      ...(detail ? { detail } : {}),
      color: own ? (row.color ?? NONE_COLOR) : colorByPosition(Math.max(context.order(key), 0)),
    };
  });
  return groupBy === "month" ? items : distinctColors(items);
}
