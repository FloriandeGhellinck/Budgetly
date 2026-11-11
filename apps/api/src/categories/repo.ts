import {
  asCategoryColor,
  asCategoryIcon,
  NEUTRAL_ICON,
  NEUTRAL_COLOR,
  type Category,
  type CategoryGroup,
} from "@budgetly/contract";
import { categories, categoryGroups, type Tx } from "@budgetly/db";
import { and, asc, eq, sql } from "drizzle-orm";

type CategoryRow = typeof categories.$inferSelect;
type GroupRow = typeof categoryGroups.$inferSelect;
type EntryDirection = "expense" | "income";

// Groups only ever hold expense or income (category_groups_direction CHECK).
function entryDirection(direction: CategoryRow["direction"]): EntryDirection {
  if (direction !== "expense" && direction !== "income") {
    throw new Error(`category direction ${direction} is not expense or income`);
  }
  return direction;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    groupId: row.groupId,
    direction: entryDirection(row.direction),
    name: row.name,
    sortOrder: row.sortOrder,
    seedKey: row.seedKey,
    color: asCategoryColor(row.color),
    icon: asCategoryIcon(row.icon),
  };
}

function toGroup(row: GroupRow, members: Category[]): CategoryGroup {
  return {
    id: row.id,
    name: row.name,
    direction: entryDirection(row.direction),
    kind: row.kind,
    sortOrder: row.sortOrder,
    seedKey: row.seedKey,
    color: asCategoryColor(row.color) ?? NEUTRAL_COLOR,
    icon: asCategoryIcon(row.icon) ?? NEUTRAL_ICON,
    categories: members,
  };
}

export async function listCategoryGroups(tx: Tx, userId: string): Promise<CategoryGroup[]> {
  const groups = await tx
    .select()
    .from(categoryGroups)
    .where(eq(categoryGroups.userId, userId))
    .orderBy(asc(categoryGroups.sortOrder), asc(categoryGroups.name), asc(categoryGroups.id));
  const rows = await tx
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder), asc(categories.name), asc(categories.id));
  const byGroup = Map.groupBy(rows.map(toCategory), (category) => category.groupId);
  return groups.map((group) => toGroup(group, byGroup.get(group.id) ?? []));
}

async function findGroup(tx: Tx, userId: string, id: string): Promise<GroupRow | undefined> {
  const [row] = await tx
    .select()
    .from(categoryGroups)
    .where(and(eq(categoryGroups.userId, userId), eq(categoryGroups.id, id)));
  return row;
}

// The category's direction, or undefined when the caller has no such category.
export async function findCategoryDirection(
  tx: Tx,
  userId: string,
  id: string,
): Promise<CategoryRow["direction"] | undefined> {
  const [row] = await tx
    .select({ direction: categories.direction })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)));
  return row?.direction;
}

export async function insertCategory(
  tx: Tx,
  userId: string,
  values: { groupId: string; name: string; color?: string | undefined; icon?: string | undefined },
): Promise<Category | "group_not_found"> {
  const group = await findGroup(tx, userId, values.groupId);
  if (!group) return "group_not_found";
  const [row] = await tx
    .insert(categories)
    .values({
      userId,
      groupId: group.id,
      direction: group.direction,
      name: values.name,
      color: values.color ?? null,
      icon: values.icon ?? null,
      // Appended after the group's existing categories.
      sortOrder: sql`(select coalesce(max(${categories.sortOrder}) + 1, 0) from ${categories} where ${categories.groupId} = ${group.id})`,
    })
    .returning();
  if (!row) throw new Error("insertCategory: no row returned");
  return toCategory(row);
}

export async function updateCategory(
  tx: Tx,
  userId: string,
  id: string,
  patch: {
    name?: string | undefined;
    groupId?: string | undefined;
    sortOrder?: number | undefined;
    color?: string | null | undefined;
    icon?: string | null | undefined;
  },
): Promise<Category | "not_found" | "group_not_found" | "direction_mismatch"> {
  const owned = and(eq(categories.userId, userId), eq(categories.id, id));
  const [current] = await tx.select().from(categories).where(owned);
  if (!current) return "not_found";
  if (patch.groupId !== undefined && patch.groupId !== current.groupId) {
    const group = await findGroup(tx, userId, patch.groupId);
    if (!group) return "group_not_found";
    if (group.direction !== current.direction) return "direction_mismatch";
  }
  // A real rename turns a default into the user's own name (ADR 0026); the
  // same name again leaves the seed key, so the update stays idempotent.
  const renamed = patch.name !== undefined && patch.name !== current.name;
  const [row] = await tx
    .update(categories)
    .set({
      ...(renamed ? { name: patch.name, seedKey: null } : {}),
      ...(patch.groupId !== undefined ? { groupId: patch.groupId } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      updatedAt: new Date(),
    })
    .where(owned)
    .returning();
  if (!row) throw new Error("updateCategory: no row returned");
  return toCategory(row);
}

// The group with its categories after the change, or null when the caller has
// no such group.
export async function updateCategoryGroup(
  tx: Tx,
  userId: string,
  id: string,
  patch: { color?: string | undefined; icon?: string | undefined },
): Promise<CategoryGroup | null> {
  const [row] = await tx
    .update(categoryGroups)
    .set({
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(categoryGroups.userId, userId), eq(categoryGroups.id, id)))
    .returning();
  if (!row) return null;
  const members = await tx
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.groupId, row.id)))
    .orderBy(asc(categories.sortOrder), asc(categories.name), asc(categories.id));
  return toGroup(row, members.map(toCategory));
}

// False when the caller has no such category. A category still referenced by
// a transaction fails on transactions_category_fk (no cascade).
export async function deleteCategory(tx: Tx, userId: string, id: string): Promise<boolean> {
  const deleted = await tx
    .delete(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
    .returning({ id: categories.id });
  return deleted.length > 0;
}
