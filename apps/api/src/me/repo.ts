import { accounts, seedNewUser, type Tx } from "@expense/db";
import { eq } from "drizzle-orm";
import { violatedConstraint } from "../pg-errors.ts";

// A concurrent first bootstrap of the same user loses on these unique keys.
const SEED_RACE_CONSTRAINTS = new Set([
  "beneficiaries_user_id_seed_key_key",
  "category_groups_user_id_seed_key_key",
  "categories_user_id_seed_key_key",
]);

export async function bootstrapUser(tx: Tx, userId: string): Promise<{ created: boolean }> {
  const existing = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (existing.length > 0) return { created: false };
  try {
    // A savepoint, so losing the race leaves the outer transaction usable.
    await tx.transaction((savepoint) => seedNewUser(savepoint, userId));
    return { created: true };
  } catch (error) {
    const constraint = violatedConstraint(error);
    if (constraint && SEED_RACE_CONSTRAINTS.has(constraint)) return { created: false };
    throw error;
  }
}
