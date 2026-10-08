import type { RoundResult } from "@blackjack/game-core";
import type { TableView } from "../state/tableView";

export type SoundCue =
  "deal" | "flip" | "shuffle" | "chip" | "hint" | "win" | "blackjack" | "lose" | "push";

function outcomeCue(result: RoundResult): SoundCue {
  if (result === "blackjack_win") return "blackjack";
  if (result === "win") return "win";
  if (result === "lose") return "lose";
  return "push";
}

/**
 * Derives the sounds for a change in what is visible on the table, in play order.
 *
 * Sound is a pure function of table changes (not of button presses), so every
 * card that lands or flips is heard exactly once and in sync with the UI.
 */
export function cuesForTableChange(prev: TableView, next: TableView): SoundCue[] {
  const cues: SoundCue[] = [];
  const isNewHand = next.handNumber !== prev.handNumber;

  if (isNewHand && next.shoeCardsRemaining > prev.shoeCardsRemaining) {
    cues.push("shuffle");
  }

  const prevPlayer = isNewHand ? 0 : prev.playerCards.length;
  const prevDealer = isNewHand ? 0 : prev.dealerCards.length;
  const dealtCount =
    Math.max(0, next.playerCards.length - prevPlayer) +
    Math.max(0, next.dealerCards.length - prevDealer);
  for (let i = 0; i < dealtCount; i += 1) cues.push("deal");

  const holeFlipped = !isNewHand && prev.dealerHoleHidden && !next.dealerHoleHidden;
  if (holeFlipped) cues.push("flip");

  if (next.result && (isNewHand || !prev.result)) {
    cues.push(outcomeCue(next.result));
  }

  return cues;
}
