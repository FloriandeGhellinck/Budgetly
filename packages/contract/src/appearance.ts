import type { CategoryPaletteColor } from "@budgetly/db";
import { z } from "zod";

// How a category group or category looks (ADR 0034): a colour token from a
// fixed palette and an icon name from a curated lucide allow-list. The UI owns
// the actual colours (light and dark) and icon components.

export const CATEGORY_COLORS = [
  "blue",
  "teal",
  "green",
  "amber",
  "orange",
  "red",
  "pink",
  "violet",
  "slate",
] as const satisfies readonly CategoryPaletteColor[];
export const CategoryColor = z.enum(CATEGORY_COLORS);
export type CategoryColor = z.infer<typeof CategoryColor>;

// Lucide icon names (kebab-case), grouped by theme for the picker.
export const CATEGORY_ICONS = [
  // Food and shopping
  "shopping-cart",
  "shopping-basket",
  "shopping-bag",
  "utensils",
  "coffee",
  "pizza",
  "beer",
  "wine",
  // Home and utilities
  "house",
  "sofa",
  "wrench",
  "hammer",
  "zap",
  "droplets",
  "wifi",
  "smartphone",
  "tv",
  // Personal and family
  "shirt",
  "scissors",
  "sparkles",
  "baby",
  "graduation-cap",
  "book-open",
  "dog",
  "cat",
  "paw-print",
  // Health
  "pill",
  "stethoscope",
  "heart-pulse",
  "hospital",
  "glasses",
  // Transport and travel
  "car",
  "fuel",
  "bus",
  "train-front",
  "bike",
  "plane",
  "tree-palm",
  "umbrella",
  // Leisure
  "ticket",
  "film",
  "music",
  "gamepad-2",
  "party-popper",
  "popcorn",
  "dumbbell",
  "trophy",
  "gift",
  "hand-heart",
  "flower-2",
  // Money
  "trending-up",
  "chart-line",
  "bitcoin",
  "coins",
  "piggy-bank",
  "gem",
  "building-2",
  "building",
  "landmark",
  "credit-card",
  "receipt",
  "banknote",
  "hand-coins",
  "wallet",
  "briefcase",
  "shield-check",
  // Generic
  "tag",
  "folder",
  "shapes",
  "circle-dashed",
] as const;
export const CategoryIcon = z.enum(CATEGORY_ICONS);
export type CategoryIcon = z.infer<typeof CategoryIcon>;

// What an uncategorized bucket or an unknown stored value falls back to.
export const NEUTRAL_COLOR: CategoryColor = "slate";
export const NEUTRAL_ICON: CategoryIcon = "circle-dashed";

// Stored values are plain text: one later dropped from an allow-list reads as unset.
export const asCategoryColor = (value: string | null): CategoryColor | null =>
  CategoryColor.safeParse(value).data ?? null;
export const asCategoryIcon = (value: string | null): CategoryIcon | null =>
  CategoryIcon.safeParse(value).data ?? null;
