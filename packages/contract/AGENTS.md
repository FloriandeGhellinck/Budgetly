# packages/contract

oRPC contracts shared by `apps/api` and `apps/web` (ADR 0018). Each procedure
has an agent-facing description, input examples, a read-only or mutating hint,
and create procedures take an idempotency key.

## Boundaries (enforced by `pnpm checks`)

- No runtime import of `@expense/db`: the contract ships to the web app.
  `import type` from `@expense/db` is allowed.
- Never import from `apps/*`.
- Money is positive integer cents (`amountMinor`) plus a `direction`.
