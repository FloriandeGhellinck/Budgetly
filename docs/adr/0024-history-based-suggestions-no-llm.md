# 24. Category suggestions from the user's history; no server-side LLM

Status: accepted (2026-11-08)

## Decision

- When the user types a transaction name, the app suggests category,
  beneficiary and account from the user's own past transactions with a
  similar name (most frequent recent combination). Instant, free, no data
  leaves the app.
- The app does **not** call an LLM and holds no LLM API key: per-user API cost
  is not worth it.
- AI-powered entry and categorisation come from the **user's own agent** over
  MCP (ADR 0018), at the user's expense.
