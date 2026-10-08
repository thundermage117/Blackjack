import { scoreHand, type Card, type RoundResult } from "@blackjack/game-core";
import type { SessionState } from "./session";

export interface HandSummaryView {
  totalLabel: string;
  detailLabel: string;
}

/** What is physically on the table right now, accounting for an in-progress dealer reveal. */
export interface TableView {
  handNumber: number;
  playerCards: Card[];
  dealerCards: Card[];
  dealerHoleHidden: boolean;
  /** The round result, withheld until the dealer reveal finishes. */
  result: RoundResult | null;
  shoeCardsRemaining: number;
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

  return {
    handNumber: state.handNumber,
    playerCards: round.playerHand,
    dealerCards,
    dealerHoleHidden,
    result: dealerReveal ? null : (round.result ?? null),
    shoeCardsRemaining: round.shoe.length,
  };
}

function describeScore(hand: Card[]): HandSummaryView {
  const score = scoreHand(hand);
  const detailParts = [score.isSoft ? "Soft hand" : "Hard hand"];
  if (score.isBlackjack) detailParts.push("Blackjack");
  if (score.isBust) detailParts.push("Bust");

  return { totalLabel: `Total ${score.bestTotal}`, detailLabel: detailParts.join(" · ") };
}

export function summarizePlayerHand(cards: Card[]): HandSummaryView {
  if (cards.length === 0) {
    return { totalLabel: "No cards", detailLabel: "Place a bet and deal to play." };
  }
  return describeScore(cards);
}

export function summarizeDealerHand(cards: Card[], holeHidden: boolean): HandSummaryView {
  const upcard = cards[0];
  if (!upcard) {
    return { totalLabel: "No cards", detailLabel: "Dealer hand is empty." };
  }
  if (holeHidden) {
    return {
      totalLabel: `Showing ${scoreHand([upcard]).bestTotal}`,
      detailLabel: "Hole card hidden",
    };
  }
  return describeScore(cards);
}

export function resultLabel(result: RoundResult | null): string | null {
  if (!result) return null;
  if (result === "blackjack_win") return "Blackjack!";
  if (result === "win") return "Win";
  if (result === "lose") return "Lose";
  return "Push";
}

export type ResultTone = "info" | "positive" | "negative" | "neutral";

export function resultTone(result: RoundResult | null): ResultTone {
  if (result === "blackjack_win" || result === "win") return "positive";
  if (result === "lose") return "negative";
  if (result === "push") return "neutral";
  return "info";
}
