# 0005. Play-money bankroll persisted in localStorage

- Status: Accepted; in-progress hand handling superseded by ADR-0011
- Date: 2026-10-08

## Context

The rules specify a 3:2 blackjack payout and doubling, which only mean something with a bet.
The MVP requires "local session stats", and the persistent stats API is post-MVP. Players
expect their record to survive a page refresh.

## Decision

- Add a play-money bankroll (starting at $1,000) with fixed bet sizes of $10, $25, $50 and
  $100. The bet can only change between hands. Doubling requires the bankroll to cover twice
  the bet.
- Persist `{ stats, bankroll, bet }` under `blackjack.session.v1`, and `{ muted }` under
  `blackjack.settings.v1`, in `localStorage` (`apps/web/src/state/storage.ts`).
- Validate every field on load and drop malformed fields one by one. Storage errors (private
  mode, quota exceeded) are swallowed.
- The in-progress hand is **not** persisted. Reloading mid-hand abandons it without
  settlement.
- "Reset Session" restores the starting bankroll and clears stats.

## Consequences

- Stats survive reloads with no backend.
- Abandoning a losing hand by reloading avoids the loss. That is acceptable for play money and
  would need a server-authoritative design if stakes ever mattered.
- The `.v1` key suffix gives a migration path: bump it when the shape changes incompatibly.
- When the backend arrives, these same fields map onto the planned `Stats` document.
