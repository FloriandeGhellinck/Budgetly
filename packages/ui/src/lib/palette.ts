// The category palette's CSS variables (globals.css, ADR 0034). A colour token
// names a hue; each hue has three roles that switch with the theme:
// - mark: chart fills and bars;
// - fg: icon ink on its tint, and accents;
// - tint: pastel backgrounds (chips, tiles).
export type PaletteRole = "mark" | "fg" | "tint";

export function paletteVar(color: string, role: PaletteRole = "mark"): string {
  return role === "mark" ? `var(--cat-${color})` : `var(--cat-${color}-${role})`;
}
