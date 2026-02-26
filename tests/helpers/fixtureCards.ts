import type { Card, Rank, Suit } from "../../packages/game-core/src";
import { createDeck } from "../../packages/game-core/src";

const RANKS = new Set<Rank>(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
const SUITS = new Set<Suit>(["clubs", "diamonds", "hearts", "spades"]);

export function parseFixtureCard(value: string): Card {
  const [rank, suit] = value.split("_");
  if (!rank || !suit || !RANKS.has(rank as Rank) || !SUITS.has(suit as Suit)) {
    throw new Error(`Invalid fixture card: ${value}`);
  }

  return { rank: rank as Rank, suit: suit as Suit };
}

export function buildPaddedShoe(prefixCards: Card[]): Card[] {
  const padding = createDeck(1);
  const shoe = [...prefixCards, ...padding];
  if (shoe.length < 15) {
    throw new Error("Fixture shoe should have at least 15 cards");
  }
  return shoe;
}
