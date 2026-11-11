import type { Transaction } from "@budgetly/contract";
import { categories, transactions, transactionTags, type Tx } from "@budgetly/db";
import {
  and,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { accountExists } from "../accounts/repo.ts";
import { beneficiaryExists } from "../beneficiaries/repo.ts";
import { findCategoryDirection } from "../categories/repo.ts";
import { containsPattern } from "../like.ts";
import { iso } from "../serialize.ts";
import { resolveTagIds } from "../tags/repo.ts";
import type { Cursor } from "./cursor.ts";

type Direction = Transaction["direction"];
type EntryDirection = "expense" | "income";

// The tag names of the outer transaction row, in one subquery per row. Spelled
// out in SQL: Drizzle renders columns unqualified inside a selected `sql`, and
// a bare "id" would bind to tags.id.
const tagNames = sql<string[]>`coalesce((
  select array_agg(t.name order by lower(t.name))
  from transaction_tags tt join tags t on t.id = tt.tag_id
  where tt.transaction_id = "transactions"."id"
), '{}')`;

const columns = { ...getTableColumns(transactions), tags: tagNames };

type TransactionRow = typeof transactions.$inferSelect & { tags: string[] };

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.accountId,
    direction: row.direction,
    amountMinor: row.amountMinor,
    occurredOn: row.occurredOn,
    name: row.name,
    note: row.note,
    categoryId: row.categoryId,
    beneficiaryId: row.beneficiaryId,
    transferId: row.transferId,
    tags: row.tags,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    deletedAt: iso(row.deletedAt),
  };
}

async function selectTransactions(tx: Tx, where: SQL | undefined): Promise<Transaction[]> {
  const rows = await tx
    .select(columns)
    .from(transactions)
    .where(where)
    .orderBy(desc(transactions.occurredOn), desc(transactions.id));
  return rows.map(toTransaction);
}

const owned = (userId: string) => eq(transactions.userId, userId);

// Includes soft-deleted rows; callers decide what a deleted row means.
export async function findTransaction(
  tx: Tx,
  userId: string,
  id: string,
): Promise<Transaction | undefined> {
  const [row] = await selectTransactions(tx, and(owned(userId), eq(transactions.id, id)));
  return row;
}

export async function findByIdempotencyKey(
  tx: Tx,
  userId: string,
  key: string,
): Promise<Transaction | undefined> {
  const [row] = await selectTransactions(
    tx,
    and(owned(userId), eq(transactions.idempotencyKey, key)),
  );
  return row;
}

export type ListFilters = {
  from?: string | undefined;
  to?: string | undefined;
  accountId?: string | undefined;
  categoryId?: string | undefined;
  groupId?: string | undefined;
  beneficiaryId?: string | undefined;
  tag?: string | undefined;
  direction?: Direction | undefined;
  text?: string | undefined;
};

// One page of live transactions, newest first, plus whether more follow.
export async function listTransactions(
  tx: Tx,
  userId: string,
  filters: ListFilters,
  page: { limit: number; after: Cursor | null },
): Promise<{ items: Transaction[]; hasMore: boolean }> {
  const conditions: (SQL | undefined)[] = [
    owned(userId),
    isNull(transactions.deletedAt),
    filters.from ? gte(transactions.occurredOn, filters.from) : undefined,
    filters.to ? lte(transactions.occurredOn, filters.to) : undefined,
    filters.accountId ? eq(transactions.accountId, filters.accountId) : undefined,
    filters.categoryId ? eq(transactions.categoryId, filters.categoryId) : undefined,
    filters.groupId
      ? inArray(
          transactions.categoryId,
          tx
            .select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.userId, userId), eq(categories.groupId, filters.groupId))),
        )
      : undefined,
    filters.beneficiaryId ? eq(transactions.beneficiaryId, filters.beneficiaryId) : undefined,
    filters.tag
      ? sql`exists (
          select 1 from transaction_tags tt join tags t on t.id = tt.tag_id
          where tt.transaction_id = "transactions"."id" and lower(t.name) = lower(${filters.tag}))`
      : undefined,
    filters.direction ? eq(transactions.direction, filters.direction) : undefined,
    filters.text
      ? or(
          ilike(transactions.name, containsPattern(filters.text)),
          ilike(transactions.note, containsPattern(filters.text)),
        )
      : undefined,
    page.after
      ? sql`(${transactions.occurredOn}, ${transactions.id}) < (${page.after.occurredOn}::date, ${page.after.id}::uuid)`
      : undefined,
  ];
  const rows = await tx
    .select(columns)
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(page.limit + 1);
  return { items: rows.slice(0, page.limit).map(toTransaction), hasMore: rows.length > page.limit };
}

export type ReferenceProblem =
  | "account_not_found"
  | "category_not_found"
  | "beneficiary_not_found"
  | "category_direction_mismatch";

// Checks, inside the caller's transaction, that every referenced row is the
// caller's and that the category fits the direction. The composite foreign
// keys enforce the same, but cannot say which reference is wrong.
export async function checkReferences(
  tx: Tx,
  userId: string,
  refs: {
    accountId?: string | undefined;
    category?: { id: string; direction: EntryDirection } | undefined;
    beneficiaryId?: string | null | undefined;
  },
): Promise<ReferenceProblem | null> {
  if (refs.accountId && !(await accountExists(tx, userId, refs.accountId)))
    return "account_not_found";
  if (refs.category) {
    const direction = await findCategoryDirection(tx, userId, refs.category.id);
    if (!direction) return "category_not_found";
    if (direction !== refs.category.direction) return "category_direction_mismatch";
  }
  if (refs.beneficiaryId && !(await beneficiaryExists(tx, userId, refs.beneficiaryId))) {
    return "beneficiary_not_found";
  }
  return null;
}

async function replaceTags(
  tx: Tx,
  userId: string,
  transactionId: string,
  names: readonly string[],
) {
  await tx
    .delete(transactionTags)
    .where(
      and(eq(transactionTags.userId, userId), eq(transactionTags.transactionId, transactionId)),
    );
  const tagIds = await resolveTagIds(tx, userId, names);
  if (tagIds.length > 0) {
    await tx
      .insert(transactionTags)
      .values(tagIds.map((tagId) => ({ userId, transactionId, tagId })));
  }
}

export type NewEntry = {
  direction: EntryDirection;
  amountMinor: number;
  occurredOn: string;
  name: string;
  accountId: string;
  note?: string | undefined;
  categoryId?: string | undefined;
  beneficiaryId?: string | undefined;
  tags: readonly string[];
  idempotencyKey: string;
};

// Inserts the entry, or returns null when a concurrent call with the same
// idempotency key won; the caller then reads that call's row.
export async function insertEntry(
  tx: Tx,
  userId: string,
  entry: NewEntry,
): Promise<Transaction | null> {
  const [row] = await tx
    .insert(transactions)
    .values({
      userId,
      direction: entry.direction,
      amountMinor: entry.amountMinor,
      occurredOn: entry.occurredOn,
      name: entry.name,
      accountId: entry.accountId,
      note: entry.note ?? null,
      categoryId: entry.categoryId ?? null,
      beneficiaryId: entry.beneficiaryId ?? null,
      idempotencyKey: entry.idempotencyKey,
    })
    .onConflictDoNothing({ target: [transactions.userId, transactions.idempotencyKey] })
    .returning({ id: transactions.id });
  if (!row) return null;
  await replaceTags(tx, userId, row.id, entry.tags);
  return (await findTransaction(tx, userId, row.id)) ?? null;
}

export type EntryPatch = {
  direction?: EntryDirection | undefined;
  amountMinor?: number | undefined;
  occurredOn?: string | undefined;
  name?: string | undefined;
  accountId?: string | undefined;
  note?: string | null | undefined;
  categoryId?: string | null | undefined;
  beneficiaryId?: string | null | undefined;
  tags?: readonly string[] | undefined;
};

export async function updateEntry(
  tx: Tx,
  userId: string,
  id: string,
  patch: EntryPatch,
): Promise<Transaction> {
  const { tags: tagNamesPatch, ...fields } = patch;
  const set = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
  await tx
    .update(transactions)
    .set({ ...set, updatedAt: new Date() })
    .where(and(owned(userId), eq(transactions.id, id)));
  if (tagNamesPatch) await replaceTags(tx, userId, id, tagNamesPatch);
  const updated = await findTransaction(tx, userId, id);
  if (!updated) throw new Error("updateEntry: row vanished");
  return updated;
}

// Soft delete keeps the first deletion date; restore clears it.
export async function setDeleted(
  tx: Tx,
  userId: string,
  where: SQL,
  deleted: boolean,
): Promise<void> {
  await tx
    .update(transactions)
    .set({ deletedAt: deleted ? sql`coalesce(${transactions.deletedAt}, now())` : null })
    .where(and(owned(userId), where));
}

export async function findTransferLegs(
  tx: Tx,
  userId: string,
  transferId: string,
): Promise<Transaction[]> {
  return selectTransactions(tx, and(owned(userId), eq(transactions.transferId, transferId)));
}

export type NewLeg = {
  direction: "transfer_out" | "transfer_in";
  transferId: string;
  accountId: string;
  amountMinor: number;
  occurredOn: string;
  name: string;
  note?: string | undefined;
  idempotencyKey?: string | undefined;
};

// Null when a concurrent call with the same idempotency key won.
export async function insertLeg(tx: Tx, userId: string, leg: NewLeg): Promise<string | null> {
  const [row] = await tx
    .insert(transactions)
    .values({ userId, ...leg, note: leg.note ?? null, idempotencyKey: leg.idempotencyKey ?? null })
    .onConflictDoNothing({ target: [transactions.userId, transactions.idempotencyKey] })
    .returning({ id: transactions.id });
  return row?.id ?? null;
}
