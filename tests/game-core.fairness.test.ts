import { beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_MVP_RULES,
  createDeck,
  createInitialRoundState,
  createSeededRandom,
  dealRound,
  getActiveHand,
  isActionAllowed,
  reduceRoundState,
  secureRandom,
  shuffle,
  type Card,
  type PlayerAction,
  type RoundState,
} from "@blackjack/game-core";
import { mvpS17StrategyTable } from "@blackjack/hint-engine";
import { basicStrategy, mimicDealer, simulate, type SimulationResult } from "./helpers/simulate";

/*
 * Fairness tests. Statistical tests use fixed seeds, so they are deterministic and never
 * flaky; one smoke test also runs against the real CSPRNG with a very loose threshold.
 */

const key = (card: Card) => `${card.rank}-${card.suit}`;

function counts(cards: readonly Card[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const card of cards) map.set(key(card), (map.get(key(card)) ?? 0) + 1);
  return map;
}

/** Pearson chi-squared statistic against a uniform expectation. */
function chiSquared(observed: number[], expected: number): number {
  return observed.reduce((sum, o) => sum + (o - expected) ** 2 / expected, 0);
}

describe("shoe composition", () => {
  it.each([1, 4, 6, 8])("a %i-deck shoe has every card exactly that many times", (decks) => {
    const shoe = createDeck(decks);
    expect(shoe).toHaveLength(52 * decks);
    const byCard = counts(shoe);
    expect(byCard.size).toBe(52);
    expect([...byCard.values()].every((n) => n === decks)).toBe(true);
  });

  it("shuffling permutes the shoe without adding or losing cards", () => {
    const shoe = createDeck(6);
    expect(counts(shuffle(shoe))).toEqual(counts(shoe));
    expect(shuffle(shoe)).not.toEqual(shoe);
  });
});

describe("randomness source", () => {
  it("secureRandom returns values in [0, 1) with a sensible mean", () => {
    const samples = Array.from({ length: 20_000 }, secureRandom);
    expect(samples.every((x) => x >= 0 && x < 1)).toBe(true);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    // Standard error of the mean is ~0.002; allow 5 sigma.
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.01);
  });
});

describe("shuffle uniformity", () => {
  it("produces all 24 orders of 4 cards equally often (chi-squared, seeded)", () => {
    const cards = createDeck(1).slice(0, 4);
    const random = createSeededRandom(2024);
    const trials = 48_000;
    const tally = new Map<string, number>();
    for (let i = 0; i < trials; i += 1) {
      const order = shuffle(cards, random).map(key).join(",");
      tally.set(order, (tally.get(order) ?? 0) + 1);
    }

    expect(tally.size).toBe(24);
    // df = 23; critical value at p = 0.001 is 49.73.
    expect(chiSquared([...tally.values()], trials / 24)).toBeLessThan(49.73);
  });

  it("puts each card in each position equally often (chi-squared, seeded)", () => {
    const cards = createDeck(1).slice(0, 8);
    const random = createSeededRandom(7);
    const trials = 40_000;
    const positions = cards.map(() => new Array<number>(cards.length).fill(0));
    for (let t = 0; t < trials; t += 1) {
      shuffle(cards, random).forEach((card, position) => {
        positions[cards.findIndex((c) => key(c) === key(card))][position] += 1;
      });
    }

    // Each row: df = 7; critical value at p = 0.001 is 24.32.
    for (const row of positions) {
      expect(chiSquared(row, trials / cards.length)).toBeLessThan(24.32);
    }
  });

  it("shows no positional bias with the real CSPRNG (loose smoke test)", () => {
    const cards = createDeck(1).slice(0, 6);
    const trials = 30_000;
    const firstPosition = new Array<number>(cards.length).fill(0);
    for (let t = 0; t < trials; t += 1) {
      const top = shuffle(cards)[0];
      firstPosition[cards.findIndex((c) => key(c) === key(top))] += 1;
    }
    // df = 5; critical value at p = 1e-6 is 35.9, so this essentially never fails by chance.
    expect(chiSquared(firstPosition, trials / cards.length)).toBeLessThan(35.9);
  });
});

/** Picks a random legal action, so play covers splits, doubles and surrender too. */
function randomLegalAction(round: RoundState, random: () => number): PlayerAction {
  const legal = (["hit", "stand", "double", "split", "surrender"] as const).filter((action) =>
    isActionAllowed(round, action, rulesWithEverything),
  );
  return legal[Math.floor(random() * legal.length)];
}

const rulesWithEverything = { ...DEFAULT_MVP_RULES, allowSurrender: true };

describe("card conservation", () => {
  it("never creates, loses or duplicates a card across thousands of rounds and reshuffles", () => {
    const random = createSeededRandom(99);
    const full = counts(createDeck(rulesWithEverything.deckCount));
    let round = createInitialRoundState(rulesWithEverything, random);
    let seenSinceShuffle: Card[] = [];
    let reshuffles = 0;

    for (let i = 0; i < 3_000; i += 1) {
      const before = round.shoe.length;
      round = dealRound(round, rulesWithEverything, random);
      if (round.shoe.length + 4 > before) {
        reshuffles += 1;
        seenSinceShuffle = [];
      }
      if (round.phase === "insurance") {
        round = reduceRoundState(
          round,
          { type: "insurance", take: random() < 0.5 },
          rulesWithEverything,
        );
      }
      while (round.phase === "player-turn" && getActiveHand(round)) {
        round = reduceRoundState(
          round,
          { type: randomLegalAction(round, random) },
          rulesWithEverything,
        );
      }

      seenSinceShuffle = [
        ...seenSinceShuffle,
        ...round.playerHands.flatMap((hand) => hand.cards),
        ...round.dealerHand,
      ];
      // Everything dealt since the shuffle plus what is left is exactly one full shoe.
      expect(counts([...seenSinceShuffle, ...round.shoe])).toEqual(full);
    }

    expect(reshuffles).toBeGreaterThan(10);
  });
});

describe("long-run statistics (100,000 hands, basic strategy, seeded)", () => {
  const hands = 100_000;
  let result: SimulationResult;

  beforeAll(() => {
    result = simulate(
      hands,
      DEFAULT_MVP_RULES,
      basicStrategy(mvpS17StrategyTable),
      createSeededRandom(31337),
    );
  });

  it("deals the player a natural about 4.75% of the time", () => {
    // Exact 6-deck probability is ~4.75%; standard error at 100k hands is ~0.07%.
    expect(result.playerBlackjackRate).toBeGreaterThan(0.0447);
    expect(result.playerBlackjackRate).toBeLessThan(0.0503);
  });

  it("has the dealer bust at a plausible rate when the dealer plays out", () => {
    // About 28% overall for S17; conditioning on live player hands keeps it in the high 20s.
    expect(result.dealerBustRate).toBeGreaterThan(0.26);
    expect(result.dealerBustRate).toBeLessThan(0.31);
  });

  it("gives the house a small edge, close to the published ~0.4% for these rules", () => {
    // Per-hand standard deviation is ~1.15 units, so the standard error is ~0.36%.
    // A 4-sigma band still catches gross bugs such as paying blackjack 1:1 (-2.3%).
    expect(result.returnPerHand).toBeGreaterThan(-0.004 - 0.0145);
    expect(result.returnPerHand).toBeLessThan(-0.004 + 0.0145);
  });

  it("beats a naive mimic-the-dealer strategy by a wide margin", () => {
    const mimic = simulate(hands, DEFAULT_MVP_RULES, mimicDealer, createSeededRandom(31337));
    // Mimicking the dealer costs roughly 5.5%; basic strategy should be far better.
    expect(mimic.returnPerHand).toBeLessThan(-0.03);
    expect(result.returnPerHand - mimic.returnPerHand).toBeGreaterThan(0.025);
  });
});
