import { authed } from "../orpc.ts";
import { insertAccount, listAccounts, setAccountArchived, updateAccount } from "./repo.ts";

const notFound = "No account with this id for the caller. List accounts with accounts.list.";

export const list = authed.accounts.list.handler(async ({ input, context }) => ({
  items: await listAccounts(context.tx, context.userId, input),
}));

export const create = authed.accounts.create.handler(({ input, context }) =>
  insertAccount(context.tx, context.userId, input),
);

export const update = authed.accounts.update.handler(async ({ input, context, errors }) => {
  const { id, ...patch } = input;
  const account = await updateAccount(context.tx, context.userId, id, patch);
  if (!account) throw errors.NOT_FOUND({ message: notFound, data: { entity: "account" } });
  return account;
});

export const archive = authed.accounts.archive.handler(async ({ input, context, errors }) => {
  const account = await setAccountArchived(context.tx, context.userId, input.id, true);
  if (!account) throw errors.NOT_FOUND({ message: notFound, data: { entity: "account" } });
  return account;
});

export const unarchive = authed.accounts.unarchive.handler(async ({ input, context, errors }) => {
  const account = await setAccountArchived(context.tx, context.userId, input.id, false);
  if (!account) throw errors.NOT_FOUND({ message: notFound, data: { entity: "account" } });
  return account;
});
