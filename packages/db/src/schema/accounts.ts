import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
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
    // "main" on the default created at sign-up; cleared on rename (ADR 0026).
    seedKey: text("seed_key"),
    // Signed cents (ADR 0035): the balance before any recorded transaction,
    // computed by accounts.setBalance from the figure the bank showed on openingBalanceOn.
    openingBalanceMinor: bigint("opening_balance_minor", { mode: "number" }),
    openingBalanceOn: date("opening_balance_on"),
    ...timestamps,
  },
  (t) => [
    // Target of the composite foreign keys that keep references within one user.
    unique("accounts_user_id_id_key").on(t.userId, t.id),
    unique("accounts_user_id_seed_key_key").on(t.userId, t.seedKey),
    check("accounts_share_bps_range", sql`${t.shareBps} between 1 and 10000`),
    check(
      "accounts_opening_balance_pair",
      sql`(${t.openingBalanceMinor} is null) = (${t.openingBalanceOn} is null)`,
    ),
  ],
);
