import { integer, jsonb, pgTable, text, unique } from "drizzle-orm/pg-core";
import { id, timestamps, userId } from "./_shared";

// A named Analysis view the user keeps as a tab (ADR 0037). `view` holds the
// contract's AnalysisView as JSON; the API validates it on write and reads it
// leniently, so a schema change never makes a saved view unreadable.
export const savedViews = pgTable(
  "saved_views",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    // Set on the starter views so the UI can translate them; a rename clears it.
    seedKey: text("seed_key"),
    view: jsonb("view").notNull(),
    // Tab order: new views go last.
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [unique("saved_views_user_id_seed_key_key").on(t.userId, t.seedKey)],
);
