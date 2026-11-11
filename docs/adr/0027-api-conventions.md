# 27. API conventions: errors, shares, idempotency, deletion

Status: accepted (2026-11-08). Amends ADR 0018.

## Context

The first procedures had to settle how errors read, how a share is sent,
where idempotency keys live and what "delete" means per entity. Agents call
the same procedures as the web app (ADR 0018), so each answer must be
predictable without reading the code.

## Decision

- **Errors**: declared in `packages/contract/src/errors.ts`, one stable
  `UPPER_SNAKE` code per failure, each with an explicit HTTP status and a
  default message that tells an agent what to do next. `NOT_FOUND` (404)
  carries `data.entity` (`account`, `category`…). Refusals of a valid request
  are 422 (`CATEGORY_DIRECTION_MISMATCH`, `TRANSFER_SAME_ACCOUNT`,
  `TRANSFER_LEG`), conflicts with stored state 409 (`CATEGORY_IN_USE`,
  `IDEMPOTENCY_KEY_CONFLICT`), a bad cursor 400. Another user's row is always
  `NOT_FOUND`, never `FORBIDDEN`.
- **Constraint violations map per call site** (`onConstraint` in
  `apps/api/src/pg-errors.ts`): the same constraint means different things on
  different writes (`transactions_category_fk` is a direction mismatch on
  insert, "in use" on a category delete). Handlers check references first, so
  the error names the wrong one; the composite keys stay as a backstop.
- **Share** is sent and returned as `shareBps` (integer, 10000 = 100 %), the
  stored form (ADR 0026): no percent conversion, no decimals.
- **Idempotency keys** are required on `transactions.create` and
  `transfers.create`, the writes that would double money if retried. They are
  stored in `transactions.idempotency_key` (unique per user); a transfer
  stores its key on the `transfer_out` leg. A retry with a known key returns
  the original result, even if the payload differs; a key first used for the
  other kind of write gives `IDEMPOTENCY_KEY_CONFLICT`. Creating accounts,
  categories and beneficiaries takes no key: duplicates are visible and cheap
  to fix, and agents are told to list first. This narrows ADR 0018's "every
  create procedure".
- **Deletion**:
  - Transactions are soft-deleted (ADR 0025). `get` still returns a deleted
    one with `deletedAt`, `list` and suggestions skip it, `update` refuses it
    (`NOT_FOUND`), `delete` and `restore` are idempotent. Transfer legs change
    only through `transfers.*`, both legs together.
  - Accounts are archived, never deleted (`archive` / `unarchive`).
  - Categories are hard-deleted, and only when no transaction (deleted ones
    included) uses them: `CATEGORY_IN_USE` otherwise. No archive in v1.
  - Beneficiaries cannot be deleted yet.
- **Outputs** carry instants as ISO 8601 strings and days as `YYYY-MM-DD`, so
  JSON callers (MCP) get the same shape as RPC callers.
- **Bootstrap** (`me.bootstrap`) takes a per-user advisory lock, so two
  concurrent first sign-ins create one set of defaults.

## Consequences

- A new failure mode is a new code in `errors.ts`, never a reused one with a
  different meaning.
- Lists page with an opaque cursor over `(occurredOn, id)`.
