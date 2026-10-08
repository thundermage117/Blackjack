import type { GameRules, RoundResult, RoundState } from "./types";

export interface WagerSettlement {
  /** Total amount put at risk for the round (base bet, doubled if the player doubled). */
  stake: number;
  /** Chips won (positive) or lost (negative) relative to the bankroll before the round. */
  net: number;
}

export function hasDoubled(state: Pick<RoundState, "playerActionsTaken">): boolean {
  return state.playerActionsTaken.includes("double");
}

/**
 * Settles a finished round against a base bet.
 *
 * Kept separate from round state transitions so the engine stays bet-agnostic:
 * the caller owns the bankroll and passes the bet in at settlement time.
 */
export function settleWager(
  result: RoundResult,
  baseBet: number,
  doubled: boolean,
  rules: Pick<GameRules, "blackjackPayout">,
): WagerSettlement {
  if (!Number.isFinite(baseBet) || baseBet < 0) {
    throw new Error(`Invalid bet: ${baseBet}`);
  }

  const stake = doubled ? baseBet * 2 : baseBet;
  if (result === "blackjack_win") return { stake, net: stake * rules.blackjackPayout };
  if (result === "win") return { stake, net: stake };
  if (result === "lose") return { stake, net: -stake };
  return { stake, net: 0 };
}
