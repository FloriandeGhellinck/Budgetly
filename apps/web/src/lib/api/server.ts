import "server-only";
import type { Contract } from "@budgetly/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { cache } from "react";
import { env } from "@/lib/env";
import { createSupabase } from "@/lib/supabase/server";

export type Api = ContractRouterClient<Contract>;

// The only way apps/web reaches data: an oRPC client for apps/api carrying the
// user's access token from the httpOnly session cookie. Server components and
// server actions only; never imported by a "use client" file (ADR 0014,
// enforced by scripts/check-boundaries.ts and `server-only`).
export const getApi = cache(async (): Promise<Api> => {
  const supabase = await createSupabase();
  // apps/api verifies the token itself; the proxy has already refreshed it.
  const { data } = await supabase.auth.getSession();
  return createApiClient(data.session?.access_token);
});

// For the one place the token is not yet in the request's cookies: right
// after sign-in, with the session the auth call just returned.
export function createApiClient(accessToken: string | undefined): Api {
  const link = new RPCLink({
    url: new URL("/rpc", env().API_URL).toString(),
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });
  return createORPCClient(link);
}
