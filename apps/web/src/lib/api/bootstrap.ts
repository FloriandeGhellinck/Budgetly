import "server-only";
import { createApiClient } from "./server";

// First authenticated request after sign-in: create the user's defaults
// (me.bootstrap is idempotent, ADR 0021, 0027). A failure must not block the
// sign-in; getEntryOptions retries when it finds no account.
export async function bootstrapAfterSignIn(accessToken: string): Promise<void> {
  try {
    await createApiClient(accessToken).me.bootstrap({});
  } catch (error) {
    console.error("me.bootstrap failed after sign-in", error);
  }
}
