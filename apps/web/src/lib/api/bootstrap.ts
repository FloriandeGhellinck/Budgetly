import "server-only";
import { ORPCError } from "@orpc/client";
import { createApiClient } from "./server";

// First authenticated request after sign-in: create the user's defaults
// (me.bootstrap is idempotent, ADR 0021, 0027). A failure must not block the
// sign-in; getEntryOptions retries when it finds no account.
export async function bootstrapAfterSignIn(accessToken: string): Promise<void> {
  try {
    await createApiClient(accessToken).me.bootstrap({});
  } catch (error) {
    // A TOTP user is still at aal1 here; the layout retries after /login/mfa.
    if (error instanceof ORPCError && error.code === "MFA_REQUIRED") return;
    console.error("me.bootstrap failed after sign-in", error);
  }
}
