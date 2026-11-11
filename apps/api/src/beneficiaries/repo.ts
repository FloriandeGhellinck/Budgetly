import type { Beneficiary } from "@budgetly/contract";
import { beneficiaries, type Tx } from "@budgetly/db";
import { and, asc, eq } from "drizzle-orm";

type BeneficiaryRow = typeof beneficiaries.$inferSelect;

function toBeneficiary(row: BeneficiaryRow): Beneficiary {
  return { id: row.id, name: row.name, seedKey: row.seedKey };
}

export async function listBeneficiaries(tx: Tx, userId: string): Promise<Beneficiary[]> {
  const rows = await tx
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.userId, userId))
    .orderBy(asc(beneficiaries.name), asc(beneficiaries.id));
  return rows.map(toBeneficiary);
}

export async function insertBeneficiary(
  tx: Tx,
  userId: string,
  name: string,
): Promise<Beneficiary> {
  const [row] = await tx.insert(beneficiaries).values({ userId, name }).returning();
  if (!row) throw new Error("insertBeneficiary: no row returned");
  return toBeneficiary(row);
}

// Null when the caller has no such beneficiary. Like categories, a real
// rename clears the seed key (ADR 0026); the same name leaves it.
export async function renameBeneficiary(
  tx: Tx,
  userId: string,
  id: string,
  name: string,
): Promise<Beneficiary | null> {
  const owned = and(eq(beneficiaries.userId, userId), eq(beneficiaries.id, id));
  const [current] = await tx.select().from(beneficiaries).where(owned);
  if (!current) return null;
  if (current.name === name) return toBeneficiary(current);
  const [row] = await tx
    .update(beneficiaries)
    .set({ name, seedKey: null, updatedAt: new Date() })
    .where(owned)
    .returning();
  if (!row) throw new Error("renameBeneficiary: no row returned");
  return toBeneficiary(row);
}

export async function beneficiaryExists(tx: Tx, userId: string, id: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: beneficiaries.id })
    .from(beneficiaries)
    .where(and(eq(beneficiaries.userId, userId), eq(beneficiaries.id, id)));
  return row !== undefined;
}
