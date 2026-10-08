import type { Card, Rank, Suit } from "@blackjack/game-core";
import { createDeck } from "@blackjack/game-core";

const RANKS = new Set<Rank>(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
const SUITS = new Set<Suit>(["clubs", "diamonds", "hearts", "spades"]);

export function parseFixtureCard(value: string): Card {
  const [rank, suit] = value.split("_");
  if (!rank || !suit || !RANKS.has(rank as Rank) || !SUITS.has(suit as Suit)) {
    throw new Error(`Invalid fixture card: ${value}`);
  }

  return { rank: rank as Rank, suit: suit as Suit };
}

/**
 * Builds a real six-deck shoe with `prefixCards` moved to the top, so they are dealt
 * first. The shoe keeps exactly 312 cards, which keeps Hi-Lo counts honest (a full
 * shoe sums to zero) and stays above the reshuffle cut card.
 */
export function buildPaddedShoe(prefixCards: Card[]): Card[] {
  const rest = createDeck(6);
  for (const card of prefixCards) {
    const index = rest.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
    if (index === -1) throw new Error(`Shoe has no more ${card.rank} of ${card.suit}`);
    rest.splice(index, 1);
  }
  return [...prefixCards, ...rest];
}

export const cards = (...ids: string[]): Card[] => ids.map(parseFixtureCard);
