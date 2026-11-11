import { describe, expect, it } from "vitest";
import { paletteVar } from "./palette";

describe("paletteVar", () => {
  it("names the variable of each role", () => {
    expect(paletteVar("teal")).toBe("var(--cat-teal)");
    expect(paletteVar("teal", "fg")).toBe("var(--cat-teal-fg)");
    expect(paletteVar("teal", "tint")).toBe("var(--cat-teal-tint)");
  });
});
