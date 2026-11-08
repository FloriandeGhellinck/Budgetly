# packages/ui

Shared shadcn/ui components (Base UI flavour) and Tailwind v4 styles. Exported
from source; `apps/web` transpiles it.

## Boundaries (enforced by `pnpm checks`)

- Presentational only: never import `@expense/db` or `@expense/test-db`.
- Never import from `apps/*`.
- Reuse before invention: extend an existing component instead of adding a
  near-duplicate.
