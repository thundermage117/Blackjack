# 0006. Keep the round engine bet-agnostic

- Status: Accepted
- Date: 2026-10-08

## Context

`GameRules.blackjackPayout` existed but nothing applied it. Payouts could be added to
`RoundState` (the engine tracks the wager) or computed separately from a finished round.

## Decision

`packages/game-core/src/settlement.ts` exposes `settleWager(result, baseBet, doubled, rules)`,
which returns `{ stake, net }`. The round engine (`engine.ts`) stays unaware of money; whether
the player doubled is read from `playerActionsTaken` via `hasDoubled`.

## Consequences

- Existing engine functions and fixtures did not change.
- Settlement is a small pure function that is easy to test. The 3:2 acceptance item is
  covered by `tests/game-core.settlement.test.ts`.
- Splits (future) will need per-hand stakes. At that point the wager probably belongs on each
  hand in `RoundState`, which will need a new ADR.
