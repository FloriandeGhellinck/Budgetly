import { sql } from "drizzle-orm";
import type { Db, Tx } from "./client";

// The single place a transaction is bound to a user for RLS (ADR 0013). The
// setting is transaction-local (third argument `true`), so it never leaks to
// the next checkout of a pooled connection.
export function withUser<T>(db: Db, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
    return fn(tx);
  });
}
