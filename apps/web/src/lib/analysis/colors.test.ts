import { describe, expect, it } from "vitest";
import { distinctColors } from "./colors";

describe("distinctColors", () => {
  it("keeps distinct colours as they are", () => {
    const items = [{ color: "teal" as const }, { color: "violet" as const }];

    expect(distinctColors(items)).toEqual(items);
  });

  it("moves a later item sharing a colour to the next free one", () => {
    const colors = distinctColors([
      { color: "teal" as const },
      { color: "teal" as const },
      { color: "green" as const },
      { color: "teal" as const },
    ]).map((item) => item.color);

    // teal is taken, then green; the last teal skips both and lands on amber.
    expect(colors).toEqual(["teal", "green", "amber", "orange"]);
  });

  it("wraps past the end of the palette", () => {
    const colors = distinctColors([{ color: "slate" as const }, { color: "slate" as const }]).map(
      (item) => item.color,
    );

    expect(colors).toEqual(["slate", "blue"]);
  });

  it("leaves neutral buckets neutral, even several", () => {
    const colors = distinctColors([{ color: "none" as const }, { color: "none" as const }]).map(
      (item) => item.color,
    );

    expect(colors).toEqual(["none", "none"]);
  });
});
