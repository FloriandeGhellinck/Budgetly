import { type CategoryColor, type CategoryIcon, NEUTRAL_ICON } from "@budgetly/contract";
import { IconChip } from "@budgetly/ui/components/icon-chip";
import { CATEGORY_ICON_COMPONENTS } from "./icons";

// The look of "no category" (uncategorized, Other, transfers): a quiet gray
// outside the selectable palette (globals.css `--cat-none*`), so it never
// reads as a group that chose slate.
export const NO_CATEGORY_COLOR = "none";

// A category's icon on its colour's pastel tile; without a category (null),
// the neutral look. Decorative: the category's name is always shown beside it.
export function CategoryChip({
  color,
  icon,
  size,
  className,
}: {
  color: CategoryColor | null;
  icon: CategoryIcon | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const Icon = CATEGORY_ICON_COMPONENTS[icon ?? NEUTRAL_ICON];
  return (
    <IconChip color={color ?? NO_CATEGORY_COLOR} size={size ?? "default"} className={className}>
      <Icon />
    </IconChip>
  );
}
