"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { createSupabase } from "@/lib/supabase/server";

// Every auth call runs here, on the server: the session cookies are httpOnly,
// so the browser has no Supabase client (ADR 0030).

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; error: "invalidEmail" | "failed" };

export async function sendMagicLink(
  _previous: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = z.email().safeParse(field(formData, "email").trim());
  if (!email.success) return { status: "error", error: "invalidEmail" };
  const supabase = await createSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    // The default Supabase email (production, no custom SMTP) follows this
    // with a PKCE code; our own template links to /auth/confirm instead.
    options: {
      shouldCreateUser: true,
      emailRedirectTo: new URL("/auth/callback", env().SITE_URL).toString(),
    },
  });
  if (error) {
    console.error("signInWithOtp failed", error.message);
    return { status: "error", error: "failed" };
  }
  return { status: "sent", email: email.data };
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/auth/callback", env().SITE_URL).toString() },
  });
  if (error || !data.url) redirect("/login?error=link");
  redirect(data.url);
}

export type MfaState = { error: "invalidCode" | null };

// Second step of a sign-in for users with a TOTP factor (ADR 0022).
export async function verifyMfa(_previous: MfaState, formData: FormData): Promise<MfaState> {
  const code = field(formData, "code").replace(/\s/g, "");
  const supabase = await createSupabase();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor || !/^\d{6}$/.test(code)) return { error: "invalidCode" };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: "invalidCode" };
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
