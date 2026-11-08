# apps/web

Next.js (App Router) app. Renders pages and calls `apps/api` **from the server
only** (server components, server actions), forwarding the user's Supabase
session from httpOnly cookies (ADR 0014). No oRPC client ships to the browser.

## Boundaries (enforced by `pnpm checks`)

- Never import `@expense/db` or `@expense/test-db`: data goes through
  `apps/api`. Types come from `@expense/contract`.
- Never import from another app (`@expense/api` or `../api`).
- UI is built from `@expense/ui`; add a missing primitive there first.
- UI copy goes through `next-intl` (English and French, ADR 0020).
