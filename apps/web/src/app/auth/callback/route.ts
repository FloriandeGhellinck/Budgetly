import { type NextRequest, NextResponse } from "next/server";
import { bootstrapAfterSignIn } from "@/lib/api/bootstrap";
import { createSupabase } from "@/lib/supabase/server";

// Google sign-in returns here with a PKCE code (ADR 0022).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=link", request.url));
  const supabase = await createSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
  await bootstrapAfterSignIn(data.session.access_token);
  return NextResponse.redirect(new URL("/", request.url));
}
