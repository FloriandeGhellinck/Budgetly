// Geometry of the Analysis donut with Notion-style leader lines: a short
// elbow from each slice to "Name  amount (pct)". Drawn at its real width
// (1 unit = 1 px) so text keeps its size; narrower, labels wrap to two lines,
// and below LABELS_MIN_WIDTH they are left out (the table names every slice).

export const LABELS_MIN_WIDTH = 380;
const TWO_LINES_BELOW = 600;
const MAX_WIDTH = 760;
const MIN_WIDTH = 260;

export type DonutArc<T> = { item: T; start: number; length: number; mid: number };
export type DonutLabel<T> = {
  item: T;
  right: boolean;
  // Elbow: from the ring (x0, y0) out to (x1, y), then along to xe; text at tx.
  points: [number, number][];
  tx: number;
  y: number;
};
export type DonutLayout<T> = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  radius: number;
  stroke: number;
  circumference: number;
  arcs: DonutArc<T>[];
  labels: DonutLabel<T>[];
  twoLines: boolean;
  // Room for a label's text, in px.
  labelRoom: number;
};

export function donutLayout<T extends { totalMinor: number }>(
  items: readonly T[],
  available: number,
): DonutLayout<T> {
  const width = Math.max(Math.min(available, MAX_WIDTH), MIN_WIDTH);
  const withLabels = width >= LABELS_MIN_WIDTH;
  const twoLines = width < TWO_LINES_BELOW;
  const radius = width >= 600 ? 96 : width >= 460 ? 78 : withLabels ? 62 : 100;
  const stroke = Math.round(radius * 0.22);
  const circumference = 2 * Math.PI * radius;
  const step = twoLines ? 32 : 20;
  const parts = items.filter((item) => item.totalMinor > 0);
  const total = parts.reduce((sum, item) => sum + item.totalMinor, 0);

  let acc = 0;
  const arcs = parts.map((item) => {
    const length = (item.totalMinor / total) * circumference;
    const mid = ((acc + length / 2) / circumference) * 2 * Math.PI - Math.PI / 2;
    const arc = { item, start: acc, length, mid };
    acc += length;
    return arc;
  });

  const rightCount = arcs.filter((arc) => Math.cos(arc.mid) >= 0).length;
  const perSide = Math.max(rightCount, arcs.length - rightCount);
  const height = Math.max(
    2 * radius + (withLabels ? 70 : 20),
    withLabels ? perSide * step + 30 : 0,
  );
  const cx = width / 2;
  const cy = height / 2;
  const elbow = radius + 44;

  const labels: DonutLabel<T>[] = [];
  if (withLabels) {
    for (const right of [true, false]) {
      const side = arcs
        .filter((arc) => Math.cos(arc.mid) >= 0 === right)
        .map((arc) => ({ arc, y: cy + Math.sin(arc.mid) * (radius + 24) }))
        .sort((a, b) => a.y - b.y);
      // Push labels apart, then back inside the drawing.
      for (let k = 1; k < side.length; k++) {
        const prev = side[k - 1];
        const cur = side[k];
        if (prev && cur && cur.y - prev.y < step) cur.y = prev.y + step;
      }
      const last = side.at(-1);
      const over = last ? last.y - (height - (twoLines ? 24 : 10)) : 0;
      if (over > 0) for (const label of side) label.y -= over;
      const firstLabel = side[0];
      const under = firstLabel ? 14 - firstLabel.y : 0;
      if (under > 0) for (const label of side) label.y += under;

      const sign = right ? 1 : -1;
      for (const { arc, y } of side) {
        const ring = radius + stroke / 2;
        labels.push({
          item: arc.item,
          right,
          points: [
            [cx + Math.cos(arc.mid) * (ring + 3), cy + Math.sin(arc.mid) * (ring + 3)],
            [cx + Math.cos(arc.mid) * (ring + 14), y],
            [cx + sign * elbow, y],
          ],
          tx: cx + sign * (elbow + 6),
          y,
        });
      }
    }
  }

  return {
    width,
    height,
    cx,
    cy,
    radius,
    stroke,
    circumference,
    arcs,
    labels,
    twoLines,
    labelRoom: width / 2 - elbow - 14,
  };
}

// Text cut to roughly `px` wide (at ~6.6 px per character), with an ellipsis.
export function fitText(text: string, px: number): string {
  const max = Math.floor(px / 6.6);
  return text.length <= max ? text : `${text.slice(0, Math.max(max - 1, 3))}…`;
}
