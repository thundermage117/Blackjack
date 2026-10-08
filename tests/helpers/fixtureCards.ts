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
 * Puts `prefixCards` on top of six unshuffled decks, so the stacked cards are dealt
 * first and the shoe stays above the reshuffle cut card.
 */
export function buildPaddedShoe(prefixCards: Card[]): Card[] {
  return [...prefixCards, ...createDeck(6)];
}

export const cards = (...ids: string[]): Card[] => ids.map(parseFixtureCard);
