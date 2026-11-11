# packages/ui

Shared shadcn/ui components (Base UI flavour, style `base-nova`) and Tailwind
v4 styles. Exported from source; `apps/web` transpiles it.

## Using it

- `import { Button } from "@budgetly/ui/components/button"`; one entry per file
  in `src/components`, `src/lib`, `src/hooks`. No barrel.
- The app's CSS imports `@budgetly/ui/globals.css` (Tailwind, `tw-animate-css`,
  light and dark tokens; dark mode is the `.dark` class).
- The app root mounts `TooltipProvider` (tooltip) and next-themes'
  `ThemeProvider` (sonner's `Toaster` reads the theme).
- Money is shown with `<Money amountMinor locale direction />`, never formatted
  by hand; typed amounts become cents with `parseAmountMinor` (and back with
  `formatAmountInput`) from `lib/money`.
- Forms that open over a page use `ResponsiveDialog` (Drawer on phones,
  Dialog from md up).

## Adding a component

- Add shadcn components with the CLI, from this directory:
  `pnpm dlx shadcn@4 add <name>`, then `pnpm exec oxfmt .` and move any new
  dependency into the root catalog. Never copy primitives into apps.
- Don't edit generated files beyond formatting, so `add --overwrite` can
  refresh them. If one trips a lint rule, add a per-file override in the root
  `.oxlintrc.json`.
- Base UI 1.x is newer than most training data: before wrapping a part, read
  `node_modules/@base-ui/react/<part>/index.d.ts`. Composition uses the
  `render` prop, not `asChild`.
- Our own components (`money`, `date-picker`, `responsive-dialog`) sit next to the generated ones;
  their pure logic lives in `src/lib` with a `*.test.ts`.

## Boundaries (enforced by `pnpm checks`)

- Presentational only: never import `@budgetly/db` or `@budgetly/test-db`.
- Never import from `apps/*`.
- Reuse before invention: extend an existing component instead of adding a
  near-duplicate.
