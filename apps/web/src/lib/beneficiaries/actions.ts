"use server";

import type { Beneficiary } from "@expense/contract";
import type { ActionResult } from "@/lib/action-result";
import { runWrite } from "@/lib/api/action";

// Server actions for beneficiaries ("for whom"); they cannot be deleted yet (ADR 0027).

export async function createBeneficiary(name: string): Promise<ActionResult<Beneficiary>> {
  return runWrite((api) => api.beneficiaries.create({ name }));
}

export async function renameBeneficiary(
  id: string,
  name: string,
): Promise<ActionResult<Beneficiary>> {
  return runWrite((api) => api.beneficiaries.update({ id, name }));
}
