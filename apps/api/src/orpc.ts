import { contract, ERRORS } from "@expense/contract";
import { withUser, type Db, type Tx } from "@expense/db";
import { implement, ORPCError } from "@orpc/server";
import { sql } from "drizzle-orm";
import { bearerToken, type VerifyToken } from "./auth.ts";

export type { Tx } from "@expense/db";

// What the HTTP layer hands every call. Nothing here comes from the caller
// except the raw Authorization header, which is verified below.
export type BaseContext = {
  db: Db;
  verifyToken: VerifyToken;
  authorization: string | undefined;
};

export const os = implement(contract).$context<BaseContext>();

// Whether the user bound by withUser has a verified second factor. Read
// through a narrowly granted function: app_runtime cannot see auth.* (ADR 0032).
async function hasVerifiedFactor(tx: Tx): Promise<boolean> {
  const rows = await tx.execute<{ verified: boolean }>(
    sql`select private.current_user_has_verified_factor() as verified`,
  );
  return rows[0]?.verified === true;
}

// Verifies the caller, then runs the call in one transaction bound to them for
// RLS (ADR 0013). One middleware, so no procedure can get a transaction
// without a verified user. A user with a verified TOTP factor must send an
// aal2 token (ADR 0032). A thrown error, declared or not, rolls back
// everything the handler wrote.
const asVerifiedUser = os.middleware(async ({ context, next }) => {
  const token = bearerToken(context.authorization);
  const verified = token ? await context.verifyToken(token) : null;
  if (!verified) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Send a valid Supabase access token as `Authorization: Bearer <token>`.",
    });
  }
  const { userId, aal } = verified;
  return withUser(context.db, userId, async (tx: Tx) => {
    if (aal !== "aal2" && (await hasVerifiedFactor(tx))) {
      const { status, message } = ERRORS.MFA_REQUIRED;
      throw new ORPCError("MFA_REQUIRED", { status, message });
    }
    return await next({ context: { userId, tx } });
  });
});

// Every procedure is implemented on this builder: `context.userId` is the
// verified caller and `context.tx` their transaction.
export const authed = os.use(asVerifiedUser);
