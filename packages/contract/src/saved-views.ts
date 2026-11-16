import { z } from "zod";
import { AnalysisView } from "./analysis";
import { EXAMPLE_IDS, Id, Timestamp } from "./common";
import { errors } from "./errors";
import { procedure } from "./procedure";

// A saved view's name: what its tab shows.
export const SavedViewName = z.string().trim().min(1).max(100);

export const SavedViewSchema = z.object({
  id: Id,
  name: z.string(),
  // this_month, spending_per_month or income_per_month on the starter views;
  // cleared on rename.
  seedKey: z.string().nullable(),
  view: AnalysisView,
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type SavedView = z.infer<typeof SavedViewSchema>;

const VIEW_HELP =
  'view is an Analysis view: types (income, spending, saving), groupIds, categoryIds, beneficiaryIds, accountIds, tagIds, text, period ({ kind: "relative", preset } with preset this-month, last-month, last-3-months, last-12-months, year-to-date or last-year, which moves with time; or { kind: "fixed", from, to } in YYYY-MM-DD), groupBy (group, category, month, beneficiary, account, tag), display (donut or bars) and compare (previous-period or last-year). Omitted fields take their defaults. Get its figures with reports.analysis after resolving the period to dates.';

const EXAMPLE_VIEW = {
  types: ["spending" as const],
  period: { kind: "relative" as const, preset: "last-12-months" as const },
  groupBy: "month" as const,
  display: "bars" as const,
  compare: "last-year" as const,
};

const list = procedure({
  description: `List the caller's saved views in tab order: named Analysis views kept as tabs on the Analysis page. New users start with three (seedKey this_month, spending_per_month, income_per_month) they may edit or delete. Each view is returned complete, defaults filled in. ${VIEW_HELP}`,
  examples: [{}],
  readOnly: true,
  idempotent: true,
  input: z.object({}),
  output: z.object({ items: z.array(SavedViewSchema) }),
  errors: {},
});

const create = procedure({
  description: `Save an Analysis view under a name, as the last tab. Names need not be unique; check savedViews.list first to avoid a duplicate. ${VIEW_HELP}`,
  examples: [
    { name: "Groceries per month", view: { ...EXAMPLE_VIEW, categoryIds: [EXAMPLE_IDS.category] } },
    { name: "This month", view: {} },
  ],
  readOnly: false,
  idempotent: false,
  input: z.object({ name: SavedViewName, view: AnalysisView }),
  output: SavedViewSchema,
  errors: {},
});

const update = procedure({
  description: `Rename a saved view, replace its view, or both; only the fields passed change, and view is replaced whole. Renaming a starter view clears its seedKey, so the UI shows the new name instead of a translation. Unknown id: NOT_FOUND. ${VIEW_HELP}`,
  examples: [
    { id: EXAMPLE_IDS.savedView, name: "Spending this year" },
    { id: EXAMPLE_IDS.savedView, view: EXAMPLE_VIEW },
  ],
  readOnly: false,
  idempotent: true,
  input: z.object({ id: Id, name: SavedViewName.optional(), view: AnalysisView.optional() }),
  output: SavedViewSchema,
  errors: errors("NOT_FOUND"),
});

const del = procedure({
  description:
    "Delete a saved view. Starter views can be deleted too and never come back. Unknown id: NOT_FOUND.",
  examples: [{ id: EXAMPLE_IDS.savedView }],
  readOnly: false,
  idempotent: false,
  input: z.object({ id: Id }),
  output: z.object({ id: Id }),
  errors: errors("NOT_FOUND"),
});

export const savedViewsContract = { list, create, update, delete: del };
