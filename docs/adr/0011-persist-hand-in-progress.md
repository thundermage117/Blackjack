# 0011. Persist the hand in progress (storage v2)

- Status: Accepted (supersedes the "in-progress hand is not persisted" part of ADR-0005)
- Date: 2026-10-08

## Context

ADR-0005 persisted only bankroll, stats and bet, so reloading mid-hand abandoned the hand
without settlement: a free way out of a losing hand. The session also grew to include
levels, table options, trainer stats and settings.

## Decision

- Persist the whole session (except derived and transient fields: rules, strategy table,
  RNG, current hint and feedback) under `blackjack.session.v2`, including the round, the
  shoe and any dealer reveal in progress.
- Validate everything on load. Scalar fields are dropped individually if malformed; the
  round is restored only if **every** card, hand and phase validates (`parseRound`).
  Otherwise a fresh shoe is used.
- Migrate v1 saves (stats, bankroll, bet, plus the separate v1 mute setting) on first load.

## Consequences

- Reloading resumes exactly where the player was. The reload loophole is closed for casual
  play. Someone editing localStorage can still cheat, which is acceptable for play money.
- The save includes the remaining shoe order, so the next cards can be read from
  localStorage. Fine for a trainer; not acceptable for anything with real stakes.
