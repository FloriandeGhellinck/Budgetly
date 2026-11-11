import { authed } from "../orpc.ts";
import { onConstraint } from "../pg-errors.ts";
import {
  deleteCategory,
  insertCategory,
  listCategoryGroups,
  updateCategory,
  updateCategoryGroup,
} from "./repo.ts";

const categoryNotFound = {
  message: "No category with this id for the caller. List categories with categories.list.",
  data: { entity: "category" as const },
};
const groupNotFound = {
  message: "No category group with this id for the caller. List groups with categories.list.",
  data: { entity: "category_group" as const },
};

export const list = authed.categories.list.handler(async ({ context }) => ({
  groups: await listCategoryGroups(context.tx, context.userId),
}));

export const create = authed.categories.create.handler(async ({ input, context, errors }) => {
  const result = await insertCategory(context.tx, context.userId, input);
  if (result === "group_not_found") throw errors.NOT_FOUND(groupNotFound);
  return result;
});

export const update = authed.categories.update.handler(async ({ input, context, errors }) => {
  const { id, ...patch } = input;
  const result = await updateCategory(context.tx, context.userId, id, patch);
  switch (result) {
    case "not_found":
      throw errors.NOT_FOUND(categoryNotFound);
    case "group_not_found":
      throw errors.NOT_FOUND(groupNotFound);
    case "direction_mismatch":
      throw errors.CATEGORY_DIRECTION_MISMATCH({
        message:
          "The target group has the other direction (expense vs income). Move the category to a group of its own direction.",
      });
    default:
      return result;
  }
});

export const updateGroup = authed.categories.updateGroup.handler(
  async ({ input, context, errors }) => {
    const { id, ...patch } = input;
    const group = await updateCategoryGroup(context.tx, context.userId, id, patch);
    if (!group) throw errors.NOT_FOUND(groupNotFound);
    return group;
  },
);

export const del = authed.categories.delete.handler(async ({ input, context, errors }) => {
  const deleted = await onConstraint(deleteCategory(context.tx, context.userId, input.id), {
    transactions_category_fk: () => errors.CATEGORY_IN_USE(),
  });
  if (!deleted) throw errors.NOT_FOUND(categoryNotFound);
  return { id: input.id };
});

export const categoriesRouter = { list, create, update, updateGroup, delete: del };
