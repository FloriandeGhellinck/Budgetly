import { z } from "zod";
import { EXAMPLE_IDS, Id, Name, Timestamp } from "./common";
import { errors } from "./errors";
import { procedure } from "./procedure";

// The user's share of an account in basis points (ADR 0026, 0027):
// 10000 = personal (100 %), 5000 = joint account split 50/50.
export const ShareBps = z.int().min(1).max(10_000);

// Informational label in v1 (ADR 0006): amounts are always EUR cents.
const Currency = z.string().trim().min(1).max(10);

export const AccountSchema = z.object({
  id: Id,
  name: z.string(),
  currency: z.string(),
  shareBps: z.int(),
  archivedAt: Timestamp.nullable(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type Account = z.infer<typeof AccountSchema>;

const list = procedure({
  description:
    "List the caller's accounts, active ones first by name. Archived accounts are left out unless includeArchived is true. Every transaction belongs to one of these accounts.",
  examples: [{}, { includeArchived: true }],
  readOnly: true,
  idempotent: true,
  input: z.object({ includeArchived: z.boolean().default(false) }),
  output: z.object({ items: z.array(AccountSchema) }),
  errors: {},
});

const create = procedure({
  description:
    "Create an account: a place money is held or spent from (bank account, card, voucher wallet). shareBps is the caller's share in basis points: 10000 for a personal account (the default), 5000 for a joint account split 50/50. currency is a label (default EUR); amounts stay EUR cents. Check accounts.list first to avoid a duplicate.",
  examples: [
    { name: "Broker" },
    { name: "Joint account", shareBps: 5000 },
    { name: "Crypto card", currency: "EURC" },
  ],
  readOnly: false,
  idempotent: false,
  input: z.object({
    name: Name,
    currency: Currency.default("EUR"),
    shareBps: ShareBps.default(10_000),
  }),
  output: AccountSchema,
  errors: {},
});

const update = procedure({
  description:
    "Change an account's name, currency label or share (basis points: 10000 = 100 %, 5000 = 50 %). Only the fields you pass change. A new share applies to past transactions too, since reports weight every transaction by its account's current share.",
  examples: [
    { id: EXAMPLE_IDS.account, name: "Personal account" },
    { id: EXAMPLE_IDS.account, shareBps: 5000 },
  ],
  readOnly: false,
  idempotent: true,
  input: z.object({
    id: Id,
    name: Name.optional(),
    currency: Currency.optional(),
    shareBps: ShareBps.optional(),
  }),
  output: AccountSchema,
  errors: errors("NOT_FOUND"),
});

const archive = procedure({
  description:
    "Archive an account the caller no longer uses: it leaves accounts.list (unless includeArchived) but keeps its transactions. Archiving an archived account changes nothing. Undo with accounts.unarchive.",
  examples: [{ id: EXAMPLE_IDS.account }],
  readOnly: false,
  idempotent: true,
  input: z.object({ id: Id }),
  output: AccountSchema,
  errors: errors("NOT_FOUND"),
});

const unarchive = procedure({
  description:
    "Bring an archived account back into accounts.list. Unarchiving an active account changes nothing.",
  examples: [{ id: EXAMPLE_IDS.account }],
  readOnly: false,
  idempotent: true,
  input: z.object({ id: Id }),
  output: AccountSchema,
  errors: errors("NOT_FOUND"),
});

export const accountsContract = { list, create, update, archive, unarchive };
