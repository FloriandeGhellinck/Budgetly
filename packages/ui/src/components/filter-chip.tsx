import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";

// A Notion-style filter pill: dashed and quiet while unset ("Group"), filled
// once it holds a value ("Group: Leisure, Home"). Use it as the `render` of a
// PopoverTrigger or Menu trigger that opens the filter's editor.
function FilterChip({
  className,
  label,
  value,
  active = value !== undefined && value !== "",
  chevron = true,
  ...props
}: Omit<ButtonPrimitive.Props, "children"> & {
  label: React.ReactNode;
  // What the filter holds, already summarised; empty when unset.
  value?: React.ReactNode;
  active?: boolean;
  chevron?: boolean;
}) {
  return (
    <ButtonPrimitive
      data-slot="filter-chip"
      data-active={active || undefined}
      className={cn(
        "inline-flex h-7 max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-[0.8rem] whitespace-nowrap text-muted-foreground transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground data-active:border-solid data-active:border-transparent data-active:bg-secondary data-active:font-medium data-active:text-secondary-foreground [&_svg]:size-3 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {value !== undefined && value !== "" ? (
        <>
          <span className="font-normal opacity-80">{label}:</span>
          <span className="min-w-0 truncate">{value}</span>
        </>
      ) : (
        <span className="min-w-0 truncate">{label}</span>
      )}
      {chevron && <ChevronDownIcon aria-hidden />}
    </ButtonPrimitive>
  );
}

export { FilterChip };
