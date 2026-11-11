import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { bootstrapAfterSignIn } from "@/lib/api/bootstrap";
import { createSupabase } from "@/lib/supabase/server";

// Must match the `type` in supabase/templates/*.html.
const ALLOWED_TYPES = new Set<EmailOtpType>(["email", "magiclink", "signup"]);

function isAllowedType(type: string | null): type is EmailOtpType {
  return type !== null && ALLOWED_TYPES.has(type as EmailOtpType);
}

// The magic link lands here: the token hash becomes an httpOnly cookie session.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || !isAllowedType(type)) {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
  const supabase = await createSupabase();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.session) {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
  await bootstrapAfterSignIn(data.session.access_token);
  return NextResponse.redirect(new URL("/", request.url));
}
