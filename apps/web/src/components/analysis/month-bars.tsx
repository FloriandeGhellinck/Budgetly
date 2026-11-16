"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@budgetly/ui/components/chart";
import { formatMoney } from "@budgetly/ui/lib/money";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import type { AnalysisItem } from "@/lib/analysis/items";

// One bar per month, one colour (ADR 0036): the period's months side by side,
// the month in progress lighter. Each bar opens that month's transactions.
export function MonthBars({
  items,
  color,
  label,
  locale,
  onOpen,
}: {
  items: AnalysisItem[];
  // A CSS colour for the single series.
  color: string;
  label: string;
  locale: string;
  onOpen: (item: AnalysisItem) => void;
}) {
  const config = { totalMinor: { label, color } } satisfies ChartConfig;
  // Ticks and bar labels in compact whole euros; the table has the cents.
  const compact = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const short = (minor: number) => compact.format(Math.round(minor / 100));
  const data = items.map((item) => ({ ...item, axis: item.shortLabel ?? item.label }));

  return (
    <div className="w-full overflow-x-auto">
      <ChartContainer
        config={config}
        className="aspect-auto h-60 w-full"
        style={{ minWidth: `${Math.max(items.length * 36, 280)}px` }}
      >
        <BarChart data={data} margin={{ top: 20, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="axis" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value: number) => short(value)}
          />
          <ChartTooltip
            cursor={{ fillOpacity: 0.4 }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => {
                  const item = payload[0]?.payload as AnalysisItem | undefined;
                  return item ? `${item.label}${item.badge ? ` · ${item.badge}` : ""}` : "";
                }}
                formatter={(value) => (
                  <span className="font-medium text-foreground tabular-nums">
                    {formatMoney(Number(value), { locale })}
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="totalMinor"
            fill="var(--color-totalMinor)"
            radius={[4, 4, 0, 0]}
            maxBarSize={34}
            className="cursor-pointer"
            onClick={(entry) => onOpen(entry.payload as AnalysisItem)}
          >
            {data.map((item) => (
              <Cell key={item.key} fillOpacity={item.badge ? 0.45 : 1} />
            ))}
            <LabelList
              dataKey="totalMinor"
              position="top"
              className="fill-foreground"
              fontSize={11}
              formatter={(value: unknown) => (Number(value) > 0 ? short(Number(value)) : "")}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
