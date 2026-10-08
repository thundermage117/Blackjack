# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
