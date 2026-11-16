import { CATEGORY_COLORS, type CategoryColor } from "@budgetly/contract";

// The neutral look of a bucket without an entity (uncategorized, no
// beneficiary, Other): `--cat-none`, outside the palette (ADR 0034).
export const NONE_COLOR = "none";
export type SliceColor = CategoryColor | typeof NONE_COLOR;

// Each item keeps its own colour (its category's or group's, ADR 0034); when
// an earlier item already wears it (categories inheriting their group's
// colour), it takes the next palette colour nobody wears yet. Items without a
// colour stay neutral. Once all nine colours are taken, the rest keep theirs:
// charts fold those into "Other" before it matters.
export function distinctColors<T extends { color: SliceColor }>(items: readonly T[]): T[] {
  const used = new Set<CategoryColor>();
  return items.map((item) => {
    if (item.color === NONE_COLOR) return item;
    let color: CategoryColor = item.color;
    if (used.has(color)) {
      const start = CATEGORY_COLORS.indexOf(color);
      const free = CATEGORY_COLORS.map(
        (_, step) => CATEGORY_COLORS[(start + step + 1) % CATEGORY_COLORS.length],
      ).find((candidate): candidate is CategoryColor => !!candidate && !used.has(candidate));
      if (free) color = free;
    }
    used.add(color);
    return color === item.color ? item : { ...item, color };
  });
}

// A colour for entities that have none of their own (beneficiaries, accounts,
// tags): by their position in the user's list, so it follows the entity, not
// its rank in the chart.
export function colorByPosition(index: number): CategoryColor {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? "slate";
}
