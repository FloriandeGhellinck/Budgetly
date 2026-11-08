import { generateKeyPair, SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApi, errorCode, type TestApi } from "./test-support.ts";

let api: TestApi;
let forged: string;

beforeAll(async () => {
  api = await createTestApi();
  // The claims the API expects, signed by a key it does not trust.
  const { privateKey } = await generateKeyPair("ES256");
  forged = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setSubject((await api.signUp()).userId)
    .setIssuer("http://supabase.test/auth/v1")
    .setAudience("authenticated")
    .setExpirationTime("1h")
    .sign(privateKey);
});

afterAll(async () => {
  await api.close();
});

describe("authentication", () => {
  it.each([
    { label: "no Authorization header", header: () => undefined },
    { label: "a non-bearer header", header: () => "Basic dXNlcjpwYXNz" },
    { label: "a token signed by another key", header: () => `Bearer ${forged}` },
  ])("refuses $label with UNAUTHORIZED", async ({ header }) => {
    const client = api.clientWithHeader(header());
    expect(await errorCode(client.accounts.list({}))).toBe("UNAUTHORIZED");
  });

  it("answers /health without a token", async () => {
    const response = await api.fetch(new Request("http://api.test/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
