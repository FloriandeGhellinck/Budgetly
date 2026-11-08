import { z } from "zod";
import { AmountMinor, EXAMPLE_IDS, Id, IdempotencyKey, IsoDate, Name } from "./common";
import { errors } from "./errors";
import { procedure } from "./procedure";
import { TransactionSchema } from "./transactions";

export const TransferSchema = z.object({
  transferId: Id,
  // The transfer_out leg, on the account the money left.
  outgoing: TransactionSchema,
  // The transfer_in leg, on the account the money reached.
  incoming: TransactionSchema,
});
export type Transfer = z.infer<typeof TransferSchema>;

const create = procedure({
  description:
    "Move money between two of the caller's accounts (e.g. joint account → Broker). Not spending, not income. Writes two linked transactions: a transfer_out leg of sentAmountMinor on fromAccountId and a transfer_in leg of receivedAmountMinor on toAccountId. receivedAmountMinor defaults to sentAmountMinor; set it lower when fees or a conversion (EUR → EURC) ate part of it. Amounts are positive cents. idempotencyKey is required: a retry with the same key returns the original transfer, even if the other fields differ.",
  examples: [
    {
      fromAccountId: EXAMPLE_IDS.account,
      toAccountId: EXAMPLE_IDS.otherAccount,
      sentAmountMinor: 100000,
      occurredOn: "2026-11-02",
      idempotencyKey: "transfer-2026-11-02-joint",
    },
    {
      fromAccountId: EXAMPLE_IDS.account,
      toAccountId: EXAMPLE_IDS.otherAccount,
      sentAmountMinor: 50000,
      receivedAmountMinor: 49850,
      occurredOn: "2026-11-05",
      name: "Top-up crypto card",
      idempotencyKey: "crypto-card-topup-2026-11-05",
    },
  ],
  readOnly: false,
  idempotent: true,
  input: z.object({
    fromAccountId: Id,
    toAccountId: Id,
    sentAmountMinor: AmountMinor,
    receivedAmountMinor: AmountMinor.optional(),
    occurredOn: IsoDate,
    name: Name.default("Transfer"),
    note: z.string().trim().max(2000).optional(),
    idempotencyKey: IdempotencyKey,
  }),
  output: TransferSchema,
  errors: errors("NOT_FOUND", "TRANSFER_SAME_ACCOUNT", "IDEMPOTENCY_KEY_CONFLICT"),
});

const del = procedure({
  description:
    "Soft-delete both legs of a transfer (transferId from either leg). Undo with transfers.restore. Deleting a deleted transfer changes nothing.",
  examples: [{ transferId: EXAMPLE_IDS.transfer }],
  readOnly: false,
  idempotent: true,
  input: z.object({ transferId: Id }),
  output: TransferSchema,
  errors: errors("NOT_FOUND"),
});

const restore = procedure({
  description:
    "Undo transfers.delete: both legs come back. Restoring a live transfer changes nothing.",
  examples: [{ transferId: EXAMPLE_IDS.transfer }],
  readOnly: false,
  idempotent: true,
  input: z.object({ transferId: Id }),
  output: TransferSchema,
  errors: errors("NOT_FOUND"),
});

export const transfersContract = { create, delete: del, restore };
