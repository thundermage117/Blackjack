# 0008. Multi-hand rounds for splits, insurance and surrender

- Status: Accepted
- Date: 2026-10-08

## Context

The MVP engine modelled one player hand (`playerHand`, `playerActionsTaken`, `result`).
Splitting creates up to four hands that are played in turn, and each one wins, loses or
pushes on its own. Insurance is a decision taken before the dealer peeks. Late surrender
ends a hand for half the bet. All three were out of scope for the MVP and are needed for the
Full table level (ADR-0010).

## Decision

- `RoundState.playerHands: PlayerHand[]` plus `activeHandIndex`. Each hand holds its cards,
  actions, `status` (`playing | stood | doubled | busted | blackjack | surrendered`),
  `fromSplit`, and its own `result`. This replaces the single-hand fields (a breaking change).
- **Split:** two cards of equal value (any two ten-value cards count as a pair), up to
  `maxHands` (4). A split hand's second card is dealt only when play reaches it, matching
  casino order. Split aces get one card each and cannot be re-split (`resplitAces: false`).
  A two-card 21 after a split pays 1:1, not 3:2. Doubling after a split follows
  `doubleAfterSplit`.
- **Insurance:** when the dealer shows an Ace and `allowInsurance` is on, the round enters an
  `insurance` phase. `resolveInsurance(take)` records the choice, then the dealer peeks.
  Insurance costs half the bet and pays 2:1 (`settleInsurance`).
- **Late surrender:** only as the first decision on the original two-card hand, after the
  peek. It settles as `surrender` (lose half).
- Hands auto-stand on 21. The dealer only draws if at least one hand is still live (not
  busted or surrendered).
- Money stays out of the engine (ADR-0006 still holds): `settleRound` sums
  `settleWager` per hand plus insurance, with the base bet passed in.

## Consequences

- One code path handles one hand or four. UI, sounds and announcements iterate over
  `playerHands`.
- Persisted v1 rounds are incompatible. Storage moved to v2 (ADR-0011).
- Engine functions stay pure and synchronous, and every new rule has stacked-shoe tests.
