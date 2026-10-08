import { runningCount, trueCount, type RoundState } from "@blackjack/game-core";

export interface CountView {
  running: number;
  true: number;
  decksRemaining: number;
}

/**
 * The Hi-Lo count of every card the player has seen.
 *
 * @param dealerVisibleCount Dealer cards face up (during a staged reveal some dealt
 *   cards are not shown yet). Defaults to all, minus the hole card while hidden.
 */
export function countFor(round: RoundState, dealerVisibleCount?: number): CountView {
  const holeHidden = round.dealerHoleHidden;
  const visible =
    dealerVisibleCount ??
    (holeHidden ? Math.min(1, round.dealerHand.length) : round.dealerHand.length);
  const unseen = round.dealerHand.slice(visible);
  const running = runningCount(round.shoe, unseen);
  const cardsRemaining = round.shoe.length + unseen.length;

  return {
    running,
    true: trueCount(running, cardsRemaining),
    decksRemaining: Math.round((cardsRemaining / 52) * 2) / 2,
  };
}
