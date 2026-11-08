# 3. One transaction model with direction and integer amounts

Status: accepted (2026-11-07)

## Context

The Notion setup keeps expenses as rows but income as hand-typed monthly
totals, so the monthly summary can drift from reality.

## Decision

- Expenses and income are both `Transaction` rows with a `direction`
  (`expense` | `income`).
- `amountMinor` is a positive integer in cents (currency: see ADR 0006).
- Monthly totals, balance and cashflow are always computed, never stored.

## Consequences

- One `transaction.*` API and one set of MCP tools cover both directions.
- No floating-point money anywhere; formatting happens at the edges.
- Agents never have to reason about negative amounts.
