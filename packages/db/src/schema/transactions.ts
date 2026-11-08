import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { direction, id, timestamps, userId } from "./_shared";
import { accounts } from "./accounts";
import { beneficiaries } from "./beneficiaries";
import { categories } from "./categories";
import { tags } from "./tags";

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    userId: userId(),
    accountId: uuid("account_id").notNull(),
    direction: direction("direction").notNull(),
    // Positive cents; the sign comes from the direction (ADR 0003).
    amountMinor: integer("amount_minor").notNull(),
    occurredOn: date("occurred_on").notNull(),
    name: text("name").notNull(),
    note: text("note"),
    categoryId: uuid("category_id"),
    beneficiaryId: uuid("beneficiary_id"),
    // Shared by the two legs of a transfer (ADR 0006).
    transferId: uuid("transfer_id"),
    // Lets a create be retried without duplicating the row (ADR 0018).
    idempotencyKey: text("idempotency_key"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique("transactions_user_id_id_key").on(t.userId, t.id),
    // Nulls are distinct, so rows without a key never collide.
    unique("transactions_user_id_idempotency_key_key").on(t.userId, t.idempotencyKey),
    // A transfer has at most one leg of each direction.
    unique("transactions_transfer_leg_key").on(t.userId, t.transferId, t.direction),
    index("transactions_user_id_occurred_on_idx").on(t.userId, t.occurredOn),
    foreignKey({
      name: "transactions_account_fk",
      columns: [t.userId, t.accountId],
      foreignColumns: [accounts.userId, accounts.id],
    }),
    // Includes direction, so an expense can only use an expense category.
    foreignKey({
      name: "transactions_category_fk",
      columns: [t.userId, t.categoryId, t.direction],
      foreignColumns: [categories.userId, categories.id, categories.direction],
    }),
    foreignKey({
      name: "transactions_beneficiary_fk",
      columns: [t.userId, t.beneficiaryId],
      foreignColumns: [beneficiaries.userId, beneficiaries.id],
    }),
    check("transactions_amount_minor_positive", sql`${t.amountMinor} > 0`),
    check(
      "transactions_transfer_shape",
      sql`(${t.direction} in ('transfer_out', 'transfer_in') and ${t.transferId} is not null and ${t.categoryId} is null and ${t.beneficiaryId} is null)
        or (${t.direction} in ('expense', 'income') and ${t.transferId} is null)`,
    ),
  ],
);

export const transactionTags = pgTable(
  "transaction_tags",
  {
    userId: userId(),
    transactionId: uuid("transaction_id").notNull(),
    tagId: uuid("tag_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index("transaction_tags_tag_id_idx").on(t.tagId),
    foreignKey({
      name: "transaction_tags_transaction_fk",
      columns: [t.userId, t.transactionId],
      foreignColumns: [transactions.userId, transactions.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "transaction_tags_tag_fk",
      columns: [t.userId, t.tagId],
      foreignColumns: [tags.userId, tags.id],
    }).onDelete("cascade"),
  ],
);
