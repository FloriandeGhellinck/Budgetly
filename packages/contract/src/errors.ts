import type { ErrorMap } from "@orpc/contract";
import { z } from "zod";

// Every declared error a procedure can throw: a stable code, an HTTP status
// (oRPC answers 500 for a custom code without one) and a default message
// written for an agent. Handlers may pass a more specific message.
export const ERRORS = {
  NOT_FOUND: {
    status: 404,
    message: "No such record for this user.",
    data: z.object({
      entity: z.enum([
        "account",
        "category",
        "category_group",
        "beneficiary",
        "transaction",
        "transfer",
        "tag",
      ]),
    }),
  },
  CATEGORY_DIRECTION_MISMATCH: {
    status: 422,
    message:
      "The category belongs to the other direction (expense vs income). Pick a category from a group with the transaction's direction (categories.list).",
  },
  CATEGORY_IN_USE: {
    status: 409,
    message:
      "Transactions (including deleted ones) still use this category. Move them to another category first, or rename the category instead.",
  },
  TRANSFER_SAME_ACCOUNT: {
    status: 422,
    message: "A transfer needs two different accounts.",
  },
  TRANSFER_LEG: {
    status: 422,
    message:
      "This transaction is one leg of a transfer. Use transfers.delete or transfers.restore with its transferId.",
  },
  IDEMPOTENCY_KEY_CONFLICT: {
    status: 409,
    message:
      "This idempotencyKey was already used for a different kind of write. Use a fresh key for each new write.",
  },
  INVALID_CURSOR: {
    status: 400,
    message: "The cursor is malformed. Pass back nextCursor exactly as returned, or omit it.",
  },
} as const satisfies ErrorMap;

export type ErrorCode = keyof typeof ERRORS;

// The subset of ERRORS a procedure declares.
export function errors<const K extends ErrorCode>(...codes: K[]): Pick<typeof ERRORS, K> {
  return Object.fromEntries(codes.map((code) => [code, ERRORS[code]])) as Pick<typeof ERRORS, K>;
}
