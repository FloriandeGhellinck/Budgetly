"use client";

import { formatMoney } from "@budgetly/ui/lib/money";
import { paletteVar } from "@budgetly/ui/lib/palette";
import { useLayoutEffect, useRef, useState } from "react";
import { donutLayout, fitText } from "@/lib/analysis/donut-layout";
import { formatRate, shareBps } from "@/lib/reports/figures";
import type { AnalysisItem } from "@/lib/analysis/items";

// The split as a ring with the total in the middle and Notion-style leader
// lines to "Name  amount (pct)". Drawn at the container's width; on phones
// the labels give way to the table below, which names every slice and is
// what assistive technology reads (the drawing is hidden from it).
export function DonutChart({
  items,
  totalMinor,
  caption,
  locale,
  hot,
  onHot,
  onOpen,
}: {
  items: AnalysisItem[];
  totalMinor: number;
  caption: string;
  locale: string;
  hot: string | null;
  onHot: (key: string | null) => void;
  onOpen: (item: AnalysisItem) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout = donutLayout(items, width);
  const { cx, cy, radius, stroke, circumference } = layout;
  const gap = layout.arcs.length > 1 ? 2 : 0;
  const big = radius >= 90 ? 28 : radius >= 70 ? 24 : 20;
  const dim = (key: string) => (hot !== null && hot !== key ? 0.35 : 1);
  const share = (item: AnalysisItem) =>
    `${formatMoney(item.totalMinor, { locale, wholeEuros: true })} (${formatRate(shareBps(item.totalMinor, totalMinor), locale)})`;

  return (
    <div ref={ref} className="flex w-full justify-center" onMouseLeave={() => onHot(null)}>
      <svg
        aria-hidden
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block max-w-full overflow-visible"
      >
        {layout.labels.map((leader) => {
          const value = share(leader.item);
          const room = layout.twoLines
            ? layout.labelRoom
            : layout.labelRoom - value.length * 6.6 - 8;
          return (
            <g
              key={leader.item.key}
              className="cursor-pointer transition-opacity"
              opacity={dim(leader.item.key)}
              onMouseEnter={() => onHot(leader.item.key)}
              onClick={() => onOpen(leader.item)}
            >
              <polyline
                points={leader.points.map((p) => p.join(",")).join(" ")}
                fill="none"
                className="stroke-muted-foreground"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
              <text
                x={leader.tx}
                y={leader.y + 4}
                textAnchor={leader.right ? "start" : "end"}
                className="text-xs"
              >
                {layout.twoLines ? (
                  <>
                    <tspan x={leader.tx} className="fill-muted-foreground">
                      {fitText(leader.item.label, room)}
                    </tspan>
                    <tspan x={leader.tx} dy={15} className="fill-foreground tabular-nums">
                      {value}
                    </tspan>
                  </>
                ) : (
                  <>
                    <tspan className="fill-muted-foreground">
                      {fitText(leader.item.label, room)}
                    </tspan>
                    <tspan dx={6} className="fill-foreground tabular-nums">
                      {value}
                    </tspan>
                  </>
                )}
              </text>
            </g>
          );
        })}
        {layout.arcs.map((arc) => {
          const dash = Math.max(arc.length - gap, 0.5);
          return (
            <circle
              key={arc.item.key}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={paletteVar(arc.item.color)}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-arc.start}
              transform={`rotate(-90 ${cx} ${cy})`}
              opacity={dim(arc.item.key)}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => onHot(arc.item.key)}
              onClick={() => onOpen(arc.item)}
            >
              <title>{`${arc.item.label} · ${share(arc.item)}`}</title>
            </circle>
          );
        })}
        <text
          x={cx}
          y={cy + big * 0.25}
          textAnchor="middle"
          className="fill-foreground font-semibold tabular-nums"
          style={{ fontSize: big }}
        >
          {formatMoney(totalMinor, { locale, wholeEuros: true })}
        </text>
        <text
          x={cx}
          y={cy + big * 0.25 + 20}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          {fitText(caption, 2 * radius - stroke - 16)}
        </text>
      </svg>
    </div>
  );
}
