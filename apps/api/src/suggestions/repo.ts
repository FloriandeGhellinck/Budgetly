import { transactions, type Tx } from "@expense/db";
import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { containsPattern } from "../like.ts";
import type { Candidate } from "./rank.ts";

// How far back "recent" reaches: the latest matching transactions only.
const CANDIDATE_WINDOW = 500;

// The caller's latest live expenses and incomes whose name contains `name`.
export async function findCandidates(tx: Tx, userId: string, name: string): Promise<Candidate[]> {
  const rows = await tx
    .select({
      name: transactions.name,
      direction: transactions.direction,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      beneficiaryId: transactions.beneficiaryId,
      occurredOn: transactions.occurredOn,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        inArray(transactions.direction, ["expense", "income"]),
        ilike(transactions.name, containsPattern(name.trim())),
      ),
    )
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(CANDIDATE_WINDOW);
  return rows.map((row) => ({
    ...row,
    direction: row.direction === "income" ? "income" : "expense",
  }));
}
