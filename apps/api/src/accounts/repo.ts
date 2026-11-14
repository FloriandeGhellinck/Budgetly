import type { Account } from "@budgetly/contract";
import { accounts, type Tx } from "@budgetly/db";
import { and, asc, eq, isNotNull, isNull, type SQL, sql } from "drizzle-orm";
import { accountBalance, transactionsNet } from "../balance.ts";
import { iso } from "../serialize.ts";

type AccountRow = typeof accounts.$inferSelect;

function toAccount({ row, balance }: { row: AccountRow; balance: string }): Account {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    shareBps: row.shareBps,
    archivedAt: iso(row.archivedAt),
    seedKey: row.seedKey,
    openingBalanceMinor: row.openingBalanceMinor,
    openingBalanceOn: row.openingBalanceOn,
    balanceMinor: Number(balance),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function listAccounts(
  tx: Tx,
  userId: string,
  options: { includeArchived: boolean },
): Promise<Account[]> {
  const rows = await selectAccounts(tx)
    .where(
      and(
        eq(accounts.userId, userId),
        options.includeArchived ? undefined : isNull(accounts.archivedAt),
      ),
    )
    .orderBy(sql`${accounts.archivedAt} is not null`, asc(accounts.name), asc(accounts.id));
  return rows.map(toAccount);
}

function selectAccounts(tx: Tx) {
  return tx.select({ row: accounts, balance: accountBalance("accounts") }).from(accounts);
}

// Writes return the row without its balance; read it back with one.
async function findAccount(tx: Tx, userId: string, id: string): Promise<Account | null> {
  const [row] = await selectAccounts(tx).where(owned(userId, id));
  return row ? toAccount(row) : null;
}

function owned(userId: string, id: string): SQL | undefined {
  return and(eq(accounts.userId, userId), eq(accounts.id, id));
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
  return toAccount({ row, balance: "0" });
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
    .where(owned(userId, id))
    .returning({ id: accounts.id });
  return row ? findAccount(tx, userId, id) : null;
}

// Archiving keeps an already archived account's original date.
export async function setAccountArchived(
  tx: Tx,
  userId: string,
  id: string,
  archived: boolean,
): Promise<Account | null> {
  const where = owned(userId, id);
  await tx
    .update(accounts)
    .set({ archivedAt: archived ? sql`coalesce(${accounts.archivedAt}, now())` : null })
    .where(archived ? where : and(where, isNotNull(accounts.archivedAt)));
  return findAccount(tx, userId, id);
}

// Stores the opening balance that makes it plus the live transactions dated up
// to asOf equal the bank's figure (ADR 0035). Null for an unknown account.
export async function setOpeningBalance(
  tx: Tx,
  userId: string,
  id: string,
  observed: { balanceMinor: number; asOf: string },
): Promise<Account | null> {
  const [row] = await tx
    .update(accounts)
    .set({
      openingBalanceMinor: sql`${observed.balanceMinor}::bigint - ${transactionsNet("accounts", sql`${observed.asOf}::date`)}`,
      openingBalanceOn: observed.asOf,
      updatedAt: new Date(),
    })
    .where(owned(userId, id))
    .returning({ id: accounts.id });
  return row ? findAccount(tx, userId, id) : null;
}

export async function accountExists(tx: Tx, userId: string, id: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
  return row !== undefined;
}
