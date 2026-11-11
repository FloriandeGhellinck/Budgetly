import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApi, errorCode, type TestApi } from "./test-support.ts";

// ADR 0032: a user with a verified TOTP factor must call with an aal2 token.
let api: TestApi;

beforeAll(async () => {
  api = await createTestApi();
});

afterAll(async () => {
  await api.close();
});

async function userWithFactor(status: "verified" | "unverified" | null) {
  const { userId } = await api.signUp();
  if (status) await api.addFactor(userId, status);
  return userId;
}

describe("MFA enforcement", () => {
  it.each([
    { label: "no aal claim", claims: {} },
    { label: "aal1", claims: { aal: "aal1" } },
  ])("refuses a verified-factor user's token with $label: MFA_REQUIRED", async ({ claims }) => {
    const client = await api.clientFor(await userWithFactor("verified"), claims);
    expect(await errorCode(client.accounts.list({}))).toBe("MFA_REQUIRED");
  });

  it("accepts a verified-factor user's aal2 token", async () => {
    const client = await api.clientFor(await userWithFactor("verified"), { aal: "aal2" });
    expect(await client.accounts.list({})).toEqual({ items: [] });
  });

  it.each([
    { label: "an unverified factor", status: "unverified" as const },
    { label: "no factor", status: null },
  ])("accepts an aal1 token from a user with $label", async ({ status }) => {
    const client = await api.clientFor(await userWithFactor(status), { aal: "aal1" });
    expect(await client.accounts.list({})).toEqual({ items: [] });
  });

  it("does not apply another user's verified factor", async () => {
    await userWithFactor("verified");
    const client = await api.clientFor(await userWithFactor(null), { aal: "aal1" });
    expect(await client.accounts.list({})).toEqual({ items: [] });
  });

  it("refuses before any write happens", async () => {
    const userId = await userWithFactor("verified");
    const client = await api.clientFor(userId, { aal: "aal1" });
    expect(await errorCode(client.me.bootstrap({}))).toBe("MFA_REQUIRED");
    const aal2 = await api.clientFor(userId, { aal: "aal2" });
    expect((await aal2.accounts.list({})).items).toEqual([]);
  });
});
