---
name: add-procedure
description: Add or change an oRPC procedure in expense end to end (contract, repo, handler, router, tests with a cross-user check, agent metadata). Use when adding an API endpoint, a new namespace, or a new error code.
---

# Add a procedure

Read `packages/contract/AGENTS.md`, `apps/api/AGENTS.md` and ADR 0027 first.
Copy the closest existing namespace (`accounts` for CRUD, `transactions` for
filters, idempotency and constraint mapping).

1. **Contract**: `packages/contract/src/<namespace>.ts`.
   - `procedure({ description, examples, readOnly, idempotent, input, output, errors })`.
     The description says what it does, where ids come from (`accounts.list`…)
     and which error codes it throws. Examples must parse against `input`.
   - Errors: `errors("NOT_FOUND", …)`. A new failure mode gets a new code with
     a status and an agent-facing message in `src/errors.ts`.
   - Money writes take `idempotencyKey: IdempotencyKey` (`src/common.ts`).
   - New namespace: add it to `defineContract({...})` and `export *` in
     `src/index.ts`.
   - `pnpm --filter @expense/contract build` (the API and tests run `dist/`).
2. **Repo**: `apps/api/src/<namespace>/repo.ts`. Takes `(tx, userId, …)` and
   filters every query on `userId` (RLS is the backup, not the scope).
   Return `null` or a string union for "not found"/refusals; no oRPC here.
   Inside a selected `sql` fragment write table-qualified SQL
   (`"transactions"."id"`): Drizzle renders columns unqualified there.
3. **Handler**: `apps/api/src/<namespace>/handler.ts`.
   `authed.<namespace>.<name>.handler(({ input, context, errors }) => …)`
   with `context.tx` and `context.userId`. Turn repo results into
   `errors.X(...)`; wrap writes in `onConstraint(promise, { constraint_name: () => errors.X() })`
   from `src/pg-errors.ts` for constraint backstops. Export
   `<namespace>Router = { … }` (map `delete: del`).
4. **Router**: add `<namespace>Router` to `apps/api/src/router.ts`. Typecheck
   fails until every contract procedure has a handler.
5. **Tests**: `apps/api/src/<namespace>/handler.db.test.ts`, through the real
   app with `createTestApi`, `signUpSeeded`, `errorCode`, `newKey` from
   `src/test-support.ts`.
   - One test per behaviour; rejections pin the error code.
   - **Mandatory isolation case**: a second user cannot list, read, update or
     delete the first user's row: `NOT_FOUND` (or absent from lists), and the
     row read back with `api.admin` is unchanged.
   - Pure logic (ranking, maths) goes in a pure function with a `*.test.ts`
     beside it (`docs/what-to-test.md`).
6. **Docs**: new vocabulary in `CONTEXT.md`; a structural choice gets an ADR.
7. `pnpm checks` and `pnpm test` (Docker running).
