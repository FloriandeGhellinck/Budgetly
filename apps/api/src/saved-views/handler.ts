import { authed } from "../orpc.ts";
import { deleteSavedView, insertSavedView, listSavedViews, updateSavedView } from "./repo.ts";

const NOT_FOUND = {
  message: "No saved view with this id for the caller. List them with savedViews.list.",
  data: { entity: "saved_view" as const },
};

export const list = authed.savedViews.list.handler(async ({ context }) => ({
  items: await listSavedViews(context.tx, context.userId),
}));

export const create = authed.savedViews.create.handler(({ input, context }) =>
  insertSavedView(context.tx, context.userId, input),
);

export const update = authed.savedViews.update.handler(async ({ input, context, errors }) => {
  const { id, ...patch } = input;
  const view = await updateSavedView(context.tx, context.userId, id, patch);
  if (!view) throw errors.NOT_FOUND(NOT_FOUND);
  return view;
});

const del = authed.savedViews.delete.handler(async ({ input, context, errors }) => {
  if (!(await deleteSavedView(context.tx, context.userId, input.id))) {
    throw errors.NOT_FOUND(NOT_FOUND);
  }
  return { id: input.id };
});

export const savedViewsRouter = { list, create, update, delete: del };
