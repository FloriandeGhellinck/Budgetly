import type { Transaction } from "@budgetly/contract";

// Starting values for a new entry copied from an existing one. Never carries
// the source's id: saving always creates, with its own idempotency key.
export type TransactionDraft = {
  kind: "expense" | "income";
  name: string;
  amountMinor: number;
  accountId: string;
  categoryId: string | null;
  beneficiaryId: string | null;
  tags: string[];
  occurredOn: Date;
  idempotencyKey: string;
};

export type TransferDraft = {
  kind: "transfer";
  name: string;
  fromAccountId: string;
  toAccountId: string;
  sentAmountMinor: number;
  // Only when it differs from the sent amount (fees, conversion).
  receivedAmountMinor: number | undefined;
  occurredOn: Date;
  idempotencyKey: string;
};

export type EntryDraft = TransactionDraft | TransferDraft;

type Fresh = { today?: Date; newKey?: () => string };

// An expense or income → the quick-entry form's values, dated today.
export function draftFromTransaction(
  source: Transaction,
  { today = new Date(), newKey = () => crypto.randomUUID() }: Fresh = {},
): TransactionDraft {
  return {
    kind: source.direction === "income" ? "income" : "expense",
    name: source.name,
    amountMinor: source.amountMinor,
    accountId: source.accountId,
    categoryId: source.categoryId,
    beneficiaryId: source.beneficiaryId,
    tags: [...source.tags],
    occurredOn: today,
    idempotencyKey: newKey(),
  };
}

// The legs of one transfer (one or both) → the transfer form's values, dated
// today. A missing leg leaves its side empty for the user to pick.
export function draftFromTransferLegs(
  legs: readonly Transaction[],
  { today = new Date(), newKey = () => crypto.randomUUID() }: Fresh = {},
): TransferDraft {
  const outgoing = legs.find((leg) => leg.direction === "transfer_out");
  const incoming = legs.find((leg) => leg.direction === "transfer_in");
  const sent = outgoing?.amountMinor ?? incoming?.amountMinor ?? 0;
  const received = incoming?.amountMinor;
  return {
    kind: "transfer",
    name: (outgoing ?? incoming)?.name ?? "",
    fromAccountId: outgoing?.accountId ?? "",
    toAccountId: incoming?.accountId ?? "",
    sentAmountMinor: sent,
    receivedAmountMinor: received !== undefined && received !== sent ? received : undefined,
    occurredOn: today,
    idempotencyKey: newKey(),
  };
}
