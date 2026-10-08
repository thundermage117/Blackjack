import type { HintAction, HintQuery, HintResult, StrategyAction, StrategyTable } from "./types";
import { toRowKey, toStrategyBucketKey } from "./strategySchema";

function doubleFallbackAction(query: HintQuery): HintAction {
  if (query.handKind === "hard") {
    return "Hit";
  }

  // MVP soft-hand rows in the scaffold use:
  // soft 13-17: double else hit
  // soft 18 (vs 3-6): double else stand
  if (query.total >= 18) return "Stand";
  return "Hit";
}

function actionWithFallback(sourceAction: StrategyAction, query: HintQuery): HintAction {
  if (sourceAction === "D") {
    return query.doubleAllowed ? "Double" : doubleFallbackAction(query);
  }
  if (sourceAction === "H") return "Hit";
  return "Stand";
}

export function getHint(query: HintQuery, table: StrategyTable): HintResult {
  const bucket = query.handKind === "hard" ? table.hard : table.soft;
  const bucketKey = toStrategyBucketKey(query.total);
  const row = bucket[bucketKey];

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
  const fallbackApplied = sourceAction === "D" && action !== "Double";

  return {
    action,
    sourceAction,
    fallbackApplied,
    rowKey: toRowKey(query.handKind, query.total),
  };
}
