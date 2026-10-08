# Blackjack Rules and Acceptance Checklist

Version: 2.0
Last updated: 2026-10-08

This document defines the rules the game engine and hint engine implement. If a rule
changes, update in the same commit:

- `docs/rules.md`
- `packages/game-core/src/rules.ts` and the engine
- `packages/hint-engine/src/basicStrategyTable.ts` and `docs/hint-strategy-format.md`
- `tests/fixtures/engine-acceptance.json`, `tests/fixtures/hint-fixtures.json`

## Default table

Levels 1 and 2 always use this table. From level 3 the player may change the options in
the next section.

- Single player against the dealer, six-deck shoe
- Cut card at 75% penetration: the shoe is reshuffled before the next deal once fewer than
  25% of the cards remain
- Dealer stands on soft 17 (S17)
- Dealer peeks for blackjack when showing an Ace or a ten (naturals settle immediately)
- Blackjack pays 3:2
- Double on any first two cards, including after a split (DAS)
- Split any pair of equal value (10, J, Q and K count as a pair), up to 4 hands
- Split aces receive one card each and cannot be re-split
- 21 after a split is not a blackjack and pays 1:1
- Insurance offered when the dealer shows an Ace (from level 3): costs half the bet, pays 2:1
- No surrender on the default table
- Hands that reach 21 stand automatically
- Push returns the bet

## Table options (level 3 and above)

| Option             | Choices                     |
| ------------------ | --------------------------- |
| Decks              | 4, 6, 8                     |
| Soft 17            | Dealer stands / dealer hits |
| Double after split | On / off                    |
| Late surrender     | On / off                    |
| Blackjack pays     | 3:2 / 6:5                   |

Late surrender: the first decision on the original two-card hand, after the dealer peeks,
forfeits half the bet. Not available after splitting.

One- and two-deck games are not offered (see ADR-0009).

## Betting

- Play-money bankroll starting at $1,000; bets of $10, $25, $50 or $100, chosen between hands
- Doubling and splitting each need the bankroll to cover another base bet; insurance needs
  half a bet

## Round flow

1. Deal: player, dealer upcard, player, dealer hole card.
2. If the dealer shows an Ace and insurance is on, the player takes or declines insurance.
3. The dealer peeks. A natural on either side ends the round (player natural vs dealer
   natural is a push).
4. The player plays each hand in turn: hit, stand, double, split, surrender (as allowed).
5. If any hand is still live, the dealer reveals the hole card and draws to the soft-17 rule.
6. Each hand settles separately, then insurance. Session stats and the bankroll update.

## Card and scoring rules

- Number cards count face value; J, Q and K count 10
- An Ace counts 11 unless that would bust, then 1; a hand with an Ace counted as 11 is soft
- Bust means a total over 21

## Learning levels

| Level        | Player actions         | Assists                                                         |
| ------------ | ---------------------- | --------------------------------------------------------------- |
| 1 Basics     | Hit, Stand             | Best move highlighted and explained, feedback on every decision |
| 2 Strategy   | + Double, Split        | Hints on request, feedback on mistakes, strategy chart          |
| 3 Full table | + Insurance, Surrender | Table rules editor                                              |
| 4 Counting   | same as 3              | Hi-Lo count, count checks every 5 hands, optional hidden totals |

The next level is suggested after enough accurate decisions; players can pick any level in
Settings. See ADR-0010.

## Acceptance checklist

Each item names where it is verified.

- [x] Initial deal gives 2 cards each; dealer hole card hidden (`game-core.round-flow`)
- [x] Hit only during the player turn; no hit or double after stand (`game-core.round-flow`)
- [x] Double only as the first decision; draws exactly one card (`game-core.round-flow`)
- [x] Ace scoring switches between 11 and 1 (`game-core.engine`)
- [x] Natural only on the initial two cards; not after a split (`game-core.round-flow`)
- [x] Natural vs dealer natural pushes; dealer natural ends the round (`game-core.engine`, `game-core.round-flow`)
- [x] Dealer stands on soft 17 (S17) and hits it (H17) per the table (`game-core.engine`, `game-core.round-flow`)
- [x] Win/loss/push resolve correctly (`game-core.round-flow`)
- [x] 3:2 and 6:5 payouts, doubled stakes, surrender, insurance (`game-core.settlement`)
- [x] Split: pairs by value, casino card order, DAS on/off, split aces, max 4 hands (`game-core.round-flow`)
- [x] Insurance offered only on an Ace and only when enabled (`game-core.round-flow`, `web.session`)
- [x] Late surrender only as the first decision and never after a split (`game-core.round-flow`)
- [x] Hints match fixtures for every rule variant (`hint-engine.fixtures`, `hint-engine.table`)
- [x] Levels lock and unlock actions and table rules (`web.learning`, `web.session`, e2e)
- [x] Session stats and bankroll update after each round, per split hand (`web.session`)
- [x] Hand in progress survives a reload (`web.storage`, e2e)
- [x] Shuffles are uniform and cards are conserved (`game-core.fairness`)
- [x] Long-run house edge matches published figures (`game-core.fairness`)
- [x] Usable on a phone with no horizontal scrolling (e2e, Pixel 7 viewport)

## Manual smoke test

The Playwright suite (`npm run test:e2e`) covers most of this. Sound and vibration still
need a person:

1. Deal a hand: four card snaps. Stand: a flip for the hole card, a snap per dealer card,
   then a win/lose/push sound.
2. At level 1, make a wrong move: a low "mistake" tone with the explanation.
3. Press `M`: sound stops; reload: it stays muted.
4. On a phone, cards and results vibrate (Android; iOS Safari has no vibration API).
