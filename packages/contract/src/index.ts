import { accountsContract } from "./accounts";
import { meContract } from "./me";
import { defineContract } from "./procedure";

export const contract = defineContract({
  me: meContract,
  accounts: accountsContract,
});
export type Contract = typeof contract;

export * from "./accounts";
export * from "./common";
export { ERRORS, type ErrorCode } from "./errors";
export { type AgentMeta } from "./procedure";
