import { z } from "zod";
import { EXAMPLE_IDS, Id, Name } from "./common";
import { errors } from "./errors";
import { procedure } from "./procedure";

export const BeneficiarySchema = z.object({
  id: Id,
  name: z.string(),
  // "me" on the default created at sign-up; cleared on rename.
  seedKey: z.string().nullable(),
});
export type Beneficiary = z.infer<typeof BeneficiarySchema>;

const list = procedure({
  description:
    'List the caller\'s beneficiaries by name: who a transaction is for (Me, Children…), independent of its category. The default one has seedKey "me".',
  examples: [{}],
  readOnly: true,
  idempotent: true,
  input: z.object({}),
  output: z.object({ items: z.array(BeneficiarySchema) }),
  errors: {},
});

const create = procedure({
  description:
    "Create a beneficiary (who money is spent for, e.g. Children or a partner). Check beneficiaries.list first to avoid a duplicate.",
  examples: [{ name: "Children" }],
  readOnly: false,
  idempotent: false,
  input: z.object({ name: Name }),
  output: BeneficiarySchema,
  errors: {},
});

const update = procedure({
  description:
    'Rename a beneficiary. Renaming the default (seedKey "me") clears its seedKey, so the UI shows the new name instead of a translation.',
  examples: [{ id: EXAMPLE_IDS.beneficiary, name: "Kids" }],
  readOnly: false,
  idempotent: true,
  input: z.object({ id: Id, name: Name }),
  output: BeneficiarySchema,
  errors: errors("NOT_FOUND"),
});

export const beneficiariesContract = { list, create, update };
