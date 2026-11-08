import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { id, timestamps, userId } from "./_shared";

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    // Informational label in v1 (ADR 0006): amounts are always EUR cents.
    currency: text("currency").notNull().default("EUR"),
    // The user's share in basis points (ADR 0026): 10000 = personal, 5000 = joint 50 %.
    shareBps: integer("share_bps").notNull().default(10000),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // Target of the composite foreign keys that keep references within one user.
    unique("accounts_user_id_id_key").on(t.userId, t.id),
    check("accounts_share_bps_range", sql`${t.shareBps} between 1 and 10000`),
  ],
);
