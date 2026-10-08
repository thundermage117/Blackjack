import type { Card, HandScore } from "./types";

function rankValue(card: Card): number {
  if (card.rank === "A") return 11;
  if (["K", "Q", "J"].includes(card.rank)) return 10;
  return Number(card.rank);
}

export function scoreHand(hand: Card[]): HandScore {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    total += rankValue(card);
    if (card.rank === "A") aces += 1;
  }

  let bestTotal = total;
  let remainingAces = aces;
  while (bestTotal > 21 && remainingAces > 0) {
    bestTotal -= 10;
    remainingAces -= 1;
  }

  // A hand is soft if at least one Ace is still counted as 11 after reductions.
  const isSoft = aces > 0 && remainingAces > 0 && bestTotal <= 21;
  const isBlackjack = hand.length === 2 && bestTotal === 21;

  return {
    hardTotal: total - aces * 10,
    bestTotal,
    isSoft,
    isBust: bestTotal > 21,
    isBlackjack,
  };
}

export function shouldDealerDraw(hand: Card[], dealerSoft17Rule: "stand" | "hit"): boolean {
  const score = scoreHand(hand);
  if (score.bestTotal < 17) return true;
  if (score.bestTotal > 17) return false;
  if (!score.isSoft) return false;
  return dealerSoft17Rule === "hit";
}

/** Split-equivalence key: tens (10, J, Q, K) are interchangeable, everything else by rank. */
export function pairKey(card: Card): "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" {
  if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return "10";
  return card.rank;
}

export function isPair(cards: Card[]): boolean {
  return cards.length === 2 && pairKey(cards[0]) === pairKey(cards[1]);
}
