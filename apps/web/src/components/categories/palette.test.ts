import { readFileSync } from "node:fs";
import { CATEGORY_COLORS } from "@budgetly/contract";
import { describe, expect, it } from "vitest";
import { NO_CATEGORY_COLOR } from "./category-chip";

const css = readFileSync(
  new URL("../../../../../packages/ui/src/styles/globals.css", import.meta.url),
  "utf8",
);
const block = (selector: string) => css.split(`${selector} {`)[1]?.split("}")[0] ?? "";

// Every palette token the API accepts has its three roles in both themes.
describe("category palette CSS", () => {
  it.each([":root", ".dark"])("defines mark, fg and tint for every colour in %s", (selector) => {
    const vars = block(selector);
    for (const color of [...CATEGORY_COLORS, NO_CATEGORY_COLOR]) {
      for (const name of [`--cat-${color}:`, `--cat-${color}-fg:`, `--cat-${color}-tint:`]) {
        expect(vars).toContain(name);
      }
    }
  });
});
