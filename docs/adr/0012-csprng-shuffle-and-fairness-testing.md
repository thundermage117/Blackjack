# 0012. Cryptographic shuffle source and statistical fairness tests

- Status: Accepted
- Date: 2026-10-08

## Context

Shuffles used `Math.random()`, which is not a cryptographic generator and has historically
varied in quality between engines. Tests checked rules with stacked shoes but never checked
that shuffles are uniform, that cards are conserved, or that long-run results match real
blackjack.

## Decision

- `secureRandom()` (Web Crypto `getRandomValues`, 32 bits per draw) is the default source
  for every shuffle. `createSeededRandom(seed)` (mulberry32) remains for tests and the
  `?seed=` URL parameter.
- The shuffle is Fisher–Yates. With 32-bit draws, the `floor(r × n)` bias is below n / 2³²,
  under one in ten million for a 312-card shoe.
- `tests/game-core.fairness.test.ts` checks:
  - shoe composition and that shuffling only permutes;
  - uniformity with chi-squared tests (all 24 orders of 4 cards; card-by-position for 8
    cards) at p = 0.001 with fixed seeds, plus a loose (p = 10⁻⁶) smoke test against the
    real CSPRNG;
  - card conservation over 3,000 rounds of random legal play (splits, doubles, surrender,
    insurance) across reshuffles;
  - long-run statistics over 100,000 basic-strategy hands: natural frequency, dealer bust
    rate and house edge within 4 standard errors of published values. Basic strategy must
    also clearly beat "mimic the dealer".

## Consequences

- Statistical tests use fixed seeds, so they are deterministic and never flaky. The one
  CSPRNG test is loose enough to fail by chance about once in a million runs.
- Measured at 400,000 hands: house edge ≈ 0.40% for the default table (published ≈ 0.40%),
  naturals 4.75%, mimic-the-dealer −5.7%, H17 −0.75%, 6:5 −1.85%. These match published
  figures, which also validates the strategy tables.
- The suite adds about a second to `npm test`.
