// Where a sign-in may send the user afterwards: a path on this site only, so
// a crafted `next` can never become an open redirect.
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  const base = "http://budgetly.invalid";
  const url = new URL(value, base);
  if (url.origin !== base) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

// A PKCE `code` that lands outside /auth (Supabase falls back to the site
// URL) is sent on to /auth/callback instead of being dropped by the
// signed-out redirect. Only the code and a safe `next` travel along.
export function callbackForwardPath(pathname: string, params: URLSearchParams): string | null {
  const code = params.get("code");
  if (!code || pathname === "/auth" || pathname.startsWith("/auth/")) return null;
  const forward = new URLSearchParams({ code });
  const next = params.get("next");
  if (next) forward.set("next", safeNextPath(next));
  return `/auth/callback?${forward.toString()}`;
}
