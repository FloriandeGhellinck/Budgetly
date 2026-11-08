import { pgEnum, pgSchema, timestamp, uuid } from "drizzle-orm/pg-core";

// Supabase Auth owns this table. Not exported from the barrel, so drizzle-kit
// emits the foreign keys to it without trying to create it.
const authUsers = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
});

// One enum for transactions and category groups: the composite foreign key
// that matches a transaction's direction to its category needs one type.
export const direction = pgEnum("direction", ["expense", "income", "transfer_out", "transfer_in"]);

export const categoryKind = pgEnum("category_kind", ["spending", "saving"]);

export const id = () => uuid("id").primaryKey().defaultRandom();

// Account deletion (ADR 0025) removes every row of the user with it.
export const userId = () =>
  uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
