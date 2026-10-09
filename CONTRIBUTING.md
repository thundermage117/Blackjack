# Contributing

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
```

Node 22+ is required (CI uses Node 24).

## Before you push

```bash
npm run check    # format check, lint, typecheck, unit tests (same as CI)
npm run test:e2e # Playwright end-to-end tests (also in CI)
npm run format   # auto-fix formatting
```

## Code style

- **Formatting** is Prettier (`.prettierrc.json`: 100 columns, double quotes, trailing commas).
  Don't hand-format; run `npm run format`.
- **Linting** is ESLint with `typescript-eslint` and the React Hooks rules
  (`eslint.config.js`). Use type-only imports (`import type { … }`).
- **TypeScript** is `strict`. Avoid `any`. Narrow `unknown` with type guards (see
  `state/storage.ts`).
- **Purity boundary.** `packages/*` must not import React or touch the DOM; ESLint enforces
  this. In `apps/web`, put decisions in pure modules (`state/session.ts`,
  `state/tableView.ts`, `audio/cues.ts`). Keep hooks and components thin.
- **Imports.** Import shared packages by name (`@blackjack/game-core`), never by relative path
  into `packages/`.
- **Naming.** Components are `PascalCase.tsx`; hooks are `useThing.ts`; other modules are
  `camelCase.ts`. CSS classes are kebab-case, with `is-*` state modifiers.
- **Comments** explain _why_, not _what_. Public functions with non-obvious behaviour get a
  short JSDoc.

## Tests

- **Unit tests** live in `tests/` and run with Vitest (`npm test`).
- Engine tests use **stacked shoes** (`buildPaddedShoe` in `tests/helpers/fixtureCards.ts`).
  List cards in deal order (player, dealer upcard, player, dealer hole, then draws). They
  are moved to the top of a real six-deck shoe, so the shoe stays complete and Hi-Lo counts
  stay correct.
- Rule and strategy expectations live in `tests/fixtures/*.json`. Keep fixture IDs stable.
- **Fairness tests** (`tests/game-core.fairness.test.ts`) use fixed seeds, so statistical
  checks are deterministic. Never assert statistics on unseeded randomness with a tight
  threshold. `tests/helpers/simulate.ts` plays many hands with a policy, if you need
  long-run numbers.
- **End-to-end tests** live in `e2e/` and run with Playwright (`npm run test:e2e`; the first
  time, run `npx playwright install chromium`). They build the app and run against
  `vite preview` on desktop and phone viewports. Use `startAt(page, { level, seed })` and
  pick a seed that deals the hand you need. Any console error fails the test.
- The service worker only runs in production builds. To check install or offline
  behaviour by hand, run `npm run build && npm run preview`. `e2e/pwa.spec.ts` covers the
  manifest and offline play.
- New logic in a pure module needs unit tests. New UI flows need an e2e test. Sound and
  vibration are checked by hand (see the smoke test in [`docs/rules.md`](docs/rules.md)).

## Learning levels

Gate features through the level definition in `apps/web/src/learning/levels.ts`
(`level.actions.*`, `level.assists.*`), never by comparing level numbers. If a feature
changes what the engine allows, switch it off in `rulesForLevel` so hints and the engine
agree. See ADR-0010.

## Changing rules or strategy

Rules, strategy table and fixtures must change together in one commit. See the checklist at
the top of [`docs/rules.md`](docs/rules.md), and record table edits in the change log in
[`docs/hint-strategy-format.md`](docs/hint-strategy-format.md).

## Commits and branches

- Work on a feature branch; `main` should always pass `npm run check`.
- Use [Conventional Commits](https://www.conventionalcommits.org/) with a scope where it
  helps: `feat(web): …`, `fix(hint-engine): …`, `docs: …`, `test(game-core): …`, `chore: …`.
- Keep commits small and focused. Each one should pass the checks.
- Significant technical decisions get an ADR in [`docs/adr/`](docs/adr/README.md).
- Note user-visible changes in [`CHANGELOG.md`](CHANGELOG.md).
