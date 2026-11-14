import { type NextRequest, NextResponse } from "next/server";
import { bootstrapAfterSignIn } from "@/lib/api/bootstrap";
import { safeNextPath } from "@/lib/supabase/auth-redirect";
import { createSupabase } from "@/lib/supabase/server";

// Google sign-in and the default Supabase email links return here with a
// PKCE code (ADR 0022, 0030).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=link", request.url));
  const supabase = await createSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
  await bootstrapAfterSignIn(data.session.access_token);
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(next, request.url));
}
