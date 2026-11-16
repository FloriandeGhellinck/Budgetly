"use client";

import type { AnalysisView } from "@budgetly/contract";
import { Money } from "@budgetly/ui/components/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@budgetly/ui/components/table";
import { paletteVar } from "@budgetly/ui/lib/palette";
import { cn } from "@budgetly/ui/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { RankedBars } from "@/components/reports/ranked-bars";
import { NONE_COLOR } from "@/lib/analysis/colors";
import type { AnalysisItem } from "@/lib/analysis/items";
import { foldTail, formatRate, shareBps } from "@/lib/reports/figures";
import { DonutChart } from "./donut-chart";
import { MonthBars } from "./month-bars";

// Nine palette colours: beyond eight slices the rest fold into a neutral "Other".
const DONUT_MAX_SLICES = 9;

// The chart and the table under it, sharing a hover: pointing at a slice
// lights its row and the other way round. Every slice, bar and row opens
// the same place.
export function AnalysisResult({
  items,
  totalMinor,
  groupBy,
  display,
  caption,
  seriesColor,
}: {
  items: AnalysisItem[];
  totalMinor: number;
  groupBy: AnalysisView["groupBy"];
  display: AnalysisView["display"];
  // Under the donut's total: the drilled group, else the types.
  caption: string;
  // The single colour of month bars.
  seriesColor: string;
}) {
  const t = useTranslations("analysis");
  const locale = useLocale();
  const router = useRouter();
  const [hot, setHot] = useState<string | null>(null);
  const open = (item: AnalysisItem) => {
    if (item.href) router.push(item.href);
  };
  const chartLabel = t("chartLabel", { groupBy: t(`groupBys.${groupBy}`).toLowerCase() });

  let chart;
  if (groupBy === "month") {
    chart = (
      <MonthBars
        items={items}
        color={seriesColor}
        label={t("barsLabel")}
        locale={locale}
        onOpen={open}
      />
    );
  } else if (display === "donut") {
    const slices = foldTail(items, DONUT_MAX_SLICES, (rest): AnalysisItem => ({
      key: "other",
      label: t("other", { count: rest.length }),
      color: NONE_COLOR,
      totalMinor: rest.reduce((sum, item) => sum + item.totalMinor, 0),
      count: rest.reduce((sum, item) => sum + item.count, 0),
    }));
    chart = (
      <DonutChart
        items={slices}
        totalMinor={totalMinor}
        caption={caption}
        locale={locale}
        hot={hot}
        onHot={setHot}
        onOpen={open}
      />
    );
  } else {
    chart = (
      <RankedBars
        label={chartLabel}
        locale={locale}
        className="w-full text-sm"
        items={items.map((item) => ({
          key: item.key,
          label: item.label,
          ...(item.detail ? { detail: item.detail } : {}),
          totalMinor: item.totalMinor,
          color: paletteVar(item.color),
          ...(item.href ? { href: item.href } : {}),
        }))}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 justify-center">{chart}</div>
      <Table onMouseLeave={() => setHot(null)}>
        <TableHeader>
          <TableRow>
            <TableHead>{t(`groupBys.${groupBy}`)}</TableHead>
            <TableHead className="text-right">{t("amount")}</TableHead>
            <TableHead className="text-right">{t("share")}</TableHead>
            <TableHead className="hidden text-right sm:table-cell">{t("count")}</TableHead>
            <TableHead className="hidden w-0 sm:table-cell">
              <span className="sr-only">{t("details")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.key}
              data-state={hot === item.key ? "selected" : undefined}
              className={cn(item.href && "cursor-pointer")}
              onMouseEnter={() => setHot(item.key)}
              onClick={() => open(item)}
            >
              <TableCell className="max-w-0 min-w-36">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{
                      backgroundColor: groupBy === "month" ? seriesColor : paletteVar(item.color),
                    }}
                  />
                  {item.href ? (
                    <Link
                      href={item.href}
                      aria-label={
                        item.action === "drill"
                          ? t("drillInto", { name: item.label })
                          : t("openTransactions", { name: item.label })
                      }
                      className="truncate hover:underline focus-visible:underline focus-visible:outline-none"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                  {item.detail && (
                    <span className="hidden shrink-0 rounded-full bg-muted px-1.5 text-[0.7rem] text-muted-foreground sm:inline">
                      {item.detail}
                    </span>
                  )}
                  {item.badge && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 text-[0.7rem] text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Money amountMinor={item.totalMinor} locale={locale} />
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {formatRate(shareBps(item.totalMinor, totalMinor), locale, 0)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {item.count}
              </TableCell>
              <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                {item.href && (
                  <span className="inline-flex items-center gap-0.5">
                    {item.action === "drill" ? t("details") : t("transactions")}
                    <ChevronRightIcon aria-hidden className="size-3.5" />
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
