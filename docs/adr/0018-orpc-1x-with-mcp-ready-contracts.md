# 18. oRPC 1.x now, MCP-ready contracts, MCP server later

Status: accepted (2026-11-08). Amended by ADR 0027 (idempotency keys on money writes only).

## Context

oRPC 1.x is stable. Automatic procedure-to-MCP-tool mapping (`@orpc/mcp`)
exists only in the oRPC v2 beta. Titan instead exposes a curated tool list
with the official MCP SDK, dispatching onto oRPC procedures.

## Decision

- Use **oRPC 1.x** (stable).
- Every contract is written for agents from day one: an agent-oriented
  description, input examples, a read-only vs mutating hint, and an
  **idempotency key** on create procedures so a retrying agent never creates
  duplicates.
- The MCP server comes later. At that point choose between `@orpc/mcp` (if
  v2 is stable) and the Titan pattern; contracts do not change.

## Consequences

- Contract metadata conventions are part of the `add-procedure` skill and
  checked in review.
