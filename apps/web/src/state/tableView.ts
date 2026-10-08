import {
  scoreHand,
  type Card,
  type HandStatus,
  type RoundPhase,
  type RoundResult,
} from "@blackjack/game-core";
import { countFor, type CountView } from "../learning/counting";
import type { SessionState } from "./session";

export interface HandSummaryView {
  totalLabel: string;
  detailLabel: string;
}

export interface PlayerHandView {
  cards: Card[];
  status: HandStatus;
  isActive: boolean;
  doubled: boolean;
  /** Withheld until the dealer reveal finishes. */
  result: RoundResult | null;
}

/** What is physically on the table right now, accounting for an in-progress dealer reveal. */
export interface TableView {
  handNumber: number;
  phase: RoundPhase;
  playerHands: PlayerHandView[];
  dealerCards: Card[];
  dealerHoleHidden: boolean;
  /** True once the round is over and fully revealed. */
  isSettled: boolean;
  shoeCardsRemaining: number;
  count: CountView;
}

export function selectTableView(state: SessionState): TableView {
  const { round, dealerReveal } = state;

  let dealerCards = round.dealerHand;
  let dealerHoleHidden = round.dealerHoleHidden;
  if (dealerReveal) {
    // Before the hole card flips, both initial cards are on the table (one face down).
    dealerCards = round.dealerHand.slice(0, Math.max(2, dealerReveal.visibleCount));
    dealerHoleHidden = dealerReveal.visibleCount < 2;
  }
  const dealerFaceUp = dealerCards.length - (dealerHoleHidden ? 1 : 0);
  const isSettled = round.phase === "round-over" && !dealerReveal;

  return {
    handNumber: state.handNumber,
    phase: dealerReveal ? "dealer-turn" : round.phase,
    playerHands: round.playerHands.map((hand, index) => ({
      cards: hand.cards,
      status: hand.status,
      isActive: round.phase === "player-turn" && index === round.activeHandIndex,
      doubled: hand.actions.includes("double"),
      result: isSettled ? (hand.result ?? null) : null,
    })),
    dealerCards,
    dealerHoleHidden,
    isSettled,
    shoeCardsRemaining: round.shoe.length,
    count: countFor(round, dealerFaceUp),
  };
}

function describeScore(hand: Card[]): HandSummaryView {
  const score = scoreHand(hand);
  const detailParts = [score.isSoft ? "Soft" : "Hard"];
  if (score.isBlackjack) detailParts.push("Blackjack");
  if (score.isBust) detailParts.push("Bust");
  return { totalLabel: String(score.bestTotal), detailLabel: detailParts.join(" · ") };
}

export function summarizeHand(cards: Card[]): HandSummaryView {
  if (cards.length === 0) return { totalLabel: "–", detailLabel: "" };
  return describeScore(cards);
}

export function summarizeDealerHand(cards: Card[], holeHidden: boolean): HandSummaryView {
  const upcard = cards[0];
  if (!upcard) return { totalLabel: "–", detailLabel: "" };
  if (holeHidden) {
    return { totalLabel: String(scoreHand([upcard]).bestTotal), detailLabel: "Showing" };
  }
  return describeScore(cards);
}

export function resultLabel(result: RoundResult | null): string | null {
  if (!result) return null;
  if (result === "blackjack_win") return "Blackjack!";
  if (result === "win") return "Win";
  if (result === "lose") return "Lose";
  if (result === "surrender") return "Surrendered";
  return "Push";
}

export type ResultTone = "info" | "positive" | "negative" | "neutral";

export function resultTone(result: RoundResult | null): ResultTone {
  if (result === "blackjack_win" || result === "win") return "positive";
  if (result === "lose" || result === "surrender") return "negative";
  if (result === "push") return "neutral";
  return "info";
}

/** One tone for the whole round, from its net result. */
export function toneForNet(net: number | null): ResultTone {
  if (net === null) return "info";
  if (net > 0) return "positive";
  if (net < 0) return "negative";
  return "neutral";
}
