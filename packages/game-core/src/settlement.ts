import { scoreHand } from "./scoring";
import type { GameRules, PlayerHand, RoundResult, RoundState } from "./types";

export interface WagerSettlement {
  /** Total amount put at risk (base bet per hand, doubled where the player doubled). */
  stake: number;
  /** Chips won (positive) or lost (negative) relative to the bankroll before the round. */
  net: number;
}

export function hasDoubled(hand: Pick<PlayerHand, "actions">): boolean {
  return hand.actions.includes("double");
}

/**
 * Settles one hand against a base bet.
 *
 * Kept separate from round state transitions so the engine stays bet-agnostic
 * (ADR-0006): the caller owns the bankroll and passes the bet in at settlement time.
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
  if (result === "surrender") return { stake, net: -stake / 2 };
  return { stake, net: 0 };
}

/** Insurance costs half the base bet and pays 2:1 when the dealer has blackjack. */
export function settleInsurance(
  state: Pick<RoundState, "insurance" | "dealerHand">,
  baseBet: number,
): WagerSettlement {
  if (state.insurance !== "taken") return { stake: 0, net: 0 };
  const stake = baseBet / 2;
  const dealerBlackjack = scoreHand(state.dealerHand).isBlackjack;
  return { stake, net: dealerBlackjack ? stake * 2 : -stake };
}

/** Settles every hand of a finished round plus any insurance; each split hand carries the base bet. */
export function settleRound(
  state: Pick<RoundState, "phase" | "playerHands" | "insurance" | "dealerHand">,
  baseBet: number,
  rules: Pick<GameRules, "blackjackPayout">,
): WagerSettlement {
  if (state.phase !== "round-over") throw new Error("Round is not finished");

  return state.playerHands.reduce<WagerSettlement>(
    (total, hand) => {
      if (!hand.result) throw new Error("Hand has no result");
      const { stake, net } = settleWager(hand.result, baseBet, hasDoubled(hand), rules);
      return { stake: total.stake + stake, net: total.net + net };
    },
    settleInsurance(state, baseBet),
  );
}

/** Chips that must be available to cover every bet currently on the table. */
export function stakeAtRisk(
  state: Pick<RoundState, "playerHands" | "insurance">,
  baseBet: number,
): number {
  const insurance = state.insurance === "taken" ? baseBet / 2 : 0;
  return state.playerHands.reduce(
    (total, hand) => total + (hasDoubled(hand) ? baseBet * 2 : baseBet),
    insurance,
  );
}
