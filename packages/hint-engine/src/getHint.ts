import type {
  DealerUpcardKey,
  HintAction,
  HintQuery,
  HintResult,
  StrategyAction,
  StrategyTable,
} from "./types";
import { toRowKey, toStrategyBucketKey } from "./strategySchema";

function doubleFallbackAction(query: HintQuery): HintAction {
  if (query.handKind === "hard") return "Hit";
  // Soft doubles: soft 13-17 are "double, else hit"; soft 18-19 are "double, else stand".
  return query.total >= 18 ? "Stand" : "Hit";
}

function actionWithFallback(sourceAction: StrategyAction, query: HintQuery): HintAction {
  if (sourceAction === "D") {
    return query.doubleAllowed ? "Double" : doubleFallbackAction(query);
  }
  if (sourceAction === "H") return "Hit";
  return "Stand";
}

function cell<T>(row: Record<DealerUpcardKey, T> | undefined, upcard: DealerUpcardKey) {
  return row ? row[upcard] : undefined;
}

/**
 * Resolves basic-strategy advice in this order:
 * 1. surrender (if allowed), 2. split (if the hand is a pair and splitting is allowed),
 * 3. the hard/soft totals table, falling back when doubling is not allowed.
 */
export function getHint(query: HintQuery, table: StrategyTable): HintResult {
  const isSplittablePair = Boolean(query.pair && query.splitAllowed);

  if (query.surrenderAllowed && query.handKind === "hard") {
    const surrenderKey = isSplittablePair ? `pair:${query.pair}` : toRowKey("hard", query.total);
    if (cell(table.surrender[surrenderKey], query.dealerUpcard)) {
      return {
        action: "Surrender",
        source: "surrender",
        sourceAction: "R",
        fallbackApplied: false,
        rowKey: surrenderKey,
      };
    }
  }

  if (isSplittablePair && query.pair) {
    const shouldSplit = cell(table.pair[query.pair], query.dealerUpcard);
    if (shouldSplit === undefined) {
      throw new Error(`Missing pair row for ${query.pair}`);
    }
    if (shouldSplit) {
      return {
        action: "Split",
        source: "pair",
        sourceAction: "P",
        fallbackApplied: false,
        rowKey: `pair:${query.pair}`,
      };
    }
  }

  const bucket = query.handKind === "hard" ? table.hard : table.soft;
  const row = bucket[toStrategyBucketKey(query.total)];
  if (!row) {
    throw new Error(`Missing strategy row for ${toRowKey(query.handKind, query.total)}`);
  }

  const sourceAction = row[query.dealerUpcard];
  if (!sourceAction) {
    throw new Error(
      `Missing dealer upcard ${query.dealerUpcard} for ${toRowKey(query.handKind, query.total)}`,
    );
  }

  const action = actionWithFallback(sourceAction, query);
  return {
    action,
    source: "totals",
    sourceAction,
    fallbackApplied: sourceAction === "D" && action !== "Double",
    rowKey: toRowKey(query.handKind, query.total),
  };
}

export interface InsuranceAdvice {
  take: boolean;
  reason: string;
}

/** True count at or above which insurance becomes profitable (the "Illustrious 18" #1 play). */
export const INSURANCE_TRUE_COUNT_THRESHOLD = 3;

/**
 * Insurance is a losing side bet under basic strategy. Card counters take it once the
 * true count shows enough tens remaining.
 */
export function getInsuranceAdvice(trueCount?: number): InsuranceAdvice {
  if (trueCount !== undefined && trueCount >= INSURANCE_TRUE_COUNT_THRESHOLD) {
    return {
      take: true,
      reason: `True count ${trueCount} is at least +${INSURANCE_TRUE_COUNT_THRESHOLD}: enough tens remain that insurance pays.`,
    };
  }
  return {
    take: false,
    reason:
      "Insurance pays 2:1 but the dealer has blackjack less than 1 time in 3, so it loses money over time.",
  };
}
