import type { Transaction, Transfer } from "@expense/contract";
import { transactions, type Tx } from "@expense/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { authed } from "../orpc.ts";
import { onConstraint } from "../pg-errors.ts";
import { notFound } from "../transactions/errors.ts";
import {
  checkReferences,
  findByIdempotencyKey,
  findTransferLegs,
  insertLeg,
  setDeleted,
} from "../transactions/repo.ts";

function asTransfer(transferId: string, legs: Transaction[]): Transfer | null {
  const outgoing = legs.find((leg) => leg.direction === "transfer_out");
  const incoming = legs.find((leg) => leg.direction === "transfer_in");
  return outgoing && incoming ? { transferId, outgoing, incoming } : null;
}

async function loadTransfer(tx: Tx, userId: string, transferId: string): Promise<Transfer | null> {
  return asTransfer(transferId, await findTransferLegs(tx, userId, transferId));
}

const transferNotFound = {
  message:
    "No transfer with this id for the caller. transferId is on both legs (transactions.list).",
  data: { entity: "transfer" as const },
};

export const create = authed.transfers.create.handler(async ({ input, context, errors }) => {
  const { tx, userId } = context;
  // The key is stored on the outgoing leg: one key per row (ADR 0027).
  const replay = async () => {
    const original = await findByIdempotencyKey(tx, userId, input.idempotencyKey);
    if (!original) return null;
    const transfer =
      original.direction === "transfer_out" && original.transferId
        ? await loadTransfer(tx, userId, original.transferId)
        : null;
    if (!transfer) throw errors.IDEMPOTENCY_KEY_CONFLICT();
    return transfer;
  };

  const original = await replay();
  if (original) return original;

  if (input.fromAccountId === input.toAccountId) throw errors.TRANSFER_SAME_ACCOUNT();
  for (const accountId of [input.fromAccountId, input.toAccountId]) {
    if (await checkReferences(tx, userId, { accountId })) throw notFound(errors, "account");
  }

  const transferId = randomUUID();
  const common = {
    transferId,
    occurredOn: input.occurredOn,
    name: input.name,
    note: input.note,
  };
  const accountMissing = { transactions_account_fk: () => notFound(errors, "account") };
  const outgoingId = await onConstraint(
    insertLeg(tx, userId, {
      ...common,
      direction: "transfer_out",
      accountId: input.fromAccountId,
      amountMinor: input.sentAmountMinor,
      idempotencyKey: input.idempotencyKey,
    }),
    accountMissing,
  );
  if (!outgoingId) {
    // A concurrent call with the same key committed first.
    const winner = await replay();
    if (!winner) throw new Error("transfers.create: idempotency conflict without a row");
    return winner;
  }
  await onConstraint(
    insertLeg(tx, userId, {
      ...common,
      direction: "transfer_in",
      accountId: input.toAccountId,
      amountMinor: input.receivedAmountMinor ?? input.sentAmountMinor,
    }),
    accountMissing,
  );
  const transfer = await loadTransfer(tx, userId, transferId);
  if (!transfer) throw new Error("transfers.create: legs not found after insert");
  return transfer;
});

export const del = authed.transfers.delete.handler(async ({ input, context, errors }) => {
  const { tx, userId } = context;
  await setDeleted(tx, userId, eq(transactions.transferId, input.transferId), true);
  const transfer = await loadTransfer(tx, userId, input.transferId);
  if (!transfer) throw errors.NOT_FOUND(transferNotFound);
  return transfer;
});

export const restore = authed.transfers.restore.handler(async ({ input, context, errors }) => {
  const { tx, userId } = context;
  await setDeleted(tx, userId, eq(transactions.transferId, input.transferId), false);
  const transfer = await loadTransfer(tx, userId, input.transferId);
  if (!transfer) throw errors.NOT_FOUND(transferNotFound);
  return transfer;
});

export const transfersRouter = { create, delete: del, restore };
