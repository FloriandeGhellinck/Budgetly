# apps/web

Next.js 16 (App Router) app. Renders pages and calls `apps/api` **from the
server only**, forwarding the user's Supabase session from httpOnly cookies
(ADR 0014, 0030). No oRPC or Supabase client ships to the browser. Next 16 is
newer than most training data: read `node_modules/next/dist/docs/` first.

## Layout

- `src/app/(auth)`: login and the MFA step; `src/app/auth/*`: magic-link and
  OAuth returns. `src/app/(app)`: signed-in pages, wrapped by the shell
  (sidebar on desktop, bottom bar on phones) and `EntryProvider`, the one
  quick-entry dialog (`useEntry().openNew()` / `openEdit(tx)`).
- `src/lib/api/server.ts`: `getApi()`, the only API client (server-only).
  `src/lib/supabase/*`: the only Supabase clients. `src/lib/entry-options.ts`:
  accounts, categories, beneficiaries and tags with translated labels;
  `optionLabels` translates the stored names reports return.
- `src/components/reports`: dashboard pieces (tiles, trend chart, ranked
  bars). Series colours are `--chart-1..3` (income, spending, saving).

## Patterns

- **Read** in a server component: `const api = await getApi()`.
- **Write** through a server action in `src/lib/<area>/actions.ts` that wraps
  the call in `runWrite` (`runAction` for reads) and returns `ActionResult`;
  show the `errors.<code>` message on failure. Small settings forms use
  `FormDialog` / `NameDialog` (`src/components/forms`). Money writes send an idempotency key
  generated once per form (`useRef(crypto.randomUUID())`).
- **Filters** live in the URL: parse `searchParams` with a schema that drops
  bad values (`src/lib/transactions/filters.ts`).
- **Money**: parse typed amounts with `parseAmountMinor`, show them with
  `<Money>`; both from `@budgetly/ui`. Never a float.
- **i18n**: every string in `messages/en.json` and `fr.json` (same keys, type
  checked). Defaults show `seedLabel(...)` of their seed key (ADR 0031).

## Boundaries (enforced by `pnpm checks`)

- A `"use client"` file never imports a module that imports `server-only`
  (`scripts/check-boundaries.ts`); `@orpc/client` and `@supabase/*` are
  imported only under `src/lib/api` and `src/lib/supabase` (oxlint).
- Never import `@budgetly/db`, `@budgetly/test-db` or another app.
- UI is built from `@budgetly/ui`; add a missing primitive there first.

## Run and test

`cp .env.example .env.local`, then see `docs/local-dev.md`. Pure logic gets a
`*.test.ts` beside it (`pnpm test`); journeys go in `e2e/` (`pnpm e2e`).
