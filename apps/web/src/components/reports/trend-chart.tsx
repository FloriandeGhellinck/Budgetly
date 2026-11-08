"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@expense/ui/components/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@expense/ui/components/table";
import { formatMoney } from "@expense/ui/lib/money";
import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

export type TrendPoint = {
  month: string;
  label: string;
  income: number;
  spending: number;
  saving: number;
};

const SERIES = ["income", "spending", "saving"] as const;

// Income, spending and saving per month (ADR 0011). Fixed series colours
// (globals.css --chart-1..3, CVD-checked); the legend and the table view
// carry identity and values too, so nothing depends on colour or hover.
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const config = {
    income: { label: t("figures.income"), color: "var(--chart-1)" },
    spending: { label: t("figures.spending"), color: "var(--chart-2)" },
    saving: { label: t("figures.saving"), color: "var(--chart-3)" },
  } satisfies ChartConfig;
  // Axis ticks in whole euros, compact: the exact cents are in the tooltip and table.
  const tick = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <div className="flex flex-col gap-2">
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <LineChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => tick.format(Math.round(value / 100))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="line"
                formatter={(value, name) => (
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        aria-hidden
                        className="h-0.5 w-3 rounded-full"
                        style={{ backgroundColor: `var(--color-${String(name)})` }}
                      />
                      {config[name as keyof typeof config]?.label ?? name}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatMoney(Number(value), { locale })}
                    </span>
                  </span>
                )}
              />
            }
          />
          {/* Series order, not alphabetical. */}
          <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
          {SERIES.map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">{t("showTable")}</summary>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("month")}</TableHead>
              {SERIES.map((key) => (
                <TableHead key={key} className="text-right">
                  {config[key].label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((point) => (
              <TableRow key={point.month}>
                <TableCell>{point.label}</TableCell>
                {SERIES.map((key) => (
                  <TableCell key={key} className="text-right tabular-nums">
                    {formatMoney(point[key], { locale })}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  );
}
