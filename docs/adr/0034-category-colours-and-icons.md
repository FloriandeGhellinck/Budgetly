# 34. Category colours and icons: palette tokens and a lucide allow-list

Status: accepted (2026-11-11)

## Context

The dashboard redesign gives every category group a colour and every
category an icon (pastel tiles, a donut by group, icon chips on rows). Users
pick them. Free hex values or any icon name would break dark mode, colour-blind
safety and the bundle, and agents need a closed set they can send.

## Decision

- **Colour is a palette token**, not a hex: `blue`, `teal`, `green`, `amber`,
  `orange`, `red`, `pink`, `violet`, `slate` (`CATEGORY_COLORS` in
  `packages/contract`, mirrored by `CATEGORY_PALETTE` in `packages/db`, which
  a CHECK enforces). The UI maps each token to three CSS variables per theme
  in `packages/ui` `globals.css`: `--cat-<token>` (chart mark, the dataviz
  palette's steps), `--cat-<token>-fg` (icon ink, at least 4.5:1 on its tint)
  and `--cat-<token>-tint` (pastel background).
- **Icon is a lucide name** from `CATEGORY_ICONS` in the contract (about 70,
  grouped by theme). Validated in the API only, so the list can grow without
  a migration; `apps/web` maps every name to its component explicitly, so the
  build fails when one is missing.
- **Groups always have both** (`NOT NULL`, defaults `slate` / `folder`).
  A category's colour and icon are nullable: null wears its group's, so
  recolouring a group recolours its categories. Defaults are set by seed key
  at sign-up, and a backfill migration gives existing rows the same.
  Changing a look keeps the seed key (only a rename clears it).
- **API**: `categories.list` returns them, `categories.create` / `update`
  accept them (null on update goes back to the group's), `categories.updateGroup`
  restyles a group. `reports.breakdown` returns each group's look and each
  category's resolved look. Transaction rows carry only `categoryId`; the web
  resolves the look from `categories.list`, like the label.
- **Colour-blind safety**: the default group colours (teal, orange, violet,
  slate) pass the dataviz validator's CVD and normal-vision checks all-pairs
  in both themes; `slate` is the deliberate neutral below the chroma floor,
  and light teal is under 3:1 on white, relieved by the printed labels. Users can pick any
  colours, so colour never carries identity alone: every tile, legend row,
  bar and chip shows the name, the icon and the amount. Uncategorized,
  "Other" and transfers use a quieter `--cat-none` gray outside the palette.

## Consequences

- Adding a colour is a migration (the CHECK) plus three CSS variables per
  theme; adding an icon is a contract and web change only.
- Icon search in the picker matches English lucide names.
