# Blackjack

Browser-based blackjack MVP with a shared game engine and basic-strategy hint engine.

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

Alternative (Makefile shortcuts):

```bash
make install
make dev
```

## Common Commands

- `npm run dev` - Start the web app (Vite dev server)
- `npm run build` - Build all workspaces (currently builds the web app)
- `npm run preview` - Preview the production web build locally
- `npm run typecheck` - Run TypeScript typecheck for the web app (includes shared packages via tsconfig)
- `npm run test` - Run fixture-backed Vitest tests (engine + hint engine)
- `make` - Show available shortcuts
- `make dev` / `make build` / `make preview` / `make typecheck` / `make test` - Shortcut wrappers around npm scripts

## Project Layout

- `apps/web` - React UI
- `packages/game-core` - Blackjack rules, scoring, round state transitions
- `packages/hint-engine` - Basic strategy table and hint resolution
- `docs` - Rules, planning, strategy table format
- `tests/fixtures` - Fixture data for engine and hint tests

## Notes

- Current UI is an MVP scaffold; next steps are tests, card rendering, and polish.
