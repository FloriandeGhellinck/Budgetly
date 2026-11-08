import { accounts, seedNewUser, type Tx } from "@expense/db";
import { eq, sql } from "drizzle-orm";

export async function bootstrapUser(tx: Tx, userId: string): Promise<{ created: boolean }> {
  // Serialises concurrent first calls of one user (two tabs signing in at
  // once): the second waits, then sees the first one's account.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`bootstrap:${userId}`}, 0))`,
  );
  const existing = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (existing.length > 0) return { created: false };
  await seedNewUser(tx, userId);
  return { created: true };
}
