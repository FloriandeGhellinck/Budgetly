import { describe, expect, it } from "vitest";
import { negotiateLocale, resolveLocale } from "./config";

describe("negotiateLocale", () => {
  it.each<[string, string | null, string]>([
    ["no header", null, "en"],
    ["French region first", "fr-BE,fr;q=0.9,en;q=0.8", "fr"],
    ["English first", "en-GB,fr;q=0.5", "en"],
    ["unsupported first, French next", "nl-BE,nl;q=0.9,fr;q=0.8", "fr"],
    ["quality beats order", "en;q=0.4,fr;q=0.9", "fr"],
    ["q=0 means not acceptable", "fr;q=0,en;q=0.1", "en"],
    ["nothing supported", "nl,de", "en"],
    ["wildcard only", "*", "en"],
  ])("%s", (_label, header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });
});

describe("resolveLocale", () => {
  it("prefers the saved choice over the browser", () => {
    expect(resolveLocale("en", "fr-BE")).toBe("en");
  });

  it("ignores an unknown saved value", () => {
    expect(resolveLocale("nl", "fr-BE")).toBe("fr");
  });
});
