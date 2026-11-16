import { describe, expect, it } from "vitest";
import { donutLayout, LABELS_MIN_WIDTH } from "./donut-layout";

const items = [500, 300, 100, 50, 30, 10, 5, 5].map((totalMinor, index) => ({
  key: String(index),
  totalMinor,
}));

describe("donutLayout", () => {
  it("draws arcs that cover the whole ring, in order", () => {
    const { arcs, circumference } = donutLayout(items, 700);

    const covered = arcs.reduce((sum, arc) => sum + arc.length, 0);
    expect(Math.round(covered)).toBe(Math.round(circumference));
    expect(arcs.map((arc) => arc.item.key)).toEqual(items.map((item) => item.key));
  });

  it.each([400, 520, 700])("keeps labels apart and inside at %ipx", (width) => {
    const { labels, height, twoLines } = donutLayout(items, width);
    const step = twoLines ? 32 : 20;

    expect(labels).toHaveLength(items.length);
    const sides = [true, false].map((right) =>
      labels
        .filter((label) => label.right === right)
        .map((label) => label.y)
        .sort((a, b) => a - b),
    );
    const ys = sides.flat();
    const gaps = sides.flatMap((side) => side.slice(1).map((y, index) => y - (side[index] ?? 0)));

    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(height);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(step - 0.001);
  });

  it("leaves labels out below the minimum width, the table names the slices", () => {
    expect(donutLayout(items, LABELS_MIN_WIDTH - 1).labels).toEqual([]);
  });

  it("skips empty parts", () => {
    const { arcs } = donutLayout([{ totalMinor: 0 }, { totalMinor: 10 }], 500);

    expect(arcs).toHaveLength(1);
  });
});
