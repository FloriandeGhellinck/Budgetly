import type en from "../../../messages/en.json";

export type SeedMessages = (typeof en)["seed"];

// Defaults created at sign-up keep a seed key until renamed (ADR 0026); show
// their translation. A renamed or user-created row shows its stored name.
export function seedLabel(
  seed: SeedMessages,
  kind: keyof SeedMessages,
  row: { name: string; seedKey: string | null },
): string {
  const translations: Record<string, string> = seed[kind];
  return (row.seedKey !== null && translations[row.seedKey]) || row.name;
}
