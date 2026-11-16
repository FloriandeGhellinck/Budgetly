# 37. Saved views: named Analysis views as tabs, starters seeded once

Status: accepted (2026-11-16)

## Context

The Analysis page (ADR 0036) is explored through filters; users want to keep
the views they return to as tabs, start with a few useful ones, and explore
from a tab without overwriting it. Agents should manage the same views.

## Decision

- **A `saved_views` table** per user (RLS owner policy like every domain
  row): a name, an optional seed key, the `AnalysisView` as `jsonb`, and a
  sort order (new views last). A relative period is stored as the preset, so
  a "Last month" tab keeps moving; fixed dates stay fixed.
- **Validated on write, read leniently.** `savedViews.create` / `update` take
  an `AnalysisView`; reads go through `parseStoredView`, where each field
  that no longer parses takes its default. Ids are kept as stored: one that
  points at a deleted row matches nothing in the API, and the web drops ids
  its options no longer know before showing the view.
- **Starter views are seeded once**: by `seedNewUser` at sign-up for new
  users, and by the migration that creates the table for existing ones. They
  carry seed keys (translated in the UI like other defaults, ADR 0031) and
  are ordinary rows: renaming clears the key, deleting is final. Seeding
  lazily on first list would need a "seeded" flag to respect deletions; the
  one-off seed needs none.
- **The URL stays the source of truth**: it holds the current view's state
  and `view=<id>`, the active tab. The page compares that state with the
  saved one to show the draft bar and the tab's dot; switching or leaving a
  tab drops the draft. A URL with only `view=<id>` opens the saved state; a
  URL without `view` (a shared link) shows its state with no active tab.
- **Procedures** `savedViews.list / create / update / delete`, no idempotency
  key (like categories: a duplicate is visible and cheap to delete).

## Consequences

- Reordering tabs is a later `sortOrder` update, no migration.
- Changing `AnalysisView` never breaks stored views, but a renamed field
  silently falls back to its default; such a change should ship a data
  migration.
