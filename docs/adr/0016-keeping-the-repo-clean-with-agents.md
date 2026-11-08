# 16. Keeping the repo clean with agents: enforce first, document second

Status: accepted (2026-11-08)

## Context

Most code will be written by agents. Written rules get forgotten or
reinterpreted; mechanical checks do not.

## Decision

Four layers, strongest first:

1. **Enforced (blocking in lefthook and CI)**: typecheck, oxlint, oxfmt;
   tests, including at least one integration test per oRPC procedure on a
   real Postgres that also proves another user cannot access the data;
   package-boundary lint rules (e.g. `apps/web` never imports `packages/db`,
   no raw `<button>`/`<input>` in `apps/web`, no float money); schema/migration
   drift check.
2. **Written, short**: root `AGENTS.md` (~100 lines max) plus one per package,
   `docs/what-to-test.md`, "reuse before invention", `CONTEXT.md` vocabulary,
   an ADR for every structural decision.
3. **Skills** for repetitive work (e.g. `add-procedure`: contract → repo →
   handler → test → MCP metadata).
4. **Review**: the agent runs a review skill (`/code-review`) on its branch
   before opening a PR. No paid review service (no CodeRabbit).

## Consequences

- Layer 1 must exist from the first commit.
- Any rule that keeps being broken moves from layer 2 to layer 1.
