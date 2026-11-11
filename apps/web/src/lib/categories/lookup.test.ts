import { describe, expect, it } from "vitest";
import type { CategoryGroupOption } from "@/lib/entry-options";
import { categoryLookup } from "./lookup";

const groups: CategoryGroupOption[] = [
  {
    id: "g1",
    label: "Daily life",
    direction: "expense",
    color: "teal",
    icon: "house",
    categories: [{ id: "c1", label: "Groceries", color: "teal", icon: "shopping-cart" }],
  },
];

describe("categoryLookup", () => {
  it("finds a category by id, and nothing for null or an unknown id", () => {
    const find = categoryLookup(groups);
    expect(find("c1")).toMatchObject({ label: "Groceries", icon: "shopping-cart" });
    expect(find(null)).toBeNull();
    expect(find("nope")).toBeNull();
  });
});
