# 2. Manual and agent entry first; bank sync later

Status: accepted (2026-11-07)

## Context

Today every transaction is typed by hand in Notion (~1,400 per year), with
categories that need human judgement (who it is for, which event it belongs
to). Options: manual entry, bank file import (CSV/CODA), open-banking sync
(PSD2 aggregator), agent-driven entry over MCP.

## Decision

v1 supports two entry paths, both calling the same API procedures:

1. **Manual entry** in the web UI, keyboard-first, with suggestions.
2. **Agent entry** over MCP (natural language, later receipts).

Open-banking sync is planned for later. Bank file import is not planned for now.

## Consequences

- The write API must be designed for agents: explicit inputs, server-side
  validation, idempotency, clear errors.
- Categorisation suggestions are a core feature, not an import detail.
- When bank sync arrives it needs deduplication against manual entries.
