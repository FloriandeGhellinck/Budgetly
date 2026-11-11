import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { paletteVar } from "../lib/palette";
import { cn } from "../lib/utils";

const iconChipVariants = cva(
  "inline-grid shrink-0 place-items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        default: "size-9 rounded-xl [&_svg:not([class*='size-'])]:size-4",
        lg: "size-11 rounded-2xl [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: { size: "default" },
  },
);

// An icon on a pastel tile of one palette colour (`--cat-<color>-tint`), the
// icon in its strong ink (`--cat-<color>-fg`). Decorative: the label beside it
// carries the meaning.
function IconChip({
  color,
  size,
  className,
  style,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof iconChipVariants> & { color: string }) {
  return (
    <span
      data-slot="icon-chip"
      aria-hidden
      className={cn(iconChipVariants({ size }), className)}
      style={{
        backgroundColor: paletteVar(color, "tint"),
        color: paletteVar(color, "fg"),
        ...style,
      }}
      {...props}
    />
  );
}

export { IconChip, iconChipVariants };
