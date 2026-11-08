# 21. A ready-to-use household on sign-up

Status: accepted (2026-11-08). Amended by ADR 0023 (no household, no members).

## Decision

On sign-up the app creates, with no mandatory onboarding:

- a household for the user, with the user as its only member;
- one account "Main" owned 100 % by that member;
- a beneficiary "Me";
- the default category groups and categories (Daily life, Leisure,
  Investment [saving], Debt, plus income categories), translated, editable.

The user can record a transaction within a minute of signing up. Adding
members, shared accounts with shares, and more beneficiaries is offered as
an optional short setup, not imposed. The author's household is created by
the Notion import (ADR 0009).
