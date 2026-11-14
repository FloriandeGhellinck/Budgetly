# Deployment

Production runs on Vercel (two projects) and a hosted Supabase project.
Both Vercel projects deploy from `main` through the GitHub integration;
pull requests get preview deployments.

| Vercel project | Root directory | Framework preset | Build command (project setting)                                 |
| -------------- | -------------- | ---------------- | --------------------------------------------------------------- |
| `budgetly-web` | `apps/web`     | Next.js          | `pnpm --filter "@budgetly/web^..." run build && pnpm run build` |
| `budgetly-api` | `apps/api`     | Hono (ADR 0028)  | `pnpm --filter "@budgetly/api^..." run build`                   |

- No `vercel.json`. Vercel installs the whole pnpm workspace from the repo
  root (`packageManager` pins pnpm). The build command builds the workspace
  packages the app imports from `dist/`: `prepare` builds them on a fresh
  install, but not when Vercel restores its build cache.
- Node.js 26.x, functions in `dub1` (Dublin), next to the Supabase region
  (`eu-west-1`).

## Environment variables

Set in each Vercel project, for Production (and Preview unless noted).
The names match `apps/web/src/lib/env.ts` and `apps/api/src/env.ts`.

`budgetly-web`:

- `API_URL`: the production URL of `budgetly-api`.
- `SUPABASE_URL`: `https://<project-ref>.supabase.co`.
- `SUPABASE_PUBLISHABLE_KEY`: the project's publishable key.
- `SITE_URL`: the production URL of `budgetly-web`. Previews use it too, so
  a sign-in started on a preview comes back to production.
- `AUTH_GOOGLE_ENABLED`: `false` until Google sign-in is configured.

`budgetly-api`:

- `SUPABASE_JWKS_URL`: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`.
- `SUPABASE_JWT_ISSUER`: `https://<project-ref>.supabase.co/auth/v1`.
- `SUPABASE_JWT_AUDIENCE`: `authenticated`.
- `DATABASE_URL` (Production only, sensitive): the `app_runtime` role through
  Supavisor's transaction pooler (port 6543, ADR 0026). The pooler user is
  `app_runtime.<project-ref>`; the password must be URL-encoded.
  `packages/db` sets `prepare: false`, which transaction mode requires.

  ```txt
  postgresql://app_runtime.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require
  ```

  Add it from a checkout linked to `budgetly-api` (`vercel link`), so the
  value never lands in a file or the shell history:

  ```sh
  vercel env add DATABASE_URL production --sensitive
  ```

The API validates its environment at boot: without `DATABASE_URL` every
route, `/health` included, answers 500.

No service-role or secret key is used anywhere.

## Supabase

- Migrations: `supabase db push` from a linked checkout.
- `app_runtime` gets its password out of band (never in the repo).
- Auth settings are set per project, not with `supabase config push`
  (`supabase/config.toml` holds local values): site URL = the web production
  URL, redirect allow list = `<web production URL>/**`, email sign-in and
  sign-ups on, TOTP MFA on.
- Asymmetric JWT signing keys (ES256) must be in use: the API refuses HS256
  tokens.

### Email

Sign-in works with Supabase's default email templates. Supabase only lets a
project change its templates once it sends through a custom SMTP server, so
without one production sends the default magic-link and confirm-signup
emails, whose link goes through Supabase and returns with a PKCE `code`.
`sendMagicLink` therefore passes `emailRedirectTo = <SITE_URL>/auth/callback`
(covered by the `<web production URL>/**` allow list), and the proxy forwards
a `code` that still lands elsewhere (Supabase falls back to the site URL) to
`/auth/callback`. Two limits remain:

- A PKCE link only works in the browser that asked for it: the code verifier
  is a cookie there. Opened on another device it ends on `/login?error=link`.
- The built-in sender is rate limited to a few emails per hour.

A custom SMTP provider lifts both: then load `supabase/templates/magic-link.html`
for the magic-link and confirm-signup templates. It links to
`/auth/confirm?token_hash=...` (ADR 0030), as local dev already does.
