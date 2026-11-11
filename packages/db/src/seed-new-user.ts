import { eq } from "drizzle-orm";
import type { Tx } from "./client";
import {
  accounts,
  beneficiaries,
  categories,
  categoryGroups,
  type CategoryPaletteColor,
} from "./schema";

// The defaults a new user starts with (ADR 0021 as amended by 0023). Names are
// stored in English; the UI translates rows that still carry their seed key.
// Colours and icons come from the contract's allow-lists (ADR 0034); the
// backfill migration 20261111095706 repeats them for older users.
const DEFAULT_GROUPS = [
  {
    seedKey: "daily_life",
    color: "teal",
    icon: "house",
    name: "Daily life",
    direction: "expense",
    kind: "spending",
    categories: [
      { seedKey: "groceries", name: "Groceries", icon: "shopping-cart" },
      { seedKey: "health", name: "Health", icon: "pill" },
      { seedKey: "clothing", name: "Clothing", icon: "shirt" },
      { seedKey: "furniture", name: "Furniture", icon: "sofa" },
      { seedKey: "childcare", name: "Childcare", icon: "baby" },
    ],
  },
  {
    seedKey: "leisure",
    color: "orange",
    icon: "party-popper",
    name: "Leisure",
    direction: "expense",
    kind: "spending",
    categories: [
      { seedKey: "holidays", name: "Holidays", icon: "tree-palm" },
      { seedKey: "outings", name: "Outings", icon: "ticket" },
      { seedKey: "gifts", name: "Gifts", icon: "gift" },
      { seedKey: "sport", name: "Sport", icon: "dumbbell" },
    ],
  },
  {
    seedKey: "investment",
    color: "violet",
    icon: "piggy-bank",
    name: "Investment",
    direction: "expense",
    kind: "saving",
    categories: [
      { seedKey: "stocks", name: "Stocks", icon: "trending-up" },
      { seedKey: "crypto", name: "Crypto", icon: "bitcoin" },
      { seedKey: "real_estate", name: "Real estate", icon: "building-2" },
    ],
  },
  {
    seedKey: "debt",
    color: "slate",
    icon: "landmark",
    name: "Debt",
    direction: "expense",
    kind: "spending",
    categories: [{ seedKey: "loan_repayment", name: "Loan repayment", icon: "hand-coins" }],
  },
  {
    seedKey: "income",
    color: "green",
    icon: "wallet",
    name: "Income",
    direction: "income",
    kind: null,
    categories: [
      { seedKey: "salary", name: "Salary", icon: "briefcase" },
      { seedKey: "meal_vouchers", name: "Meal vouchers", icon: "utensils" },
      { seedKey: "other_income", name: "Other income", icon: "coins" },
    ],
  },
] as const satisfies readonly ({ color: CategoryPaletteColor } & Record<string, unknown>)[];

type DefaultGroup = (typeof DEFAULT_GROUPS)[number];

export type CategoryGroupSeedKey = DefaultGroup["seedKey"];
export type CategorySeedKey = DefaultGroup["categories"][number]["seedKey"];
export type BeneficiarySeedKey = "me";
export type AccountSeedKey = "main";

// Runs inside `withUser(db, userId, …)`, so RLS lets it write only that
// user's rows. A user who already has an account is left untouched, which
// makes a retried sign-up safe.
export async function seedNewUser(tx: Tx, userId: string): Promise<void> {
  const existing = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  await tx
    .insert(accounts)
    .values({ userId, name: "Main", seedKey: "main", currency: "EUR", shareBps: 10000 });
  await tx.insert(beneficiaries).values({ userId, name: "Me", seedKey: "me" });

  const groups = await tx
    .insert(categoryGroups)
    .values(
      DEFAULT_GROUPS.map((group, index) => ({
        userId,
        seedKey: group.seedKey,
        name: group.name,
        direction: group.direction,
        kind: group.kind,
        color: group.color,
        icon: group.icon,
        sortOrder: index,
      })),
    )
    .returning({ id: categoryGroups.id, seedKey: categoryGroups.seedKey });
  const groupIds = new Map(groups.map((group) => [group.seedKey, group.id]));

  await tx.insert(categories).values(
    DEFAULT_GROUPS.flatMap((group) =>
      group.categories.map((category, index) => {
        const groupId = groupIds.get(group.seedKey);
        if (!groupId) throw new Error(`seedNewUser: group ${group.seedKey} was not created`);
        return {
          userId,
          groupId,
          direction: group.direction,
          seedKey: category.seedKey,
          name: category.name,
          icon: category.icon,
          sortOrder: index,
        };
      }),
    ),
  );
}
