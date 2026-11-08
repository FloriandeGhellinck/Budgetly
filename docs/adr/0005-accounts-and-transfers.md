# 5. Accounts and transfers are first-class

Status: accepted (2026-11-07)

## Context

The household pays from several places: a joint bank account, personal cards
chosen for cashback (e.g. Broker), and a crypto card account
(Crypto card). Money moves between them through many
internal transfers. Without accounts, a transfer looks like an expense on one
side and an income on the other, which corrupts every dashboard. Future bank
sync (ADR 0002) also needs accounts to reconcile against.

## Decision

- `Account` is a first-class entity. Every transaction belongs to exactly one
  account (the one the money left or entered).
- A **transfer** moves money between two accounts of the household. It is
  never counted as spending or income.
- The exact representation of a transfer is settled together with the
  currency question (accounts may hold non-EUR assets).

## Consequences

- "Who paid" and cashback eligibility derive from the account, not from a
  free-text flag. The Notion `Carte` column becomes data about the account
  or payment method.
- Account balances and reconciliation become possible.
- Manual entry must stay fast: the account field needs a sensible default.
