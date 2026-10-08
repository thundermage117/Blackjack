# 0004. Synthesize sound effects with the Web Audio API

- Status: Accepted
- Date: 2026-10-08

## Context

The game needed sound effects: card snaps, the hole-card flip, a shoe shuffle, chip clicks, a
hint chime, and win/lose/push/blackjack stings. Options considered:

1. **Recorded audio files** (MP3/OGG). Realistic, but requires sourcing assets with clear
   licences, adds download weight, and needs preloading to avoid latency on the first deal.
2. **A library such as Howler.js.** Solves cross-browser playback but still needs assets.
3. **Synthesis with the Web Audio API.** Filtered noise bursts for cards, short oscillator
   arpeggios for outcomes. No assets and no dependency.

Browsers also block audio until a user gesture, and the sounds must stay in sync with the
staged dealer reveal (ADR-0007).

## Decision

- Synthesize every sound in `apps/web/src/audio/soundEngine.ts` with the Web Audio API.
- Create the `AudioContext` lazily on the first sound. That always happens inside a click or
  keypress, which satisfies autoplay policies.
- Derive sounds from **changes in what is visible on the table**, not from button handlers.
  `cuesForTableChange(prev, next)` in `audio/cues.ts` is a pure function and is unit-tested.
  Only cues with no table change (chip select, hint request) are played directly from
  handlers.
- Persist a mute toggle (`M` key) in localStorage. Audio failures are swallowed; sound never
  breaks gameplay.

## Consequences

- Zero bytes of audio assets and no licensing questions.
- Every card that lands or flips makes exactly one sound, in order, including during the
  dealer reveal, and the mapping is covered by tests.
- Sounds are stylised rather than realistic. Swapping in recorded samples later only means
  changing `SoundEngine.schedule`; the cue mapping stays the same.
- The `SoundEngine` itself is not unit-tested, since Web Audio is not available in Node. It
  is verified with the manual smoke test in `docs/rules.md`.
