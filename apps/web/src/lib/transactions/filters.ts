import { DirectionSchema, Id, IsoDate } from "@expense/contract";
import { z } from "zod";

// Transactions per page of the list.
export const PAGE_SIZE = 50;

// The transaction list's filters live in the URL (ADR 0014), so a filtered
// view can be bookmarked and the server renders it. A malformed value is
// dropped rather than failing the page.
const FiltersSchema = z.object({
  text: z.string().trim().min(1).max(200).optional().catch(undefined),
  direction: DirectionSchema.optional().catch(undefined),
  accountId: Id.optional().catch(undefined),
  categoryId: Id.optional().catch(undefined),
  beneficiaryId: Id.optional().catch(undefined),
  tag: z.string().trim().min(1).max(100).optional().catch(undefined),
  from: IsoDate.optional().catch(undefined),
  to: IsoDate.optional().catch(undefined),
});

export type TransactionFilters = z.infer<typeof FiltersSchema>;
export type FilterKey = keyof TransactionFilters;

type SearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(params: SearchParams): TransactionFilters {
  const first = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = FiltersSchema.parse(first);
  // Drop the keys that parsed to undefined, so filters compare by content.
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  ) as TransactionFilters;
}

// The query string for a set of filters, in a stable key order.
export function filtersToSearch(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(FiltersSchema.shape).toSorted()) {
    const value = filters[key as FilterKey];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

// The filters with one key changed; an empty value removes it.
export function withFilter(
  filters: TransactionFilters,
  key: FilterKey,
  value: string | undefined,
): TransactionFilters {
  return parseFilters({ ...filters, [key]: value || undefined });
}

export function hasFilters(filters: TransactionFilters): boolean {
  return Object.keys(filters).length > 0;
}
