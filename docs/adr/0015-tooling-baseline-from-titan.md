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

## Notes

TypeScript 7 has no programmatic API (2026-11-08 scaffold):

- **Titan** type-checks with `tsgo` (`@typescript/native-preview`) in every
  package, has no `typescript` dependency in its web app, and sets
  `typescript.ignoreBuildErrors: true` in `next.config.ts` so `next build`
  never type-checks. Only its Expo app installs `typescript@~6`, for Expo's
  use of the API.
- **expense** uses `typescript@7.0.2` (catalog) in every package and runs
  `tsc` for `pnpm typecheck`. Type-aware oxlint (`oxlint-tsgolint`), tsdown
  (`dts: false`) and Vitest do not need the TS API.
- A tool that calls `require("typescript")` (expected: Next's build-time
  TypeScript setup) gets, in that package only, `"typescript":
  "npm:@typescript/typescript6@6.0.2"` plus `"@typescript/tsc7":
  "npm:typescript@7.0.2"`: the API resolves to 6, the `tsc` bin stays 7
  (TS 6 ships its bin as `tsc6`). `apps/web` also copies Titan's
  `ignoreBuildErrors: true`; `pnpm typecheck` is the type gate. The web
  scaffold must verify this with a real `next build`.
- Libraries build with tsdown on `prepare`, as in Titan, without `.d.ts`:
  `types` points at `src`, which is also what tsgolint reads.
- `postgres` is pinned to 3.x: 4.x exists, but its compatibility with
  Drizzle 0.45 is unverified.
