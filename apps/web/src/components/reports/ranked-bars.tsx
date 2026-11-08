import { Money } from "@expense/ui/components/money";
import { cn } from "@expense/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { barWidths } from "@/lib/reports/figures";

export type RankedBar = {
  key: string;
  label: string;
  detail?: string;
  totalMinor: number;
  // Links the row to the matching transactions.
  href?: string;
  // A CSS colour for the bar: the series this part belongs to.
  color: string;
};

// Parts of a total as ranked horizontal bars, largest first, each with its
// amount printed: the reader compares lengths, the text carries the values.
export function RankedBars({
  items,
  locale,
  label,
  scale,
  inset = false,
  className,
}: {
  items: RankedBar[];
  locale: string;
  label: string;
  // The total a full-width bar stands for, when several lists share a scale.
  scale?: number;
  // Indents the labels (sub-rows) while bars keep the shared scale's full width.
  inset?: boolean;
  className?: string;
}) {
  const widths = barWidths(
    items.map((item) => item.totalMinor),
    scale,
  );
  return (
    <ul aria-label={label} className={cn("flex flex-col", className)}>
      {items.map((item, index) => (
        <li key={item.key}>
          <Row href={item.href}>
            <span className="flex items-baseline justify-between gap-3">
              <span className={cn("min-w-0 truncate", inset && "ps-4")}>
                {item.label}
                {item.detail && (
                  <span className="ps-2 text-xs text-muted-foreground">{item.detail}</span>
                )}
              </span>
              <Money amountMinor={item.totalMinor} locale={locale} className="font-medium" />
            </span>
            <span aria-hidden className="block h-2 w-full">
              <span
                className="block h-full min-w-0.5 rounded-full"
                style={{ width: `${widths[index] ?? 0}%`, backgroundColor: item.color }}
              />
            </span>
          </Row>
        </li>
      ))}
    </ul>
  );
}

function Row({ href, children }: { href: string | undefined; children: ReactNode }) {
  const className = "flex flex-col gap-1 rounded-md px-2 py-1.5";
  return href ? (
    <Link href={href} className={cn(className, "hover:bg-muted focus-visible:bg-muted")}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
