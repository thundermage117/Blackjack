import {
  isActionAllowed,
  getActiveHand,
  isPair,
  pairKey,
  scoreHand,
  type GameRules,
  type RoundState,
} from "@blackjack/game-core";
import {
  getHint,
  getInsuranceAdvice,
  normalizeDealerUpcard,
  type HintAction,
  type StrategyTable,
} from "@blackjack/hint-engine";
import { explainAction } from "./explanations";

export type Decision = HintAction | "Take insurance" | "No insurance";

export interface Recommendation {
  action: Decision;
  /** Human-readable situation, also the key for mistake tracking, e.g. "hard 16 vs 10". */
  situation: string;
  explanation: string;
}

export interface Feedback extends Recommendation {
  chosen: Decision;
  correct: boolean;
}

export interface MistakeRecord {
  count: number;
  recommended: Decision;
}

export interface TrainerStats {
  decisions: number;
  correct: number;
  /** Progress at the current level only; reset when the level changes. */
  levelDecisions: number;
  levelCorrect: number;
  mistakes: Record<string, MistakeRecord>;
  countChecks: number;
  countChecksCorrect: number;
}

export function emptyTrainerStats(): TrainerStats {
  return {
    decisions: 0,
    correct: 0,
    levelDecisions: 0,
    levelCorrect: 0,
    mistakes: {},
    countChecks: 0,
    countChecksCorrect: 0,
  };
}

/** Which optional actions the player can actually take right now (rules and bankroll). */
export interface Availability {
  double: boolean;
  split: boolean;
  surrender: boolean;
}

function pairLabel(rank: string): string {
  return rank === "A" ? "Aces" : `${rank}s`;
}

/** The basic-strategy play for the active hand, or null if no decision is pending. */
export function recommendPlay(
  round: RoundState,
  rules: GameRules,
  table: StrategyTable,
  available: Availability,
): Recommendation | null {
  const hand = getActiveHand(round);
  const upcard = round.dealerHand[0];
  if (!hand || !upcard || hand.status !== "playing") return null;
  if (!isActionAllowed(round, "stand", rules)) return null;

  const score = scoreHand(hand.cards);
  const handKind = score.isSoft ? "soft" : "hard";
  const dealerUpcard = normalizeDealerUpcard(upcard.rank);
  const pair = isPair(hand.cards) ? pairKey(hand.cards[0]) : null;

  const result = getHint(
    {
      handKind,
      total: score.bestTotal,
      dealerUpcard,
      doubleAllowed: available.double,
      pair,
      splitAllowed: available.split,
      surrenderAllowed: available.surrender,
    },
    table,
  );

  const situation =
    pair && available.split
      ? `pair of ${pairLabel(pair)} vs ${dealerUpcard}`
      : `${handKind} ${score.bestTotal} vs ${dealerUpcard}`;

  return {
    action: result.action,
    situation,
    explanation: explainAction(result.action, {
      handKind,
      total: score.bestTotal,
      dealerUpcard,
      pair: available.split ? pair : null,
      doubleFallback: result.fallbackApplied,
    }),
  };
}

export function recommendInsurance(trueCount?: number): Recommendation {
  const advice = getInsuranceAdvice(trueCount);
  return {
    action: advice.take ? "Take insurance" : "No insurance",
    situation: trueCount === undefined ? "insurance" : `insurance at true count ${trueCount}`,
    explanation: advice.reason,
  };
}

export function grade(recommendation: Recommendation, chosen: Decision): Feedback {
  return { ...recommendation, chosen, correct: recommendation.action === chosen };
}

export function recordDecision(stats: TrainerStats, feedback: Feedback): TrainerStats {
  const correctDelta = feedback.correct ? 1 : 0;
  const mistakes = feedback.correct
    ? stats.mistakes
    : {
        ...stats.mistakes,
        [feedback.situation]: {
          count: (stats.mistakes[feedback.situation]?.count ?? 0) + 1,
          recommended: feedback.action,
        },
      };

  return {
    ...stats,
    decisions: stats.decisions + 1,
    correct: stats.correct + correctDelta,
    levelDecisions: stats.levelDecisions + 1,
    levelCorrect: stats.levelCorrect + correctDelta,
    mistakes,
  };
}

export function accuracy(correct: number, decisions: number): number | null {
  return decisions === 0 ? null : correct / decisions;
}

/** Most frequent mistakes first. */
export function topMistakes(
  stats: TrainerStats,
  limit = 5,
): Array<{ situation: string } & MistakeRecord> {
  return Object.entries(stats.mistakes)
    .map(([situation, record]) => ({ situation, ...record }))
    .sort((a, b) => b.count - a.count || a.situation.localeCompare(b.situation))
    .slice(0, limit);
}
