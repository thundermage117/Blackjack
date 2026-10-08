import {
  createInitialRoundState,
  dealRound,
  getActiveHand,
  isActionAllowed,
  isPair,
  pairKey,
  reduceRoundState,
  scoreHand,
  settleRound,
  type GameRules,
  type PlayerAction,
  type RoundState,
} from "@blackjack/game-core";
import {
  getHint,
  normalizeDealerUpcard,
  type HintAction,
  type StrategyTable,
} from "@blackjack/hint-engine";

export type Policy = (round: RoundState, rules: GameRules) => PlayerAction;

const ACTION_FOR_HINT: Record<HintAction, PlayerAction> = {
  Hit: "hit",
  Stand: "stand",
  Double: "double",
  Split: "split",
  Surrender: "surrender",
};

/** Plays perfect basic strategy from a strategy table. */
export function basicStrategy(table: StrategyTable): Policy {
  return (round, rules) => {
    const hand = getActiveHand(round)!;
    const score = scoreHand(hand.cards);
    const hint = getHint(
      {
        handKind: score.isSoft ? "soft" : "hard",
        total: score.bestTotal,
        dealerUpcard: normalizeDealerUpcard(round.dealerHand[0].rank),
        doubleAllowed: isActionAllowed(round, "double", rules),
        pair: isPair(hand.cards) ? pairKey(hand.cards[0]) : null,
        splitAllowed: isActionAllowed(round, "split", rules),
        surrenderAllowed: isActionAllowed(round, "surrender", rules),
      },
      table,
    );
    return ACTION_FOR_HINT[hint.action];
  };
}

/** "Mimic the dealer": hit below 17, never double or split. A well-known losing strategy. */
export const mimicDealer: Policy = (round) => {
  const hand = getActiveHand(round)!;
  return scoreHand(hand.cards).bestTotal < 17 ? "hit" : "stand";
};

export interface SimulationResult {
  hands: number;
  /** Net units won per initial one-unit bet (negative = house edge). */
  returnPerHand: number;
  playerBlackjackRate: number;
  dealerBustRate: number;
  /** Dealer final hands examined for the bust rate (only when the dealer had to play). */
  dealerPlays: number;
}

/** Plays `hands` rounds with a one-unit bet, insurance always declined. */
export function simulate(
  hands: number,
  rules: GameRules,
  policy: Policy,
  random: () => number,
): SimulationResult {
  let round = createInitialRoundState(rules, random);
  let net = 0;
  let playerBlackjacks = 0;
  let dealerBusts = 0;
  let dealerPlays = 0;

  for (let i = 0; i < hands; i += 1) {
    round = dealRound(round, rules, random);
    if (round.phase === "insurance")
      round = reduceRoundState(round, { type: "insurance", take: false }, rules);
    if (scoreHand(round.playerHands[0].cards).isBlackjack) playerBlackjacks += 1;

    while (round.phase === "player-turn") {
      round = reduceRoundState(round, { type: policy(round, rules) }, rules, random);
    }

    // The dealer drew out only if some hand was still live after the player turn.
    const dealerPlayed = round.playerHands.some(
      (hand) =>
        hand.status !== "busted" && hand.status !== "surrendered" && hand.status !== "blackjack",
    );
    if (dealerPlayed) {
      dealerPlays += 1;
      if (scoreHand(round.dealerHand).isBust) dealerBusts += 1;
    }

    net += settleRound(round, 1, rules).net;
  }

  return {
    hands,
    returnPerHand: net / hands,
    playerBlackjackRate: playerBlackjacks / hands,
    dealerBustRate: dealerBusts / dealerPlays,
    dealerPlays,
  };
}
