import { z } from "zod";
import { Id, IsoDate } from "./common";

// The Analysis view (CONTEXT.md): what the Analysis page shows, as data. The
// web keeps it in the URL today; saved views will store this same object, and
// agents can build one and turn it into a reports.analysis call with
// `resolvePeriod` and `comparisonRange`.

// Report figures a view can count (CONTEXT.md "Spending / Saving / Income").
export const ANALYSIS_TYPES = ["income", "spending", "saving"] as const;
export const AnalysisType = z.enum(ANALYSIS_TYPES);
export type AnalysisType = z.infer<typeof AnalysisType>;

export const ANALYSIS_GROUP_BYS = [
  "group",
  "category",
  "month",
  "beneficiary",
  "account",
  "tag",
] as const;
export const AnalysisGroupBy = z.enum(ANALYSIS_GROUP_BYS);
export type AnalysisGroupBy = z.infer<typeof AnalysisGroupBy>;

// Periods that move with time, resolved against today in whole months.
export const ANALYSIS_PRESETS = [
  "this-month",
  "last-month",
  "last-3-months",
  "last-12-months",
  "year-to-date",
  "last-year",
] as const;
export const AnalysisPreset = z.enum(ANALYSIS_PRESETS);
export type AnalysisPreset = z.infer<typeof AnalysisPreset>;

export const AnalysisPeriod = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("relative"), preset: AnalysisPreset }),
  z
    .object({ kind: z.literal("fixed"), from: IsoDate, to: IsoDate })
    .refine((p) => p.from <= p.to, { message: "from must not be after to", path: ["to"] }),
]);
export type AnalysisPeriod = z.infer<typeof AnalysisPeriod>;

export const ANALYSIS_COMPARE = ["previous-period", "last-year"] as const;
export const AnalysisCompare = z.enum(ANALYSIS_COMPARE);
export type AnalysisCompare = z.infer<typeof AnalysisCompare>;

export const ANALYSIS_DISPLAYS = ["donut", "bars"] as const;
export const AnalysisDisplay = z.enum(ANALYSIS_DISPLAYS);
export type AnalysisDisplay = z.infer<typeof AnalysisDisplay>;

export const ANALYSIS_DEFAULT_TYPES: readonly AnalysisType[] = ["spending", "saving"];

const ids = z.array(Id).max(200);

// Which transactions count. Values inside one list are OR, lists are AND;
// an empty list does not filter.
export const AnalysisFilters = z.object({
  types: z
    .array(AnalysisType)
    .min(1)
    .default([...ANALYSIS_DEFAULT_TYPES]),
  groupIds: ids.default([]),
  categoryIds: ids.default([]),
  beneficiaryIds: ids.default([]),
  accountIds: ids.default([]),
  tagIds: ids.default([]),
  // Case-insensitive substring of the transaction's name or note.
  text: z.string().trim().min(1).max(200).optional(),
});
export type AnalysisFilters = z.infer<typeof AnalysisFilters>;

export const AnalysisView = AnalysisFilters.extend({
  period: AnalysisPeriod.default({ kind: "relative", preset: "this-month" }),
  groupBy: AnalysisGroupBy.default("group"),
  display: AnalysisDisplay.default("donut"),
  compare: AnalysisCompare.default("previous-period"),
});
export type AnalysisView = z.infer<typeof AnalysisView>;

// A view stored earlier (a saved view's JSON), read leniently: each field that
// no longer parses falls back to its default, so a schema change or a bad
// row never makes the view unreadable. Ids are kept as they are; one that
// points at a deleted row simply matches nothing.
export function parseStoredView(value: unknown): AnalysisView {
  const stored = typeof value === "object" && value !== null ? value : {};
  const fields = Object.fromEntries(
    Object.entries(AnalysisView.shape).flatMap(([key, schema]) => {
      const parsed = schema.safeParse((stored as Record<string, unknown>)[key]);
      return parsed.success && parsed.data !== undefined ? [[key, parsed.data]] : [];
    }),
  );
  return AnalysisView.parse(fields);
}

export type DayRange = { from: string; to: string };

// Day arithmetic on `YYYY-MM-DD` strings in UTC, so no time zone shifts a day.
function toDate(day: string): Date {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}
function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}
// The first and last day of the month `delta` months after the one `day` is in.
function monthBounds(day: string, delta: number): DayRange {
  const date = toDate(day);
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return { from: toDay(first), to: toDay(last) };
}
function addDays(day: string, delta: number): string {
  const date = toDate(day);
  date.setUTCDate(date.getUTCDate() + delta);
  return toDay(date);
}
// The same day `delta` months away, clamped to the month's last day (29 Feb → 28 Feb).
function addMonths(day: string, delta: number): string {
  const date = toDate(day);
  const year = date.getUTCFullYear();
  const target = date.getUTCMonth() + delta;
  const max = daysInMonth(year, target);
  return toDay(new Date(Date.UTC(year, target, Math.min(date.getUTCDate(), max))));
}

// Whole months from `from`'s first to `to`'s last day: the count, else null.
function wholeMonths(range: DayRange): number | null {
  const from = toDate(range.from);
  const to = toDate(range.to);
  const isLast = to.getUTCDate() === daysInMonth(to.getUTCFullYear(), to.getUTCMonth());
  if (from.getUTCDate() !== 1 || !isLast) return null;
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth() + 1
  );
}

// The days a period covers on `today` (the user's calendar day, YYYY-MM-DD).
export function resolvePeriod(period: AnalysisPeriod, today: string): DayRange {
  if (period.kind === "fixed") return { from: period.from, to: period.to };
  const span = (startDelta: number, endDelta: number) => ({
    from: monthBounds(today, startDelta).from,
    to: monthBounds(today, endDelta).to,
  });
  const month = toDate(today).getUTCMonth();
  switch (period.preset) {
    case "this-month":
      return span(0, 0);
    case "last-month":
      return span(-1, -1);
    case "last-3-months":
      return span(-2, 0);
    case "last-12-months":
      return span(-11, 0);
    case "year-to-date":
      return span(-month, 0);
    case "last-year":
      return span(-month - 12, -month - 1);
  }
}

// The range a period is compared with. Previous period: the same number of
// whole months just before when the range is whole months (October for
// November), else the same number of days. Last year: the same days a year
// earlier, month ends kept (February 2024 → February 2023).
export function comparisonRange(range: DayRange, compare: AnalysisCompare): DayRange {
  const months = wholeMonths(range);
  if (compare === "last-year") {
    if (months !== null) {
      return { from: addMonths(range.from, -12), to: monthBounds(range.to, -12).to };
    }
    return { from: addMonths(range.from, -12), to: addMonths(range.to, -12) };
  }
  if (months !== null) {
    return { from: monthBounds(range.from, -months).from, to: addDays(range.from, -1) };
  }
  const length = Math.round((toDate(range.to).getTime() - toDate(range.from).getTime()) / 86400000);
  const to = addDays(range.from, -1);
  return { from: addDays(to, -length), to };
}
