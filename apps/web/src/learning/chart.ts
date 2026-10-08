import { getActiveHand, isPair, pairKey, scoreHand, type RoundState } from "@blackjack/game-core";
import { normalizeDealerUpcard, type DealerUpcardKey } from "@blackjack/hint-engine";

export type ChartSection = "hard" | "soft" | "pair";

export interface ChartCell {
  section: ChartSection;
  row: string;
  upcard: DealerUpcardKey;
}

/**
 * The strategy-chart cell for the hand being played, so the chart can highlight it.
 * Pairs point at the pair section only when splitting is possible.
 */
export function chartCellFor(round: RoundState, splitPossible: boolean): ChartCell | null {
  const hand = getActiveHand(round);
  const upcard = round.dealerHand[0];
  if (!hand || !upcard) return null;

  const dealerUpcard = normalizeDealerUpcard(upcard.rank);
  if (splitPossible && isPair(hand.cards)) {
    return { section: "pair", row: pairKey(hand.cards[0]), upcard: dealerUpcard };
  }
  const score = scoreHand(hand.cards);
  return {
    section: score.isSoft ? "soft" : "hard",
    row: String(score.bestTotal),
    upcard: dealerUpcard,
  };
}
