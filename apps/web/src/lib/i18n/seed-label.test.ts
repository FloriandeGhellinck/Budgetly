import { describe, expect, it } from "vitest";
import fr from "../../../messages/fr.json";
import { seedLabel } from "./seed-label";

describe("seedLabel", () => {
  it("translates a default that still has its seed key", () => {
    expect(seedLabel(fr.seed, "categories", { name: "Groceries", seedKey: "groceries" })).toBe(
      "Courses",
    );
  });

  it("shows the stored name once renamed", () => {
    expect(seedLabel(fr.seed, "accounts", { name: "Joint account", seedKey: null })).toBe(
      "Joint account",
    );
  });

  it("falls back to the stored name for a seed key it does not know", () => {
    expect(seedLabel(fr.seed, "categories", { name: "Pets", seedKey: "pets" })).toBe("Pets");
  });
});
