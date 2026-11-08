// Shared by the *.db.test.ts files: the real app on a migrated test database,
// called over RPC with JWTs signed by a key pair generated for the run.
import type { Contract } from "@expense/contract";
import { createDb, type Db } from "@expense/db";
import { appRoleUrl, createTestDatabase, migrate } from "@expense/test-db";
import { createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { createApp } from "./app.ts";
import { createTokenVerifier } from "./auth.ts";

export type Client = ContractRouterClient<Contract>;

const ISSUER = "http://supabase.test/auth/v1";
const AUDIENCE = "authenticated";
const KID = "test-key";

export type TestApi = {
  // Superuser: bypasses RLS, for fixtures and for reading the truth.
  admin: Db;
  // A new Supabase user (row in auth.users) and a client signed in as them.
  signUp(): Promise<{ userId: string; client: Client }>;
  // A client sending this exact Authorization header.
  clientWithHeader(authorization: string | undefined): Client;
  fetch(request: Request): Promise<Response>;
  close(): Promise<void>;
};

export async function createTestApi(): Promise<TestApi> {
  const database = await createTestDatabase();
  await migrate(database.sql);
  const admin = createDb(database.url);
  // As in production: the API logs in as app_runtime, so RLS applies.
  const appDb = createDb(appRoleUrl(database.url));

  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: KID, alg: "ES256" };
  const app = createApp({
    db: appDb,
    verifyToken: createTokenVerifier({
      keys: createLocalJWKSet({ keys: [jwk] }),
      issuer: ISSUER,
      audience: AUDIENCE,
    }),
  });
  const fetch = async (request: Request) => app.fetch(request);

  function clientWithHeader(authorization: string | undefined): Client {
    const link = new RPCLink({
      url: "http://api.test/rpc",
      headers: authorization ? { authorization } : {},
      fetch,
    });
    return createORPCClient(link);
  }

  return {
    admin,
    fetch,
    clientWithHeader,
    async signUp() {
      const userId = randomUUID();
      await database.sql`insert into auth.users (id) values (${userId})`;
      const token = await new SignJWT({ role: "authenticated" })
        .setProtectedHeader({ alg: "ES256", kid: KID })
        .setSubject(userId)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);
      return { userId, client: clientWithHeader(`Bearer ${token}`) };
    },
    async close() {
      await Promise.all([admin.$client.end(), appDb.$client.end()]);
      await database.close();
    },
  };
}

// The declared error code a call failed with.
export async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ORPCError) return error.code;
    throw error;
  }
  throw new Error("errorCode: expected the call to fail, but it succeeded");
}
