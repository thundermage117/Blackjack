import type { Card } from "./types";

/** Hi-Lo tag: 2-6 are +1, 7-9 are 0, tens and aces are -1. */
export function hiLoValue(card: Card): -1 | 0 | 1 {
  if (card.rank === "A" || card.rank === "10" || card.rank === "J") return -1;
  if (card.rank === "Q" || card.rank === "K") return -1;
  if (card.rank === "7" || card.rank === "8" || card.rank === "9") return 0;
  return 1;
}

export function hiLoSum(cards: readonly Card[]): number {
  return cards.reduce((sum, card) => sum + hiLoValue(card), 0);
}

/**
 * Running count of every card seen since the last shuffle.
 *
 * A full shoe sums to zero under Hi-Lo, so the count of dealt cards is the negated
 * sum of what is left in the shoe. Cards dealt but still face down (the dealer's
 * hole card) have not been seen, so they are added back.
 */
export function runningCount(
  shoe: readonly Card[],
  unseenDealtCards: readonly Card[] = [],
): number {
  return -hiLoSum(shoe) - hiLoSum(unseenDealtCards);
}

/** Running count divided by decks remaining, rounded to the nearest half deck. */
export function trueCount(running: number, cardsRemaining: number): number {
  const decksRemaining = Math.max(0.5, Math.round((cardsRemaining / 52) * 2) / 2);
  return Math.round((running / decksRemaining) * 10) / 10;
}
