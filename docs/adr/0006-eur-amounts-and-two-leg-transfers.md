# 6. EUR amounts, per-account currency label, two-leg transfers

Status: accepted (2026-11-07)

## Context

Accounts are EUR bank accounts and an account holding EURC (a 1:1
euro stablecoin). Moving EUR to EURC can lose a little to fees.

## Decision

- All amounts are stored in EUR (`amountMinor` in cents).
- Each account carries a `currency` label (`EUR`, `EURC`), informational in v1.
- A transfer is stored as **two linked legs**: an outgoing leg on the source
  account and an incoming leg on the destination account, each with its own
  amount. Any difference (fees, conversion) is visible.
- A leg is a `Transaction` row with direction `transfer_out` or
  `transfer_in`; both legs share a `transferId`. Reports exclude both
  directions from income and spending.
- Real multi-currency (USD, BTC, historical FX) belongs to a future
  net-worth module.

## Consequences

- Dashboards never convert currencies in v1.
- Account balances stay exact even with conversion fees.
