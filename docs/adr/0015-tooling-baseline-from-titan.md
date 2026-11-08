# 15. Tooling baseline mirrors Titan, on the latest versions

Status: accepted (2026-11-08)

## Decision

Reuse the author's Titan project conventions, upgraded where newer stable
versions exist:

- **pnpm 12** workspace with catalogs; **Node 26** (Active LTS).
- **TypeScript 7.0** stable (`tsc`), strict, `noUncheckedIndexedAccess`.
- **oxlint** (type-aware via tsgolint) + **oxfmt**. No ESLint
  (typescript-eslint does not support TS 7 yet).
- **Vitest 5**, DB tests on a throwaway Postgres in Docker, **Playwright** e2e.
- **lefthook** git hooks, Conventional Commits.
- **Drizzle ORM 0.45** stable (not the 1.0 RC), Postgres driver `postgres`.
- **Hono + oRPC 1.x**, contract-first; each procedure = contract → `repo.ts`
  (Drizzle) → `handler.ts` → router.
- **shadcn/ui (Base UI)** + Tailwind v4 in a shared `ui` package.
- Hosting: **Vercel** (web + api) + **Supabase**.

Layout:

```
apps/web          Next.js app
apps/api          Hono + oRPC + MCP
packages/contract oRPC contracts (shared types)
packages/db       Drizzle schema + migrations + RLS
packages/ui       shadcn components
```
