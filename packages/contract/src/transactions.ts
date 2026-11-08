import { z } from "zod";
import {
  AmountMinor,
  DirectionSchema,
  EntryDirection,
  EXAMPLE_IDS,
  Id,
  IdempotencyKey,
  IsoDate,
  Name,
  Timestamp,
} from "./common";
import { errors } from "./errors";
import { procedure } from "./procedure";

export const TransactionSchema = z.object({
  id: Id,
  accountId: Id,
  direction: DirectionSchema,
  amountMinor: z.int(),
  occurredOn: IsoDate,
  name: z.string(),
  note: z.string().nullable(),
  categoryId: Id.nullable(),
  beneficiaryId: Id.nullable(),
  // Set on both legs of a transfer, null otherwise.
  transferId: Id.nullable(),
  tags: z.array(z.string()),
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // Set when soft-deleted; undo with transactions.restore.
  deletedAt: Timestamp.nullable(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

const Note = z.string().trim().max(2000);
const TagName = z.string().trim().min(1).max(100);
const TagNames = z.array(TagName).max(20);

export const TRANSACTION_PAGE_MAX = 200;

const list = procedure({
  description:
    "List the caller's transactions, newest first (by date, then id). Deleted transactions are left out. Filters combine with AND: from/to (inclusive YYYY-MM-DD), accountId, categoryId or groupId (any category of that group), beneficiaryId, tag (name, case-insensitive), direction (expense, income, transfer_out, transfer_in) and text (case-insensitive substring of name or note). Returns at most limit items (default 50, max 200); pass nextCursor back as cursor for the next page, it is null on the last one.",
  examples: [
    { from: "2026-11-01", to: "2026-11-30", direction: "expense" },
    { text: "supermarket", limit: 20 },
    { tag: "Summer trip 2026" },
  ],
  readOnly: true,
  idempotent: true,
  input: z.object({
    from: IsoDate.optional(),
    to: IsoDate.optional(),
    accountId: Id.optional(),
    categoryId: Id.optional(),
    groupId: Id.optional(),
    beneficiaryId: Id.optional(),
    tag: TagName.optional(),
    direction: DirectionSchema.optional(),
    text: z.string().trim().min(1).max(200).optional(),
    limit: z.int().min(1).max(TRANSACTION_PAGE_MAX).default(50),
    cursor: z.string().min(1).optional(),
  }),
  output: z.object({ items: z.array(TransactionSchema), nextCursor: z.string().nullable() }),
  errors: errors("INVALID_CURSOR"),
});

const get = procedure({
  description:
    "Get one transaction by id, including a soft-deleted one (its deletedAt is set), so a deletion can be inspected and undone.",
  examples: [{ id: EXAMPLE_IDS.transaction }],
  readOnly: true,
  idempotent: true,
  input: z.object({ id: Id }),
  output: TransactionSchema,
  errors: errors("NOT_FOUND"),
});

const create = procedure({
  description:
    "Record one expense or income. amountMinor is a positive integer in cents (20.68 € → 2068); direction gives the sign. occurredOn is YYYY-MM-DD. accountId is required (accounts.list); categoryId must belong to a group of the same direction (categories.list), else CATEGORY_DIRECTION_MISMATCH. tags are names; unknown names create the tag. Use suggestions.forName to pre-fill category, beneficiary and account from history. idempotencyKey is required: a retry with the same key returns the original transaction instead of recording it twice. For money moving between two of the caller's accounts use transfers.create.",
  examples: [
    {
      direction: "expense",
      amountMinor: 2068,
      occurredOn: "2026-11-08",
      name: "Supermarket",
      accountId: EXAMPLE_IDS.account,
      categoryId: EXAMPLE_IDS.category,
      beneficiaryId: EXAMPLE_IDS.beneficiary,
      idempotencyKey: "2f1c6a52-supermarket-2026-11-08",
    },
    {
      direction: "income",
      amountMinor: 350000,
      occurredOn: "2026-11-01",
      name: "Salary",
      accountId: EXAMPLE_IDS.account,
      idempotencyKey: "salary-2026-11",
    },
    {
      direction: "expense",
      amountMinor: 4500,
      occurredOn: "2026-09-12",
      name: "Ferry",
      accountId: EXAMPLE_IDS.account,
      tags: ["Summer trip 2026"],
      idempotencyKey: "ferry-2026-09-12",
    },
  ],
  readOnly: false,
  idempotent: true,
  input: z.object({
    direction: EntryDirection,
    amountMinor: AmountMinor,
    occurredOn: IsoDate,
    name: Name,
    accountId: Id,
    note: Note.optional(),
    categoryId: Id.optional(),
    beneficiaryId: Id.optional(),
    tags: TagNames.default([]),
    idempotencyKey: IdempotencyKey,
  }),
  output: TransactionSchema,
  errors: errors("NOT_FOUND", "CATEGORY_DIRECTION_MISMATCH", "IDEMPOTENCY_KEY_CONFLICT"),
});

const update = procedure({
  description:
    "Change an expense or income. Only the fields you pass change; pass null to clear note, categoryId or beneficiaryId. tags, when passed, replaces the whole tag set. Changing direction keeps the category only if it matches the new direction, else CATEGORY_DIRECTION_MISMATCH: pass a new categoryId or null with it. A deleted transaction must be restored first (NOT_FOUND). Transfer legs are refused (TRANSFER_LEG).",
  examples: [
    { id: EXAMPLE_IDS.transaction, amountMinor: 2168 },
    { id: EXAMPLE_IDS.transaction, categoryId: EXAMPLE_IDS.category, tags: ["Holiday"] },
  ],
  readOnly: false,
  idempotent: true,
  input: z.object({
    id: Id,
    direction: EntryDirection.optional(),
    amountMinor: AmountMinor.optional(),
    occurredOn: IsoDate.optional(),
    name: Name.optional(),
    accountId: Id.optional(),
    note: Note.nullable().optional(),
    categoryId: Id.nullable().optional(),
    beneficiaryId: Id.nullable().optional(),
    tags: TagNames.optional(),
  }),
  output: TransactionSchema,
  errors: errors("NOT_FOUND", "CATEGORY_DIRECTION_MISMATCH", "TRANSFER_LEG"),
});

const del = procedure({
  description:
    "Soft-delete an expense or income: it leaves lists and figures but can be brought back with transactions.restore. Deleting a deleted transaction changes nothing. Transfer legs are refused (TRANSFER_LEG): use transfers.delete.",
  examples: [{ id: EXAMPLE_IDS.transaction }],
  readOnly: false,
  idempotent: true,
  input: z.object({ id: Id }),
  output: TransactionSchema,
  errors: errors("NOT_FOUND", "TRANSFER_LEG"),
});

const restore = procedure({
  description:
    "Undo transactions.delete. Restoring a transaction that is not deleted changes nothing. Transfer legs are refused (TRANSFER_LEG): use transfers.restore.",
  examples: [{ id: EXAMPLE_IDS.transaction }],
  readOnly: false,
  idempotent: true,
  input: z.object({ id: Id }),
  output: TransactionSchema,
  errors: errors("NOT_FOUND", "TRANSFER_LEG"),
});

export const transactionsContract = { list, get, create, update, delete: del, restore };
