# Budgetly

Open-source personal finance tracker: record expenses and income across your
accounts (including accounts shared with a partner), classify them by who and
what they are for, and get monthly dashboards. Built to be driven by humans
and AI agents alike.

> Status: early design. The domain model and decisions are documented; code
> is being scaffolded.

## Docs

- [`CONTEXT.md`](./CONTEXT.md): domain glossary
- [`docs/adr/`](./docs/adr/): architecture decision records
- [`AGENTS.md`](./AGENTS.md): conventions for contributors and coding agents
- [`docs/local-dev.md`](./docs/local-dev.md): run it locally

## Stack

pnpm monorepo · Node 26 · TypeScript 7 · Next.js · Hono + oRPC · Supabase
(Postgres + Auth) · Drizzle · shadcn/ui · Vitest · Playwright

## License

[AGPL-3.0](./LICENSE)
