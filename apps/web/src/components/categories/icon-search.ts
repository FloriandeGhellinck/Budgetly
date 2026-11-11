import type { CategoryIcon } from "@budgetly/contract";

// The words an icon is found by in the picker: its lucide name, spaced
// ("shopping-cart" → "shopping cart").
export function iconSearchText(icon: CategoryIcon): string {
  return icon.replaceAll("-", " ");
}
