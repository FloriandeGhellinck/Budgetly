import { Id, YearMonth } from "@budgetly/contract";
import { z } from "zod";
import { monthOf } from "../dates";

// The dashboard's month and beneficiary filter live in the URL, like the
// transaction filters: a bad value is dropped, a missing month is this month.
const ParamsSchema = z.object({
  month: YearMonth.optional().catch(undefined),
  beneficiaryId: Id.optional().catch(undefined),
});

export type DashboardParams = { month: string; beneficiaryId?: string };

type SearchParams = Record<string, string | string[] | undefined>;

export function parseDashboardParams(params: SearchParams, now: Date): DashboardParams {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const parsed = ParamsSchema.parse({
    month: first(params["month"]),
    beneficiaryId: first(params["beneficiaryId"]),
  });
  return {
    month: parsed.month ?? monthOf(now),
    ...(parsed.beneficiaryId ? { beneficiaryId: parsed.beneficiaryId } : {}),
  };
}

// The dashboard URL for these params; this month is left implicit.
export function dashboardHref(params: DashboardParams, now: Date): string {
  const search = new URLSearchParams();
  if (params.beneficiaryId) search.set("beneficiaryId", params.beneficiaryId);
  if (params.month !== monthOf(now)) search.set("month", params.month);
  const query = search.toString();
  return query ? `/?${query}` : "/";
}
