# 0002. Frontend-only MVP with pure, shared logic packages

- Status: Accepted
- Date: 2026-10-08

## Context

The SRS describes an Express + MongoDB backend that serves hints and stores games. The project
plan, however, makes the backend post-MVP and warns against duplicating game logic across
client and server. Correctness of the engine and hint table is the main risk, so that logic
needs to be easy to test in isolation.

## Decision

- Ship the MVP as a static single-page app with no backend.
- Keep all game rules in `packages/game-core` and all strategy logic in
  `packages/hint-engine`. Both are framework-free TypeScript with no side effects other than
  an injectable `random` function. ESLint forbids React imports in `packages/**`.
- The React app (`apps/web`) imports them by workspace name (`@blackjack/game-core`,
  `@blackjack/hint-engine`). The packages expose their TypeScript sources directly, so no
  separate build step is needed.
- Hints are computed locally instead of through `POST /api/hint`.

## Consequences

- The app deploys as static files to any host (Vercel config is in `vercel.json`).
- Engine and hint logic run in plain Node under Vitest with stacked shoes, without a browser.
- A future backend can import the same packages, so rules are never reimplemented.
- The packages are not publishable as-is because they ship `.ts` sources. If an external
  consumer ever needs them, add a build step.
- Because the client is authoritative, persisted stats cannot be trusted once a backend
  exists. A leaderboard would need server-side dealing.
