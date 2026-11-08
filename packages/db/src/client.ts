import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql };
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// `url` connects as app_runtime in production, so RLS applies. Close with
// `db.$client.end()`.
export function createDb(url: string): Db {
  // prepare: false for Supavisor's transaction-mode pooler, which does not keep
  // prepared statements across a checkout.
  const client = postgres(url, { prepare: false, onnotice: () => {} });
  return drizzle(client, { schema });
}
