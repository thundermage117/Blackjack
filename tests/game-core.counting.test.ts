import { describe, expect, it } from "vitest";
import {
  createDeck,
  createSeededRandom,
  hiLoSum,
  hiLoValue,
  runningCount,
  shuffle,
  trueCount,
} from "@blackjack/game-core";
import { cards } from "./helpers/fixtureCards";

describe("Hi-Lo counting", () => {
  it("tags low cards +1, middle cards 0 and tens/aces -1", () => {
    expect(cards("2_clubs", "6_hearts").map(hiLoValue)).toEqual([1, 1]);
    expect(cards("7_clubs", "9_hearts").map(hiLoValue)).toEqual([0, 0]);
    expect(cards("10_clubs", "K_hearts", "A_spades").map(hiLoValue)).toEqual([-1, -1, -1]);
  });

  it("sums a full shoe to zero", () => {
    expect(hiLoSum(createDeck(6))).toBe(0);
  });

  it("derives the running count from what remains in the shoe", () => {
    const shoe = createDeck(1);
    const dealt = shoe.splice(0, 5); // A,2,3,4,5 of clubs: -1 +1 +1 +1 +1 = +3
    expect(runningCount(shoe)).toBe(hiLoSum(dealt));
    expect(runningCount(shoe)).toBe(3);
  });

  it("excludes dealt cards that are still face down", () => {
    const shoe = createDeck(1);
    const dealt = shoe.splice(0, 5);
    const holeCard = dealt[4]; // 5 of clubs, +1, not yet seen
    expect(runningCount(shoe, [holeCard])).toBe(2);
  });

  it("divides by decks remaining for the true count", () => {
    expect(trueCount(6, 156)).toBe(2); // 3 decks left
    expect(trueCount(-3, 78)).toBe(-2); // 1.5 decks left
    expect(trueCount(4, 10)).toBe(8); // floor at half a deck
  });
});

describe("createSeededRandom", () => {
  it("produces the same shuffle for the same seed", () => {
    const a = shuffle(createDeck(1), createSeededRandom(7));
    const b = shuffle(createDeck(1), createSeededRandom(7));
    const c = shuffle(createDeck(1), createSeededRandom(8));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
