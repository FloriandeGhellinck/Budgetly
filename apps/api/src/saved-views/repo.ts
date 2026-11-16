import { type AnalysisView, parseStoredView, type SavedView } from "@budgetly/contract";
import { savedViews, type Tx } from "@budgetly/db";
import { and, asc, eq, sql } from "drizzle-orm";

type SavedViewRow = typeof savedViews.$inferSelect;

// The stored JSON is read leniently: a field that no longer parses takes its
// default instead of failing the whole list (ADR 0036).
function toSavedView(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    name: row.name,
    seedKey: row.seedKey,
    view: parseStoredView(row.view),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSavedViews(tx: Tx, userId: string): Promise<SavedView[]> {
  const rows = await tx
    .select()
    .from(savedViews)
    .where(eq(savedViews.userId, userId))
    .orderBy(asc(savedViews.sortOrder), asc(savedViews.createdAt), asc(savedViews.id));
  return rows.map(toSavedView);
}

// Appended after the caller's last tab.
export async function insertSavedView(
  tx: Tx,
  userId: string,
  entry: { name: string; view: AnalysisView },
): Promise<SavedView> {
  const [row] = await tx
    .insert(savedViews)
    .values({
      userId,
      name: entry.name,
      view: entry.view,
      sortOrder: sql`(select coalesce(max(sort_order) + 1, 0) from saved_views where user_id = ${userId})`,
    })
    .returning();
  if (!row) throw new Error("insertSavedView: no row returned");
  return toSavedView(row);
}

// Null when the caller has no such view. A real rename clears the seed key
// (ADR 0026); the same name leaves it.
export async function updateSavedView(
  tx: Tx,
  userId: string,
  id: string,
  patch: { name?: string | undefined; view?: AnalysisView | undefined },
): Promise<SavedView | null> {
  const owned = and(eq(savedViews.userId, userId), eq(savedViews.id, id));
  const [current] = await tx.select().from(savedViews).where(owned);
  if (!current) return null;
  const renamed = patch.name !== undefined && patch.name !== current.name;
  if (!renamed && patch.view === undefined) return toSavedView(current);
  const [row] = await tx
    .update(savedViews)
    .set({
      ...(renamed ? { name: patch.name, seedKey: null } : {}),
      ...(patch.view !== undefined ? { view: patch.view } : {}),
      updatedAt: new Date(),
    })
    .where(owned)
    .returning();
  if (!row) throw new Error("updateSavedView: no row returned");
  return toSavedView(row);
}

// False when the caller has no such view.
export async function deleteSavedView(tx: Tx, userId: string, id: string): Promise<boolean> {
  const rows = await tx
    .delete(savedViews)
    .where(and(eq(savedViews.userId, userId), eq(savedViews.id, id)))
    .returning({ id: savedViews.id });
  return rows.length > 0;
}
