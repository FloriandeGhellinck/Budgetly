import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabase } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

// The signed-in user, verified once per request, or a redirect to /login.
// A user with a TOTP factor must also have passed it this session (ADR 0022).
export const requireUser = cache(async (): Promise<SessionUser> => {
  const supabase = await createSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");
  // The verified token says which level this session reached. Below aal2,
  // ask Auth for the user's factors: the copy in the cookie is not signed.
  if (claims.aal !== "aal2") {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) redirect("/login");
    if (user.user.factors?.some((factor) => factor.status === "verified")) redirect("/login/mfa");
  }
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
