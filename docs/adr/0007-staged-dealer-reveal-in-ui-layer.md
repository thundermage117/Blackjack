# 0007. Stage the dealer reveal in the UI, not the engine

- Status: Accepted
- Date: 2026-10-08

## Context

After the player stands or doubles, `playerStand`/`playerDouble` play out the whole dealer
hand and resolve the round in one synchronous transition. Showing that instantly feels
abrupt and gives sound effects nothing to follow. The earlier UI hid this with a fixed 520 ms
spinner, then showed everything at once.

## Decision

- Keep the engine atomic: one call resolves the round.
- The web session reducer (`apps/web/src/state/session.ts`) adds a `dealerReveal` state with
  a `visibleCount`. A timer in `useBlackjackGame` dispatches `reveal-step` actions (hole card
  flip, then one card per step).
- Settlement (stats and bankroll) happens on the final reveal step, not when the engine
  resolves. The engine's result message is held back until then so the outcome is not
  spoiled.
- `selectTableView` computes what is visible. Rendering and sound cues (ADR-0004) both read
  from it.

## Consequences

- The engine stays simple, deterministic, and fully tested without timers.
- Reveal pacing is purely presentational and can be tuned in one place
  (`FIRST_REVEAL_DELAY_MS`, `REVEAL_STEP_DELAY_MS`).
- The full dealer hand already exists in memory during the reveal. That is fine for a
  single-player client game, but it is not a design for anything adversarial.
