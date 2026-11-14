# 28. apps/api runs as a zero-config Hono app on Vercel

Status: accepted (2026-11-08)

## Context

Titan wraps its Hono app in Nitro to deploy on Vercel, because it needs
server assets, workers and bundling tweaks. `apps/api` has none of that.

## Decision

- `apps/api/src/index.ts` default-exports the Hono app. Vercel's Hono
  preset detects it (`src/index.ts` is one of its entry names) and serves
  every route as a Vercel Function on Fluid compute. No Nitro, no
  `vercel.json`. The preset tries `app`, `index`, `server` (root, then
  `src/`) and keeps only files that import `"hono"`, so `index.ts` imports
  it and no other file uses those names.
- The app is built by `createApp(deps)` in `src/create-app.ts`; `index.ts` only
  reads and validates the environment at boot and wires production
  dependencies. Tests build the same app with a test database and a local
  JWKS.
- Locally, `pnpm --filter @budgetly/api dev` runs `src/local-server.ts`
  with Node's built-in TypeScript support and `@hono/node-server`. It is not
  named `server.ts`, which Vercel would also take for an entry point.
  Relative imports in `apps/api` therefore name the `.ts` file.
- Workspace packages are consumed from their `dist/`, built by their
  `prepare` script during `pnpm install` (ADR 0015).

## Consequences

- Moving to Nitro or a container later only changes the entry point.
- Vercel's install runs the workspace `prepare` scripts (confirmed on the
  first deployment), so no build command is needed.
- Vercel transpiles through a temporary tsconfig that extends
  `apps/api/tsconfig.json`, so that file names its `typeRoots` explicitly.
