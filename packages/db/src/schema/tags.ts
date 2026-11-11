import { sql } from "drizzle-orm";
import { pgTable, text, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { id, timestamps, userId } from "./_shared";

export const tags = pgTable(
  "tags",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [
    unique("tags_user_id_id_key").on(t.userId, t.id),
    uniqueIndex("tags_user_id_name_key").on(t.userId, sql`lower(${t.name})`),
  ],
);
