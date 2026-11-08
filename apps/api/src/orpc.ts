import { contract } from "@expense/contract";
import { withUser, type Db, type Tx } from "@expense/db";
import { implement, ORPCError } from "@orpc/server";
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

// Verifies the caller, then runs the call in one transaction bound to them for
// RLS (ADR 0013). One middleware, so no procedure can get a transaction
// without a verified user. A thrown error, declared or not, rolls back
// everything the handler wrote.
const asVerifiedUser = os.middleware(async ({ context, next }) => {
  const token = bearerToken(context.authorization);
  const userId = token ? await context.verifyToken(token) : null;
  if (!userId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Send a valid Supabase access token as `Authorization: Bearer <token>`.",
    });
  }
  return withUser(context.db, userId, async (tx: Tx) => await next({ context: { userId, tx } }));
});

// Every procedure is implemented on this builder: `context.userId` is the
// verified caller and `context.tx` their transaction.
export const authed = os.use(asVerifiedUser);
