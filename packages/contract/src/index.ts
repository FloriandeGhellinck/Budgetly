import { accountsContract } from "./accounts";
import { beneficiariesContract } from "./beneficiaries";
import { categoriesContract } from "./categories";
import { meContract } from "./me";
import { defineContract } from "./procedure";
import { reportsContract } from "./reports";
import { suggestionsContract } from "./suggestions";
import { tagsContract } from "./tags";
import { transactionsContract } from "./transactions";
import { transfersContract } from "./transfers";

export const contract = defineContract({
  me: meContract,
  accounts: accountsContract,
  categories: categoriesContract,
  beneficiaries: beneficiariesContract,
  tags: tagsContract,
  transactions: transactionsContract,
  transfers: transfersContract,
  suggestions: suggestionsContract,
  reports: reportsContract,
});
export type Contract = typeof contract;

export * from "./accounts";
export * from "./beneficiaries";
export * from "./categories";
export * from "./common";
export { ERRORS, type ErrorCode } from "./errors";
export { type AgentMeta } from "./procedure";
export * from "./reports";
export * from "./suggestions";
export * from "./tags";
export * from "./transactions";
export * from "./transfers";
