import type { RoundResult } from "@blackjack/game-core";
import type { TableView } from "../state/tableView";

export type SoundCue =
  | "deal"
  | "flip"
  | "shuffle"
  | "chip"
  | "hint"
  | "correct"
  | "mistake"
  | "win"
  | "blackjack"
  | "lose"
  | "push";

function playerCardCount(view: TableView): number {
  return view.playerHands.reduce((sum, hand) => sum + hand.cards.length, 0);
}

/** One sound for a whole round: blackjack beats wins beats pushes beats losses. */
export function outcomeCue(results: RoundResult[]): SoundCue | null {
  if (results.length === 0) return null;
  if (results.includes("blackjack_win")) return "blackjack";
  const wins = results.filter((r) => r === "win").length;
  const losses = results.filter((r) => r === "lose" || r === "surrender").length;
  if (wins > losses) return "win";
  if (losses > wins) return "lose";
  return "push";
}

function settledResults(view: TableView): RoundResult[] {
  return view.playerHands.flatMap((hand) => (hand.result ? [hand.result] : []));
}

/**
 * Derives the sounds for a change in what is visible on the table, in play order.
 *
 * Sound is a pure function of table changes (not of button presses), so every
 * card that lands or flips is heard exactly once and in sync with the UI (ADR-0004).
 */
export function cuesForTableChange(prev: TableView, next: TableView): SoundCue[] {
  const cues: SoundCue[] = [];
  const isNewHand = next.handNumber !== prev.handNumber;

  if (isNewHand && next.shoeCardsRemaining > prev.shoeCardsRemaining) {
    cues.push("shuffle");
  }

  const prevPlayer = isNewHand ? 0 : playerCardCount(prev);
  const prevDealer = isNewHand ? 0 : prev.dealerCards.length;
  const dealtCount =
    Math.max(0, playerCardCount(next) - prevPlayer) +
    Math.max(0, next.dealerCards.length - prevDealer);
  for (let i = 0; i < dealtCount; i += 1) cues.push("deal");

  const holeFlipped = !isNewHand && prev.dealerHoleHidden && !next.dealerHoleHidden;
  if (holeFlipped) cues.push("flip");

  if (next.isSettled && (isNewHand || !prev.isSettled)) {
    const outcome = outcomeCue(settledResults(next));
    if (outcome) cues.push(outcome);
  }

  return cues;
}
