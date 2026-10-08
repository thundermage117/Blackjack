# 0013. End-to-end tests with Playwright against the production build

- Status: Accepted
- Date: 2026-10-08

## Context

Logic is covered by unit tests, but the React wiring (timers, dialogs, keyboard shortcuts,
persistence, layout) was only checked by hand. Random shoes make UI scenarios like "split
a pair" hard to reach on demand.

## Decision

- Playwright tests in `e2e/` run against `vite preview` of the production build, on a
  desktop and a Pixel 7 viewport.
- `?seed=N` gives a reproducible shoe. Tests pick seeds that deal the situation under test
  (e.g. seed 8 deals a splittable pair). Tests start at a level by writing the save once
  before the page loads.
- A shared fixture fails any test that logs a console error.
- Separate CI job after unit tests and build; the HTML report is uploaded on failure.

## Consequences

- The first run found two real bugs: duplicate dialog title ids broke dialog names for
  screen readers, and deal animations caused sideways scrolling on phones.
- If the shuffle algorithm or the seeded RNG changes, the chosen seeds no longer deal the
  intended hands and must be re-picked.
- `?seed=` is available in production. That is harmless for a play-money trainer and
  useful for sharing a hand.
