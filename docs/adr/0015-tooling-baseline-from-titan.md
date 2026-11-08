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
- **Next 16.4 needs no TypeScript 6** (verified 2026-11-08 with a real
  `next build` of `apps/web`). Its `experimental.useTypeScriptCli` is on by
  default: when the installed `typescript` has no compiler API, `next build`
  spawns the `tsc` 7 CLI on the app's `tsconfig.json` ("Running
  TypeScript … Finished TypeScript"). So `apps/web` uses the catalog
  `typescript@7.0.2` like every package, without the
  `@typescript/typescript6` alias and without Titan's
  `typescript.ignoreBuildErrors`: a type error fails both `pnpm typecheck`
  and `next build`. `pnpm typecheck` runs `next typegen` first, since the
  generated `next-env.d.ts` and route types are gitignored.
- Libraries build with tsdown on `prepare`, as in Titan, without `.d.ts`:
  `types` points at `src`, which is also what tsgolint reads.
- `postgres` is pinned to 3.x: 4.x exists, but its compatibility with
  Drizzle 0.45 is unverified.
