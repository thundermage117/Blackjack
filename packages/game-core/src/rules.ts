import type { GameRules } from "./types";

/** Deck counts the strategy tables are valid for (multi-deck basic strategy, see ADR-0009). */
export const SUPPORTED_DECK_COUNTS = [4, 6, 8] as const;
export type SupportedDeckCount = (typeof SUPPORTED_DECK_COUNTS)[number];

/** Fraction of the shoe dealt before the cut card triggers a reshuffle. */
export const SHOE_PENETRATION = 0.75;

export const BLACKJACK_PAYOUTS = [1.5, 1.2] as const;
export type BlackjackPayout = (typeof BLACKJACK_PAYOUTS)[number];

/** The table rules a player can choose (from the Full Table level onward). */
export interface TableOptions {
  deckCount: SupportedDeckCount;
  dealerSoft17: GameRules["dealerSoft17"];
  doubleAfterSplit: boolean;
  surrender: boolean;
  /** 1.5 is 3:2; 1.2 is the player-hostile 6:5 found on some tables. */
  blackjackPayout: BlackjackPayout;
}

export function reshuffleCutoffFor(deckCount: number): number {
  return Math.round(deckCount * 52 * (1 - SHOE_PENETRATION));
}

/** Builds a full ruleset for one of the supported table configurations. */
export function createRules(options: TableOptions): GameRules {
  return {
    dealerSoft17: options.dealerSoft17,
    blackjackPayout: options.blackjackPayout,
    allowDouble: true,
    allowSplit: true,
    allowSurrender: options.surrender,
    allowInsurance: true,
    doubleAfterSplit: options.doubleAfterSplit,
    maxHands: 4,
    resplitAces: false,
    deckCount: options.deckCount,
    reshuffleCutoffCards: reshuffleCutoffFor(options.deckCount),
  };
}

export const DEFAULT_TABLE_OPTIONS: TableOptions = {
  deckCount: 6,
  dealerSoft17: "stand",
  doubleAfterSplit: true,
  surrender: false,
  blackjackPayout: 1.5,
};

/** Full rules for the default table. Levels may switch individual actions off (see web `levels`). */
export const DEFAULT_MVP_RULES: GameRules = createRules(DEFAULT_TABLE_OPTIONS);

export function isSupportedDeckCount(value: unknown): value is SupportedDeckCount {
  return SUPPORTED_DECK_COUNTS.includes(value as SupportedDeckCount);
}

export function isBlackjackPayout(value: unknown): value is BlackjackPayout {
  return BLACKJACK_PAYOUTS.includes(value as BlackjackPayout);
}
