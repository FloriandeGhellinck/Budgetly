import type { Tag } from "@expense/contract";
import { tags, type Tx } from "@expense/db";
import { asc, eq, sql } from "drizzle-orm";

export async function listTags(tx: Tx, userId: string): Promise<Tag[]> {
  return tx
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(sql`lower(${tags.name})`), asc(tags.id));
}

// The ids of the named tags, creating the missing ones. Names match
// case-insensitively (tags_user_id_name_key is on lower(name)); an existing
// tag keeps its first casing. Raw SQL: Drizzle cannot target an expression
// index in ON CONFLICT.
export async function resolveTagIds(
  tx: Tx,
  userId: string,
  names: readonly string[],
): Promise<string[]> {
  const unique = [...new Map(names.map((name) => [name.toLowerCase(), name])).values()];
  if (unique.length === 0) return [];
  const values = sql.join(
    unique.map((name) => sql`(${userId}::uuid, ${name})`),
    sql`, `,
  );
  await tx.execute(sql`
    insert into tags (user_id, name) values ${values}
    on conflict (user_id, lower(name)) do nothing
  `);
  const lowered = unique.map((name) => name.toLowerCase());
  const rows = await tx.execute<{ id: string }>(sql`
    select id from tags
    where user_id = ${userId} and lower(name) in (${sql.join(
      lowered.map((name) => sql`${name}`),
      sql`, `,
    )})
  `);
  return rows.map((row) => row.id);
}
