import type { ReferenceProblem } from "./repo.ts";

type Entity = "account" | "category" | "beneficiary" | "transaction";

// The slice of a procedure's `errors` these helpers throw.
export type ReferenceErrors = {
  NOT_FOUND: (options: { message: string; data: { entity: Entity } }) => Error;
  CATEGORY_DIRECTION_MISMATCH: (options?: { message?: string }) => Error;
};

export function notFound(errors: Pick<ReferenceErrors, "NOT_FOUND">, entity: Entity): Error {
  const lists: Record<Entity, string> = {
    account: "accounts.list",
    category: "categories.list",
    beneficiary: "beneficiaries.list",
    transaction: "transactions.list",
  };
  return errors.NOT_FOUND({
    message: `No ${entity} with this id for the caller. Find valid ids with ${lists[entity]}.`,
    data: { entity },
  });
}

export function referenceError(errors: ReferenceErrors, problem: ReferenceProblem): Error {
  switch (problem) {
    case "account_not_found":
      return notFound(errors, "account");
    case "category_not_found":
      return notFound(errors, "category");
    case "beneficiary_not_found":
      return notFound(errors, "beneficiary");
    case "category_direction_mismatch":
      return errors.CATEGORY_DIRECTION_MISMATCH();
  }
}

// Backstops for the composite foreign keys, should a reference change
// between the check and the write.
export function referenceConstraints(errors: ReferenceErrors) {
  return {
    transactions_account_fk: () => notFound(errors, "account"),
    transactions_beneficiary_fk: () => notFound(errors, "beneficiary"),
    transactions_category_fk: () => errors.CATEGORY_DIRECTION_MISMATCH(),
  };
}
