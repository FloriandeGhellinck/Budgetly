# AGENTS.md

`expense` is an open-source, multi-user personal finance app: each user tracks
their own expenses and income, with dashboards, a web UI, and (later) an MCP
server. Licensed AGPL-3.0.

## Read first

1. `CONTEXT.md`: the domain glossary. Name things in code, API procedures and
   UI copy with these terms only. A new domain concept gets a glossary entry
   in the same PR.
2. `docs/adr/`: decisions. An ADR whose status says _superseded_ or _amended_
   yields to the ADR it names; the newest one wins.
3. The `AGENTS.md` of the package you are touching.

## Architecture in one breath

`apps/web` (Next.js) renders pages and calls `apps/api` (Hono + oRPC) **from
the server only**, forwarding the user's Supabase session. `apps/api` is the
single door to data: it verifies the JWT, scopes every query to the user, and
runs Drizzle inside a transaction that sets `app.current_user_id` for RLS.
Agents reach the same procedures through MCP. Contracts live in
`packages/contract`, schema and migrations in `packages/db`, shadcn components
in `packages/ui`.

## Invariants

- **Tenancy**: every domain row carries `user_id`. Every procedure is scoped to
  the caller, and RLS backs it up.
- **Money**: positive integer cents (`amountMinor`) plus a `direction`. Signs
  and floats appear only at the display edge.
- **Contracts are written for agents**: each procedure has an agent-facing
  description, input examples, a read-only or mutating hint, and procedures
  that write money (`transactions.create`, `transfers.create`) take an
  idempotency key (ADR 0018, 0027).
- **One procedure = contract → `repo.ts` (Drizzle) → `handler.ts` → router.**

## Reuse before invention

Reuse is a quality requirement. Before adding a component, helper, schema,
style or workflow, search for the existing one and extend it. UI is built from
`packages/ui`; a missing primitive is added there, then used. When two screens
diverge, fix the shared piece instead of patching each screen.

## Testing

Follow `docs/what-to-test.md`. Every oRPC procedure has at least one
integration test on a real Postgres that also proves another user cannot read
or change the data. Run the smallest relevant test while iterating, the full
suite before pushing. Smoke journeys run in `e2e/` against the local stack
(`pnpm e2e`, see `docs/local-dev.md`), outside `pnpm test`.

## Done means

- `pnpm checks` (typecheck, lint, format, boundaries, schema drift) and
  `pnpm test` pass.
- A structural decision has a new ADR; new vocabulary is in `CONTEXT.md`.
- You ran `/code-review` on the branch before opening the PR.

## Conventions

- English for code, comments, docs, commits and PRs. UI copy goes through
  `next-intl` (English and French).
- Comments explain a non-obvious _why_, in one line.
- Conventional Commits for commit messages and PR titles. Open PRs as drafts.
- When a rule keeps being broken, turn it into a lint rule or test (ADR 0016).
