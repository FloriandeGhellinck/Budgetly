# 31. apps/web: locale from a cookie or the browser, no URL segment

Status: accepted (2026-11-08)

## Context

The UI ships in English and French (ADR 0020). next-intl supports a locale
prefix in every URL or a locale decided per request. Defaults created at
sign-up are stored in English with a seed key (ADR 0026).

## Decision

- **No `/[locale]` segment.** The locale is the `budgetly-locale` cookie,
  set by the language picker in Settings, else the best match in
  `Accept-Language`, else English (`src/lib/i18n/config.ts`). URLs stay
  stable and filter links are locale-free. There is no server-side user
  preference yet; when one exists it replaces the cookie.
- **Messages are typed**: `messages/en.json` is the source of the key type,
  and `fr.json` must have the same shape or `pnpm typecheck` fails.
- **Defaults are translated by seed key** under `seed.*` (accounts,
  beneficiaries, categoryGroups, categories) with `seedLabel`, applied on
  the server when options are loaded. A renamed row has no seed key and
  shows its stored name. The account Main got a seed key for this.
- Dates and money use the UI locale (`Money`, `useFormatter`); the time
  zone is Europe/Brussels for now.

## Consequences

- Search engines see one language per URL; acceptable for a signed-in app.
- Adding Dutch is a `nl.json`, an entry in `LOCALES`, and a date-picker
  locale.
