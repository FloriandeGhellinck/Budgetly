# Local development

Everything runs on your machine: Supabase (Postgres + Auth + Mailpit) in
Docker, `apps/api` on port 8787 and `apps/web` on port 3000. Local Supabase
uses ports **563xx** (`supabase/config.toml`) so it can run next to other
Supabase projects on the default 543xx.

Prerequisites: Docker, and Node and pnpm from `.tool-versions` (`mise
install`), then `pnpm install`.

## 1. Start Supabase

```sh
pnpm db:start     # first run generates supabase/signing_keys.json (ES256)
pnpm db:status    # URLs and keys
```

Migrations in `supabase/migrations/` are applied, and `supabase/seed.sql`
gives the `app_runtime` role the local password `app_runtime`.
`pnpm db:reset` re-applies migrations and seed (wipes data); `pnpm db:stop`
stops the stack.

## 2. Start the API

```sh
cp apps/api/.env.example apps/api/.env
pnpm --filter @expense/api dev        # http://127.0.0.1:8787/health
```

## 3. Start the web app

```sh
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @expense/web dev        # http://localhost:3000
```

## 4. Sign in

Open http://localhost:3000, enter any email and ask for a sign-in link. Open
Mailpit at http://127.0.0.1:56324, click the link in the email: you land on
the dashboard with the account Main and the default categories created.

Use `localhost`, not `127.0.0.1`: the link and the session cookies are for
`site_url` (`http://localhost:3000`).

### Google sign-in (optional)

Create a Google OAuth client with the redirect URI
`http://127.0.0.1:56321/auth/v1/callback`, put
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` in `supabase/.env`, set
`enabled = true` under `[auth.external.google]` in `supabase/config.toml`,
restart Supabase, and set `AUTH_GOOGLE_ENABLED=true` in
`apps/web/.env.local` to show the button.

### Two-factor authentication

Settings → Two-factor authentication → scan the QR code with any TOTP app.
The next sign-in asks for a code after the magic link.

## Tests

```sh
pnpm test      # unit and DB tests (DB tests start a throwaway Postgres in Docker)
pnpm e2e       # Playwright smoke flows on the running local stack
```

`pnpm e2e` needs Supabase running (`pnpm db:start`) and the two env files
from steps 2 and 3; it starts the API and the web app itself unless they are
already up. Install the browser once with
`pnpm --filter @expense/e2e exec playwright install chromium`.
