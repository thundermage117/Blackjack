import type { Card, Rank, Suit } from "./types";

const SUITS: Suit[] = ["clubs", "diamonds", "hearts", "spades"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function createDeck(deckCount = 1): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < deckCount; d += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit });
      }
    }
  }
  return deck;
}

/**
 * Uniform random number in [0, 1) from the platform CSPRNG (`crypto.getRandomValues`),
 * the default shuffle source. Falls back to Math.random only where Web Crypto is missing.
 */
export function secureRandom(): number {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) return Math.random();
  const buffer = new Uint32Array(1);
  cryptoApi.getRandomValues(buffer);
  return buffer[0] / 2 ** 32;
}

/**
 * Fisher-Yates shuffle: every permutation is equally likely given a uniform `random`.
 * With a 32-bit source the modulo-style bias of `floor(r * n)` is below n / 2^32,
 * i.e. under one in ten million for a 312-card shoe.
 */
export function shuffle(cards: Card[], random: () => number = secureRandom): Card[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function cardLabel(card: Card): string {
  return `${card.rank} of ${card.suit}`;
}

/**
 * Deterministic PRNG (mulberry32) for reproducible shoes in tests and shared seeds.
 * Not suitable for anything where unpredictability matters.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
