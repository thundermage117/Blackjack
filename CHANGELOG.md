# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Count checks no longer show the answer: the running count is hidden until you answer
  or skip.
- On phones, the strategy chart fits the screen (the Ace column was cut off) and the
  "Level" button no longer wraps onto two lines.
- The dealer's Ace shows as "A" rather than "11".
- Situations in Stats are capitalised like everywhere else.

### Fixed

- Card faces: the corner rank and suit no longer crowd or overlap the pips (most visibly
  on the 10s), and the jack, queen and king frames no longer cut through the corner index.
- Small cards (split hands on phones) show a larger index and one clear suit instead of
  unreadable pips.

### Changed

- Table messages talk to you ("You win", "Your turn") instead of about "Player".
- First visit: the coach greets you with what the trainer does and how levels unlock,
  instead of empty "–" statistics.
- The shoe shows "312 left" rather than a bare number, and the disabled Chart button says
  when it becomes available.
- On phones, the coach's verdict on your move appears right under the move buttons instead
  of below the fold.
- When luck and skill disagree, the coach says so: "You won this time, but the odds were
  against that play" or "Right play. It just didn't work out this hand."
- The title, bankroll and menu share one header row (two on phones), so the table starts
  higher on screen. The sound and settings buttons use drawn icons instead of emoji.

## 0.1.1 - 2026-10-09

Android build for testing; not published as a GitHub release.

### Fixed

- On narrower phones (360px wide and below), the move button labels, most visibly
  Surrender, no longer sit off-centre or spill out of the button.
- On phones, the second row of move buttons (Split, Surrender) is centred instead of
  hugging the left edge.

## [0.1.0] - 2026-10-08

### Added (mobile)

- Install the trainer to your home screen (Android, iOS, desktop Chrome and Edge). It opens
  in its own window with a felt-green app icon.
- Offline play: after one visit, the whole app loads and plays without a network.
- When a new version is available, a prompt offers to reload now or later. Your hand in
  progress is kept either way.
- Android app (APK), built with Capacitor. Plays fully offline from first launch.

### Added (learning and full table)

- Four learning levels: Basics, Strategy, Full table and Counting. Each unlocks more
  actions and changes how much help you get. The next level is suggested when you're
  ready, and any level can be chosen in Settings.
- Coach panel: grades every decision against basic strategy with a plain-language reason,
  tracks accuracy and most common mistakes, and shows level progress.
- Splits (up to 4 hands, split aces, double after split), insurance and late surrender.
- Table rules editor (Full table and up): 4/6/8 decks, dealer stands or hits soft 17,
  double after split, surrender, 3:2 or 6:5. Hints and the chart follow the table.
- Strategy chart with the current hand highlighted.
- Hi-Lo running and true count, count checks every 5 hands, optional hidden totals, and
  count-based insurance advice.
- Screen-reader announcements for every card and result; vibration on supported phones.
- The hand in progress is saved and restored on reload.
- `?seed=` URL parameter for reproducible shoes.
- Playwright end-to-end tests (desktop and phone) in CI.
- Fairness test suite: shuffle uniformity (chi-squared), card conservation, and a
  100,000-hand simulation matching the published house edge.

### Changed (learning and full table)

- Redesigned table: casino felt and rail, rules printed on the felt, real card faces,
  colour-coded chips with stacks in betting circles, result stamps, bundled fonts.
- Shuffles use the Web Crypto CSPRNG instead of `Math.random`.
- Reshuffle at 75% penetration instead of a fixed 15 cards.
- Save format v2 (v1 saves migrate automatically).

### Fixed (learning and full table)

- After the dealer's hole card flipped, it vanished and dealt itself in again a moment
  later, out of step with the rest of the table.
- Dialogs shared one title id, so screen readers announced the wrong dialog title.
- Card deal animations could cause sideways scrolling on phones.

### Added

- Play-money bankroll ($1,000 start) with $10/$25/$50/$100 bet chips; 3:2 blackjack payout and
  doubled stakes are now settled.
- Sound effects synthesized with Web Audio: card deal, hole-card flip, shoe shuffle, chip,
  hint chime, and win/lose/push/blackjack stings. Mute toggle (`M`) is remembered.
- Dealer cards are revealed one at a time after you stand or double.
- Deal-in and card-flip animations (disabled under `prefers-reduced-motion`).
- Hint panel that explains the basic-strategy cell and any double fallback.
- Keyboard shortcuts: `N` deal, `H` hit, `S` stand, `D` double, `G` hint, `1`-`4` bet size,
  `M` mute.
- Bankroll, record, bet and mute setting persist across reloads (localStorage).
- ESLint, Prettier and EditorConfig; CI now checks formatting, lint and types.
- Architecture decision records (`docs/adr/`), `docs/architecture.md`, `CONTRIBUTING.md`.
- `vercel.json` for static deployment.

### Changed

- Shared packages are imported by workspace name (`@blackjack/game-core`,
  `@blackjack/hint-engine`) instead of deep relative paths.
- Result messages describe busts and dealer blackjack explicitly.

### Fixed

- Strategy table now matches 6-deck S17 basic strategy: soft 13/14 double vs 5-6, soft 19
  stands vs 6, hard 11 hits vs Ace.
- `npm run typecheck` no longer writes `.js` files next to the TypeScript sources.

[Unreleased]: https://github.com/thundermage117/Blackjack/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/thundermage117/Blackjack/releases/tag/v0.1.0
