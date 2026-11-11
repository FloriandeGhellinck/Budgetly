import { z } from "zod";
import { CategoryColor, CategoryIcon } from "./appearance";
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
  // Null wears the group's colour or icon.
  color: CategoryColor.nullable(),
  icon: CategoryIcon.nullable(),
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
  color: CategoryColor,
  icon: CategoryIcon,
  categories: z.array(CategorySchema),
});
export type CategoryGroup = z.infer<typeof CategoryGroupSchema>;

const list = procedure({
  description:
    "List the caller's category groups, each with its categories, in display order. A category classifies what a transaction is for; its direction (expense or income) must match the transaction's. Expense groups have a kind: spending or saving (money set aside, e.g. Investment). seedKey identifies an untouched default (e.g. groceries, salary) whatever the UI language. Each group has a color (palette token) and an icon (lucide name); a category's null color or icon means it wears its group's.",
  examples: [{}],
  readOnly: true,
  idempotent: true,
  input: z.object({}),
  output: z.object({ groups: z.array(CategoryGroupSchema) }),
  errors: {},
});

const create = procedure({
  description:
    "Create a category inside an existing group (groupId from categories.list). It takes the group's direction. color and icon are optional (see the allowed values in the input schema); left out, the category wears its group's. Check categories.list first: reuse an existing category rather than creating a near-duplicate.",
  examples: [
    { groupId: EXAMPLE_IDS.group, name: "Pets" },
    { groupId: EXAMPLE_IDS.group, name: "Pets", icon: "paw-print", color: "amber" },
  ],
  readOnly: false,
  idempotent: false,
  input: z.object({
    groupId: Id,
    name: Name,
    color: CategoryColor.optional(),
    icon: CategoryIcon.optional(),
  }),
  output: CategorySchema,
  errors: errors("NOT_FOUND"),
});

const update = procedure({
  description:
    "Rename a category, move it to another group of the same direction, change its position, color or icon. Only the fields you pass change; color or icon null goes back to the group's. Changing color or icon keeps the seedKey. Renaming a default category clears its seedKey, so the UI shows the new name instead of a translation. Moving it to a group of the other direction is refused (CATEGORY_DIRECTION_MISMATCH).",
  examples: [
    { id: EXAMPLE_IDS.category, name: "Supermarket" },
    { id: EXAMPLE_IDS.category, groupId: EXAMPLE_IDS.group },
    { id: EXAMPLE_IDS.category, icon: "shopping-basket", color: null },
  ],
  readOnly: false,
  idempotent: true,
  input: z.object({
    id: Id,
    name: Name.optional(),
    groupId: Id.optional(),
    sortOrder: z.int().min(0).optional(),
    color: CategoryColor.nullable().optional(),
    icon: CategoryIcon.nullable().optional(),
  }),
  output: CategorySchema,
  errors: errors("NOT_FOUND", "CATEGORY_DIRECTION_MISMATCH"),
});

const updateGroup = procedure({
  description:
    "Change a category group's color (palette token) or icon (lucide name); groupId from categories.list. Only the fields you pass change. Categories without their own color or icon follow the group. Returns the group with its categories.",
  examples: [{ id: EXAMPLE_IDS.group, color: "teal", icon: "house" }],
  readOnly: false,
  idempotent: true,
  input: z.object({
    id: Id,
    color: CategoryColor.optional(),
    icon: CategoryIcon.optional(),
  }),
  output: CategoryGroupSchema,
  errors: errors("NOT_FOUND"),
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

export const categoriesContract = { list, create, update, updateGroup, delete: del };
