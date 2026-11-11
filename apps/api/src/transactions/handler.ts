import { eq } from "drizzle-orm";
import { transactions } from "@budgetly/db";
import { authed } from "../orpc.ts";
import { onConstraint } from "../pg-errors.ts";
import { decodeCursor, encodeCursor } from "./cursor.ts";
import { notFound, referenceConstraints, referenceError } from "./errors.ts";
import {
  checkReferences,
  findByIdempotencyKey,
  findTransaction,
  insertEntry,
  listTransactions,
  setDeleted,
  updateEntry,
} from "./repo.ts";

export const list = authed.transactions.list.handler(async ({ input, context, errors }) => {
  const { limit, cursor, ...filters } = input;
  const after = cursor === undefined ? null : decodeCursor(cursor);
  if (cursor !== undefined && !after) throw errors.INVALID_CURSOR();
  const page = await listTransactions(context.tx, context.userId, filters, { limit, after });
  const last = page.items.at(-1);
  return {
    items: page.items,
    nextCursor: page.hasMore && last ? encodeCursor(last) : null,
  };
});

export const get = authed.transactions.get.handler(async ({ input, context, errors }) => {
  const transaction = await findTransaction(context.tx, context.userId, input.id);
  if (!transaction) throw notFound(errors, "transaction");
  return transaction;
});

export const create = authed.transactions.create.handler(async ({ input, context, errors }) => {
  const { tx, userId } = context;
  const replay = async () => {
    const original = await findByIdempotencyKey(tx, userId, input.idempotencyKey);
    if (original && original.transferId !== null) throw errors.IDEMPOTENCY_KEY_CONFLICT();
    return original;
  };

  const original = await replay();
  if (original) return original;

  const problem = await checkReferences(tx, userId, {
    accountId: input.accountId,
    category: input.categoryId ? { id: input.categoryId, direction: input.direction } : undefined,
    beneficiaryId: input.beneficiaryId,
  });
  if (problem) throw referenceError(errors, problem);

  const created = await onConstraint(insertEntry(tx, userId, input), referenceConstraints(errors));
  if (created) return created;
  // A concurrent call with the same key committed first: answer with its row.
  const winner = await replay();
  if (!winner) throw new Error("transactions.create: idempotency conflict without a row");
  return winner;
});

export const update = authed.transactions.update.handler(async ({ input, context, errors }) => {
  const { tx, userId } = context;
  const { id, ...patch } = input;
  const current = await findTransaction(tx, userId, id);
  if (!current || current.deletedAt !== null) throw notFound(errors, "transaction");
  if (current.transferId !== null) throw errors.TRANSFER_LEG();

  const direction = patch.direction ?? (current.direction as "expense" | "income");
  const categoryId = patch.categoryId === undefined ? current.categoryId : patch.categoryId;
  const categoryChanges = patch.categoryId !== undefined || direction !== current.direction;
  const problem = await checkReferences(tx, userId, {
    accountId: patch.accountId,
    category: categoryId && categoryChanges ? { id: categoryId, direction } : undefined,
    beneficiaryId: patch.beneficiaryId,
  });
  if (problem) throw referenceError(errors, problem);

  return onConstraint(updateEntry(tx, userId, id, patch), referenceConstraints(errors));
});

export const del = authed.transactions.delete.handler(async ({ input, context, errors }) => {
  const { tx, userId } = context;
  const current = await findTransaction(tx, userId, input.id);
  if (!current) throw notFound(errors, "transaction");
  if (current.transferId !== null) throw errors.TRANSFER_LEG();
  await setDeleted(tx, userId, eq(transactions.id, input.id), true);
  return (await findTransaction(tx, userId, input.id)) ?? current;
});

export const restore = authed.transactions.restore.handler(async ({ input, context, errors }) => {
  const { tx, userId } = context;
  const current = await findTransaction(tx, userId, input.id);
  if (!current) throw notFound(errors, "transaction");
  if (current.transferId !== null) throw errors.TRANSFER_LEG();
  await setDeleted(tx, userId, eq(transactions.id, input.id), false);
  return (await findTransaction(tx, userId, input.id)) ?? current;
});

export const transactionsRouter = { list, get, create, update, delete: del, restore };
