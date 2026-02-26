# Blackjack Rules and MVP Acceptance Checklist

Version: 1.0
Last updated: 2026-02-26

## Ruleset (MVP Baseline)

This document defines the exact rules used by the game engine and hint engine for MVP.
If any rule changes, update:

- `docs/rules.md`
- `tests/fixtures/engine-acceptance.json`
- `tests/fixtures/hint-fixtures.json`
- hint strategy tables

### Table Rules

- Single player versus dealer
- One standard 52-card deck
- Dealer receives 2 cards (1 upcard, 1 hole card)
- Player receives 2 cards
- Dealer stands on soft 17 (S17)
- Blackjack pays 3:2
- No insurance
- No surrender
- No split (MVP)
- Double allowed on first two cards only
- Double draws exactly one additional card, then player stands
- Push returns original bet
- Dealer completes hand only after player stands/doubles (unless player busts)

### Round Flow

1. Start round and deal initial cards.
2. If player has natural blackjack:
   - If dealer also has blackjack -> push
   - Otherwise -> player blackjack payout
3. Player turn: `hit`, `stand`, `double` (if eligible)
4. Dealer reveals hole card and draws according to S17 rule
5. Resolve outcome and update session stats

### Card and Scoring Rules

- Number cards count as face value
- `J`, `Q`, `K` count as 10
- `A` counts as 11 unless that would bust, then counts as 1
- A hand may be "soft" if an Ace is counted as 11
- Bust means total > 21

## Acceptance Checklist (MVP Exit)

Mark complete only after tests or repeatable manual checks pass.

- [ ] Initial deal gives 2 cards to player and 2 cards to dealer
- [ ] Dealer shows one upcard and one hidden card in UI
- [ ] Player can hit while round is in player-turn phase
- [ ] Player cannot hit after stand
- [ ] Player cannot double after taking a hit
- [ ] Double action draws exactly one card and ends player turn
- [ ] Ace scoring correctly switches between 11 and 1
- [ ] Natural blackjack detected on initial two cards only
- [ ] Blackjack vs dealer blackjack resolves as push
- [ ] Dealer stands on soft 17
- [ ] Dealer draws on soft 16
- [ ] Dealer draw loop terminates at valid stop condition
- [ ] Round resolves correctly for win/loss/push
- [ ] Blackjack payout uses 3:2 (and not 1:1)
- [ ] Hint button is disabled when no hint is valid (round over/loading)
- [ ] Hint output matches fixture expectations for current ruleset
- [ ] Session stats increment correctly after each completed round
- [ ] UI remains usable on mobile width (e.g. 375px)

## Manual Smoke Test Script

Use this for quick regression checks during UI development.

1. Start a new round.
2. Press `Hint` and confirm a valid action is shown.
3. Play until stand or bust.
4. Confirm dealer turn and result banner.
5. Start another round and confirm stats update.
6. Repeat on desktop and mobile viewport.

## Notes for Future Rule Changes

- Adding splits requires:
  - multiple player hands in game state
  - turn cursor per hand
  - pair strategy table rows in hint engine
  - payout and double restrictions per split hand
- Changing dealer H17/S17 requires hint fixtures and dealer draw tests to change together.
