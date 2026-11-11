import type { CookieOptionsWithName } from "@supabase/ssr";

// The session lives in httpOnly cookies: page JavaScript can never read the
// token (ADR 0014). Every auth call therefore runs on the server (ADR 0030).
export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
