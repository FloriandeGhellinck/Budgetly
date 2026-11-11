# What to test (and what not to)

A test is worth adding when it would fail for a bug a user would care about,
and would **not** fail when the code is refactored without changing behaviour.
Every test costs runtime, maintenance and reading time. Count that price
before adding one.

## 1. One owning layer per rule

Each behaviour has **one** layer that tests every case. Other layers only
check that they are wired to it, with one or two cases.

| Behaviour                                                                | Owning layer                                                          | Other layers may assert                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Money (`amountMinor` + `direction`), dates, report maths, suggestions    | Pure function, `*.test.ts` beside it                                  | API: that the right rows reach it. Web: that the result is shown. |
| A procedure's behaviour: input, scoping, persistence, errors             | Integration test per procedure on a real Postgres (§2), in `apps/api` | —                                                                 |
| SQL behaviour: constraints, RLS policies, aggregation, triggers          | `*.db.test.ts` beside the repository or migration                     | —                                                                 |
| Client-only rules (form prerequisites, URL filter state, view models)    | `*.test.ts` beside the view                                           | The component: one wiring test per rule.                          |
| Rendering, focus, keyboard, dialogs                                      | Testing Library                                                       | —                                                                 |
| Full user journeys (sign in, add a transaction, see it on the dashboard) | Playwright, a handful of smoke flows                                  | Nothing in Vitest.                                                |

If the same scenario appears at a second layer, keep it only if it protects a
different failure mode, and name it for that failure mode.

## 2. Every procedure: one integration test with a cross-user check

Each oRPC procedure has at least one test that calls it through the real
router, middleware and Postgres (`@budgetly/test-db`), as a real user. That
test, or one next to it, also proves that **another user** cannot read,
change or delete the data: the call returns nothing or `NOT_FOUND`, and the
row is unchanged. Tenancy bugs are the costliest bug this app can have.

## 3. Don't write these

- **Tests of the framework or a library**: Base UI closing a popover, Zod's
  own behaviour, Drizzle building SQL. A schema test earns its place only when
  it protects a constraint _we chose_, and it asserts the issue's `path`.
- **Tests the compiler already enforces**: exhaustiveness, key sets, renames.
- **Markup and class assertions**: no regex over HTML, no Tailwind classes,
  no `data-slot`. Query by role, label or accessible name.
- **Change detectors**: tests that restate a constant, a translation string,
  a colour token or a hand-kept list.
- **Mock-mirror tests**: asserting a mock was called with a copy of the
  source literal. Assert an outcome instead.
- **Source-grep tests**: architecture rules belong in `.oxlintrc.json` or
  `scripts/check-boundaries.ts` (ADR 0016).
- **Tests of test doubles**: fakes are tested by the tests that use them.

## 4. How to write the tests you keep

- **Assert exactly**: every rejection pins an error `code` or constraint
  name, never a bare `toThrow()`.
- **Money is compared as integers**: `amountMinor` values, never floats or
  `toBeCloseTo`.
- **Tables over copies**: three or more input → output cases become an
  `it.each` with labelled cases.
- **One reason to fail** per test.
- **Mock at the process boundary only**: HTTP, time, Supabase Auth. Never
  `@budgetly/ui` or sibling modules.
- **Name DB-backed files `*.db.test.ts`** and share read-only fixtures in a
  `beforeAll`.
