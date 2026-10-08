# Blackjack

Single-player blackjack in the browser, with a correctness-tested rules engine, a
basic-strategy hint engine, a play-money bankroll and synthesized sound effects.

**Table rules:** six-deck shoe · dealer stands on soft 17 · blackjack pays 3:2 · double on any
first two cards · no split, insurance or surrender. Full details are in
[`docs/rules.md`](docs/rules.md).

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Requires Node 20+.

## How to play

| Key       | Action                     |
| --------- | -------------------------- |
| `N`       | Deal / next hand           |
| `H`       | Hit                        |
| `S`       | Stand                      |
| `D`       | Double                     |
| `G`       | Get a basic-strategy hint  |
| `1` – `4` | Bet $10 / $25 / $50 / $100 |
| `M`       | Sound on / off             |

You start with $1,000 in play money. Your bankroll, record, bet size and sound setting are
saved in the browser. **Reset Session** starts over.

## Commands

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                                |
| `npm run build`     | Typecheck and build the web app to `apps/web/dist`       |
| `npm run preview`   | Serve the production build locally                       |
| `npm test`          | Run the Vitest suite                                     |
| `npm run typecheck` | Typecheck packages, tests and the web app                |
| `npm run lint`      | ESLint                                                   |
| `npm run format`    | Prettier (write); `format:check` to verify only          |
| `npm run check`     | Everything CI runs: format check, lint, typecheck, tests |

Each one also has a `make` shortcut (`make dev`, `make check`, …). Run `make` to list them.

## Project layout

```
apps/web/              React UI
  src/state/           session reducer, table view, persistence, the game hook
  src/audio/           sound cue mapping and Web Audio synthesizer
  src/components/      table, cards, bet chips
packages/game-core/    cards, scoring, round engine, wager settlement (pure TS)
packages/hint-engine/  basic-strategy table and lookup (pure TS)
tests/                 Vitest suites + JSON fixtures
docs/                  rules, architecture, strategy format, ADRs
```

## Documentation

- [Architecture (as built)](docs/architecture.md): module map and the lifecycle of a hand
- [Architecture decision records](docs/adr/README.md): why things are the way they are
- [Rules and acceptance checklist](docs/rules.md)
- [Hint strategy table format](docs/hint-strategy-format.md)
- [Contributing](CONTRIBUTING.md): code style, tests and commit conventions
- [Changelog](CHANGELOG.md)
- Original planning documents: [ProjectPlan.md](ProjectPlan.md),
  [Requirements.md](Requirements.md), [Specifications.md](Specifications.md)

## Deployment

The app builds to static files. `vercel.json` is configured: import the repository into
Vercel and it will run `npm run build` and serve `apps/web/dist`. Any static host works the
same way.

## License

See [LICENSE](LICENSE).
