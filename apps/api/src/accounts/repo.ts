import type { Account } from "@budgetly/contract";
import { accounts, type Tx } from "@budgetly/db";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { iso } from "../serialize.ts";

type AccountRow = typeof accounts.$inferSelect;

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    shareBps: row.shareBps,
    archivedAt: iso(row.archivedAt),
    seedKey: row.seedKey,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function listAccounts(
  tx: Tx,
  userId: string,
  options: { includeArchived: boolean },
): Promise<Account[]> {
  const rows = await tx
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        options.includeArchived ? undefined : isNull(accounts.archivedAt),
      ),
    )
    .orderBy(sql`${accounts.archivedAt} is not null`, asc(accounts.name), asc(accounts.id));
  return rows.map(toAccount);
}

export async function insertAccount(
  tx: Tx,
  userId: string,
  values: { name: string; currency: string; shareBps: number },
): Promise<Account> {
  const [row] = await tx
    .insert(accounts)
    .values({ userId, ...values })
    .returning();
  if (!row) throw new Error("insertAccount: no row returned");
  return toAccount(row);
}

// Null when the account does not exist for this user.
export async function updateAccount(
  tx: Tx,
  userId: string,
  id: string,
  patch: {
    name?: string | undefined;
    currency?: string | undefined;
    shareBps?: number | undefined;
  },
): Promise<Account | null> {
  const [row] = await tx
    .update(accounts)
    .set({
      ...patch,
      // A real rename turns the default into the user's own name (ADR 0026);
      // the same name again keeps the seed key, so the update stays idempotent.
      ...(patch.name !== undefined
        ? {
            seedKey: sql`case when ${accounts.name} = ${patch.name} then ${accounts.seedKey} end`,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
    .returning();
  return row ? toAccount(row) : null;
}

// Archiving keeps an already archived account's original date.
export async function setAccountArchived(
  tx: Tx,
  userId: string,
  id: string,
  archived: boolean,
): Promise<Account | null> {
  const owned = and(eq(accounts.userId, userId), eq(accounts.id, id));
  const [row] = await tx
    .update(accounts)
    .set({ archivedAt: archived ? sql`coalesce(${accounts.archivedAt}, now())` : null })
    .where(archived ? owned : and(owned, isNotNull(accounts.archivedAt)))
    .returning();
  if (row) return toAccount(row);
  const [current] = await tx.select().from(accounts).where(owned);
  return current ? toAccount(current) : null;
}

export async function accountExists(tx: Tx, userId: string, id: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
  return row !== undefined;
}
