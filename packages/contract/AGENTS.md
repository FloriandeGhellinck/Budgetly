# packages/contract

oRPC 1.x contracts shared by `apps/api` and `apps/web` (ADR 0018, 0027).

## Rules

- Declare every procedure with `procedure({...})` from `src/procedure.ts`:
  description (written for an agent: what it does, which ids to fetch first,
  which errors to expect), at least one typed example, `readOnly` and
  `idempotent`. `defineContract` in `src/index.ts` rejects anything else at
  compile time.
- Errors come from `src/errors.ts` via `errors("NOT_FOUND", …)`; a new failure
  gets a new code there, with a status. `MFA_REQUIRED` is the exception no
  procedure declares: apps/api's auth middleware throws it on any call
  (ADR 0032).
- Money is positive integer cents (`amountMinor`) plus a `direction`; days are
  `YYYY-MM-DD`, instants ISO strings; shares are `shareBps`. Balances are the
  one signed exception (`balanceMinor`, `openingBalanceMinor`, ADR 0035).
- Money writes (`transactions.create`, `transfers.create`) require an
  `idempotencyKey`.
- After editing, `pnpm --filter @budgetly/contract build`: consumers run `dist/`.

## Boundaries (enforced by `pnpm checks`)

- No runtime import of `@budgetly/db`: the contract ships to the web app.
  `import type` from `@budgetly/db` is allowed.
- Never import from `apps/*`.
