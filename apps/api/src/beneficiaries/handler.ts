import { authed } from "../orpc.ts";
import { insertBeneficiary, listBeneficiaries, renameBeneficiary } from "./repo.ts";

export const list = authed.beneficiaries.list.handler(async ({ context }) => ({
  items: await listBeneficiaries(context.tx, context.userId),
}));

export const create = authed.beneficiaries.create.handler(({ input, context }) =>
  insertBeneficiary(context.tx, context.userId, input.name),
);

export const update = authed.beneficiaries.update.handler(async ({ input, context, errors }) => {
  const beneficiary = await renameBeneficiary(context.tx, context.userId, input.id, input.name);
  if (!beneficiary) {
    throw errors.NOT_FOUND({
      message: "No beneficiary with this id for the caller. List them with beneficiaries.list.",
      data: { entity: "beneficiary" },
    });
  }
  return beneficiary;
});

export const beneficiariesRouter = { list, create, update };
