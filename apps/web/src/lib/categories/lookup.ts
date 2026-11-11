import type { CategoryGroupOption, CategoryOption } from "@/lib/entry-options";

// Category options by id, for rows that only carry a categoryId (transactions).
export function categoryLookup(
  groups: readonly CategoryGroupOption[],
): (id: string | null) => CategoryOption | null {
  const byId = new Map(groups.flatMap((group) => group.categories.map((c) => [c.id, c] as const)));
  return (id) => (id === null ? null : (byId.get(id) ?? null));
}
