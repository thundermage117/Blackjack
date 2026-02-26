export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type PlayerAction = "hit" | "stand" | "double";
export type RoundPhase = "idle" | "player-turn" | "dealer-turn" | "round-over";
export type RoundResult = "win" | "lose" | "push" | "blackjack_win";

export interface GameRules {
  dealerSoft17: "stand" | "hit";
  blackjackPayout: number;
  allowDouble: boolean;
  allowSplit: boolean;
  allowSurrender: boolean;
  deckCount: number;
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
  playerHand: Card[];
  dealerHand: Card[];
  dealerHoleHidden: boolean;
  playerActionsTaken: PlayerAction[];
  result?: RoundResult;
  message?: string;
}
