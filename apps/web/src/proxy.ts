import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Static assets and PWA files skip the session refresh.
  matcher: [
    "/((?!_next/static|_next/image|manifest.webmanifest|icons/|.*\\.(?:ico|svg|png|webp)$).*)",
  ],
};
