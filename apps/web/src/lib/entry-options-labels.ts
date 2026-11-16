import type { EntryOptions, Option } from "./entry-options";

export type OptionLabels = Record<
  "account" | "group" | "category" | "beneficiary",
  (id: string | null, storedName: string | null) => string | null
>;

// Reports return stored names; these give the translated label of a row the
// options know (a default keeps its seed translation), else the stored name.
export function optionLabels(options: EntryOptions): OptionLabels {
  const index = (rows: Option[]) => {
    const labels = new Map(rows.map((row) => [row.id, row.label]));
    return (id: string | null, storedName: string | null) =>
      (id !== null && labels.get(id)) || storedName;
  };
  return {
    account: index(options.accounts),
    group: index(options.categoryGroups),
    category: index(options.categoryGroups.flatMap((group) => group.categories)),
    beneficiary: index(options.beneficiaries),
  };
}
