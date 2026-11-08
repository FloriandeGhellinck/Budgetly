import { sql } from "drizzle-orm";
import { check, foreignKey, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { categoryKind, direction, id, timestamps, userId } from "./_shared";

export const categoryGroups = pgTable(
  "category_groups",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    // Null on income groups: spending vs saving only splits expenses (ADR 0026).
    kind: categoryKind("kind"),
    direction: direction("direction").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    // Set on defaults created at sign-up so the UI can translate them.
    seedKey: text("seed_key"),
    ...timestamps,
  },
  (t) => [
    unique("category_groups_user_id_id_direction_key").on(t.userId, t.id, t.direction),
    unique("category_groups_user_id_seed_key_key").on(t.userId, t.seedKey),
    check("category_groups_direction", sql`${t.direction} in ('expense', 'income')`),
    check(
      "category_groups_kind_expense_only",
      sql`(${t.direction} = 'expense') = (${t.kind} is not null)`,
    ),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    userId: userId(),
    groupId: uuid("group_id").notNull(),
    // Copied from the group so transactions can match it by foreign key.
    direction: direction("direction").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    seedKey: text("seed_key"),
    ...timestamps,
  },
  (t) => [
    unique("categories_user_id_id_direction_key").on(t.userId, t.id, t.direction),
    unique("categories_user_id_seed_key_key").on(t.userId, t.seedKey),
    foreignKey({
      name: "categories_group_fk",
      columns: [t.userId, t.groupId, t.direction],
      foreignColumns: [categoryGroups.userId, categoryGroups.id, categoryGroups.direction],
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);
