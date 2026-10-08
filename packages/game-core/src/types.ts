export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type PlayerAction = "hit" | "stand" | "double" | "split" | "surrender";
/** `insurance`: dealer shows an Ace and the player is deciding on insurance before the peek. */
export type RoundPhase = "idle" | "insurance" | "player-turn" | "dealer-turn" | "round-over";
export type RoundResult = "win" | "lose" | "push" | "blackjack_win" | "surrender";

export type InsuranceState = "none" | "offered" | "taken" | "declined";

/**
 * - `playing`: still taking decisions
 * - `stood`: finished without busting (includes auto-stand on 21 and split aces)
 * - `doubled`: received its one double-down card and is finished
 * - `busted`: total over 21
 * - `blackjack`: natural 21 on the initial deal
 * - `surrendered`: gave up half the bet (late surrender)
 */
export type HandStatus = "playing" | "stood" | "doubled" | "busted" | "blackjack" | "surrendered";

export interface PlayerHand {
  cards: Card[];
  actions: PlayerAction[];
  status: HandStatus;
  /** Hands created by a split never count a two-card 21 as a natural. */
  fromSplit: boolean;
  result?: RoundResult;
}

export interface GameRules {
  dealerSoft17: "stand" | "hit";
  blackjackPayout: number;
  allowDouble: boolean;
  allowSplit: boolean;
  /** Late surrender: forfeit half the bet on the first two cards, after the dealer peeks. */
  allowSurrender: boolean;
  /** Offer insurance (a side bet of half the bet, paying 2:1) when the dealer shows an Ace. */
  allowInsurance: boolean;
  /** Double down permitted on a hand created by splitting (DAS). */
  doubleAfterSplit: boolean;
  /** Maximum number of player hands after splitting and re-splitting. */
  maxHands: number;
  /** Whether a hand made from split aces may be split again. */
  resplitAces: boolean;
  deckCount: number;
  /** Shuffle before the next deal once fewer than this many cards remain. */
  reshuffleCutoffCards: number;
}

export interface HandScore {
  hardTotal: number;
  bestTotal: number;
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

export interface RoundState {
  phase: RoundPhase;
  shoe: Card[];
  reshufflePending: boolean;
  playerHands: PlayerHand[];
  /** Index into `playerHands` of the hand currently being played. */
  activeHandIndex: number;
  dealerHand: Card[];
  dealerHoleHidden: boolean;
  insurance: InsuranceState;
  message?: string;
}
