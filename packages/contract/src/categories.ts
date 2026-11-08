import { z } from "zod";
import { EXAMPLE_IDS, Id, Name } from "./common";
import { errors } from "./errors";
import { procedure } from "./procedure";

export const CategorySchema = z.object({
  id: Id,
  groupId: Id,
  // Copied from the group: an expense category only classifies expenses.
  direction: z.enum(["expense", "income"]),
  name: z.string(),
  sortOrder: z.int(),
  // Set on defaults created at sign-up (e.g. "groceries"); cleared on rename.
  seedKey: z.string().nullable(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CategoryGroupSchema = z.object({
  id: Id,
  name: z.string(),
  direction: z.enum(["expense", "income"]),
  // spending vs saving splits expenses (ADR 0004); null on income groups.
  kind: z.enum(["spending", "saving"]).nullable(),
  sortOrder: z.int(),
  seedKey: z.string().nullable(),
  categories: z.array(CategorySchema),
});
export type CategoryGroup = z.infer<typeof CategoryGroupSchema>;

const list = procedure({
  description:
    "List the caller's category groups, each with its categories, in display order. A category classifies what a transaction is for; its direction (expense or income) must match the transaction's. Expense groups have a kind: spending or saving (money set aside, e.g. Investment). seedKey identifies an untouched default (e.g. groceries, salary) whatever the UI language.",
  examples: [{}],
  readOnly: true,
  idempotent: true,
  input: z.object({}),
  output: z.object({ groups: z.array(CategoryGroupSchema) }),
  errors: {},
});

const create = procedure({
  description:
    "Create a category inside an existing group (groupId from categories.list). It takes the group's direction. Check categories.list first: reuse an existing category rather than creating a near-duplicate.",
  examples: [{ groupId: EXAMPLE_IDS.group, name: "Pets" }],
  readOnly: false,
  idempotent: false,
  input: z.object({ groupId: Id, name: Name }),
  output: CategorySchema,
  errors: errors("NOT_FOUND"),
});

const update = procedure({
  description:
    "Rename a category, move it to another group of the same direction, or change its position. Only the fields you pass change. Renaming a default category clears its seedKey, so the UI shows the new name instead of a translation. Moving it to a group of the other direction is refused (CATEGORY_DIRECTION_MISMATCH).",
  examples: [
    { id: EXAMPLE_IDS.category, name: "Supermarket" },
    { id: EXAMPLE_IDS.category, groupId: EXAMPLE_IDS.group },
  ],
  readOnly: false,
  idempotent: true,
  input: z.object({
    id: Id,
    name: Name.optional(),
    groupId: Id.optional(),
    sortOrder: z.int().min(0).optional(),
  }),
  output: CategorySchema,
  errors: errors("NOT_FOUND", "CATEGORY_DIRECTION_MISMATCH"),
});

const del = procedure({
  description:
    "Delete a category no transaction uses. A category still used by any transaction, deleted ones included, is refused with CATEGORY_IN_USE: move those transactions first (transactions.update), or rename the category instead. There is no archive for categories (ADR 0027).",
  examples: [{ id: EXAMPLE_IDS.category }],
  readOnly: false,
  idempotent: false,
  input: z.object({ id: Id }),
  output: z.object({ id: Id }),
  errors: errors("NOT_FOUND", "CATEGORY_IN_USE"),
});

export const categoriesContract = { list, create, update, delete: del };
