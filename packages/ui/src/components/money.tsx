import type * as React from "react";
import { cn } from "cn";

import { formatMoney, type MoneyDirection } from "@budgetly/ui/lib/money";

type MoneyProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Positive integer cents of EUR. Never a float. */
  amountMinor: number;
  locale: string;
  /** Signs the amount: money out is negative, money in positive. */
  direction?: MoneyDirection;
};

function Money({ amountMinor, locale, direction, className, ...props }: MoneyProps) {
  return (
    <span
      data-slot="money"
      data-direction={direction}
      className={cn("tabular-nums whitespace-nowrap", className)}
      {...props}
    >
      {formatMoney(amountMinor, { locale, direction })}
    </span>
  );
}

export { Money, type MoneyProps };
