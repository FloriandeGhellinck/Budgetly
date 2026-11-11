import { beneficiaries } from "@budgetly/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestApi,
  errorCode,
  signUpSeeded,
  type SeededUser,
  type TestApi,
} from "../test-support.ts";

let api: TestApi;
let alice: SeededUser;
let bob: SeededUser;

beforeAll(async () => {
  api = await createTestApi();
  [alice, bob] = await Promise.all([signUpSeeded(api), signUpSeeded(api)]);
});

afterAll(async () => {
  await api.close();
});

async function storedBeneficiary(id: string) {
  const [row] = await api.admin.select().from(beneficiaries).where(eq(beneficiaries.id, id));
  return row;
}

describe("beneficiaries", () => {
  it("lists a created beneficiary next to the default Me", async () => {
    const children = await alice.client.beneficiaries.create({ name: "Children" });

    const { items } = await alice.client.beneficiaries.list({});

    expect(items.map((b) => [b.name, b.seedKey])).toEqual([
      ["Children", null],
      ["Me", "me"],
    ]);
    expect(items[0]?.id).toBe(children.id);
  });

  it("clears the seed key when the default is renamed", async () => {
    const renamed = await alice.client.beneficiaries.update({
      id: alice.beneficiaryId,
      name: "Alex",
    });

    expect(renamed).toMatchObject({ name: "Alex", seedKey: null });
  });
});

describe("beneficiaries: another user", () => {
  it("does not see them", async () => {
    const { items } = await bob.client.beneficiaries.list({});

    expect(items.map((b) => b.id)).not.toContain(alice.beneficiaryId);
  });

  it("cannot rename them: NOT_FOUND, row unchanged", async () => {
    const before = await storedBeneficiary(alice.beneficiaryId);

    const code = await errorCode(
      bob.client.beneficiaries.update({ id: alice.beneficiaryId, name: "Spy" }),
    );

    expect(code).toBe("NOT_FOUND");
    expect(await storedBeneficiary(alice.beneficiaryId)).toEqual(before);
  });
});
