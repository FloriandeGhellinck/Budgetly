import { pgTable, text, unique } from "drizzle-orm/pg-core";
import { id, timestamps, userId } from "./_shared";

export const beneficiaries = pgTable(
  "beneficiaries",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    seedKey: text("seed_key"),
    ...timestamps,
  },
  (t) => [
    unique("beneficiaries_user_id_id_key").on(t.userId, t.id),
    unique("beneficiaries_user_id_seed_key_key").on(t.userId, t.seedKey),
  ],
);
