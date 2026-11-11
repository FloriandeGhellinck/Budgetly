// Pages a signed-out visitor may open. Everything else redirects to /login.
const PUBLIC_PREFIXES = ["/login", "/auth"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
