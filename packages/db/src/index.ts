import type {
  accounts,
  beneficiaries,
  categories,
  categoryGroups,
  categoryKind,
  direction,
  tags,
  transactions,
  transactionTags,
} from "./schema";

export { createDb, type Db, type Tx } from "./client";
export * from "./schema";
export {
  seedNewUser,
  type BeneficiarySeedKey,
  type CategoryGroupSeedKey,
  type CategorySeedKey,
} from "./seed-new-user";
export { withUser } from "./with-user";

// Row types for packages/contract, which may only `import type` from here.
export type Direction = (typeof direction.enumValues)[number];
export type CategoryKind = (typeof categoryKind.enumValues)[number];
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type CategoryGroup = typeof categoryGroups.$inferSelect;
export type NewCategoryGroup = typeof categoryGroups.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Beneficiary = typeof beneficiaries.$inferSelect;
export type NewBeneficiary = typeof beneficiaries.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionTag = typeof transactionTags.$inferSelect;
export type NewTransactionTag = typeof transactionTags.$inferInsert;
