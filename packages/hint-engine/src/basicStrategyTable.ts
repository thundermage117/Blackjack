import { DEALER_UPCARD_KEYS } from "./strategySchema";
import type {
  PairKey,
  StrategyAction,
  StrategyRow,
  StrategyRules,
  StrategyTable,
  YesNoRow,
} from "./types";

/*
 * Multi-deck (4-8 decks) basic strategy, peek game, no re-splitting aces.
 *
 * Each row is a 10-character string, one character per dealer upcard:
 *
 *                2 3 4 5 6 7 8 9 T A
 *
 * Totals: H = hit, S = stand, D = double (if not allowed: hit, except soft 18+ stands).
 * Pairs/surrender: Y = split/surrender, N = don't (fall through to the totals table).
 *
 * Changes to these rows must update tests/fixtures/hint-fixtures.json and the change
 * log in docs/hint-strategy-format.md.
 */

const HARD_S17: Record<number, string> = {
  4: "HHHHHHHHHH",
  5: "HHHHHHHHHH",
  6: "HHHHHHHHHH",
  7: "HHHHHHHHHH",
  8: "HHHHHHHHHH",
  9: "HDDDDHHHHH",
  10: "DDDDDDDDHH",
  11: "DDDDDDDDDH",
  12: "HHSSSHHHHH",
  13: "SSSSSHHHHH",
  14: "SSSSSHHHHH",
  15: "SSSSSHHHHH",
  16: "SSSSSHHHHH",
  17: "SSSSSSSSSS",
  18: "SSSSSSSSSS",
  19: "SSSSSSSSSS",
  20: "SSSSSSSSSS",
  21: "SSSSSSSSSS",
};

const SOFT_S17: Record<number, string> = {
  12: "HHHHHHHHHH", // A,A when splitting is not available
  13: "HHHDDHHHHH",
  14: "HHHDDHHHHH",
  15: "HHDDDHHHHH",
  16: "HHDDDHHHHH",
  17: "HDDDDHHHHH",
  18: "SDDDDSSHHH",
  19: "SSSSSSSSSS",
  20: "SSSSSSSSSS",
  21: "SSSSSSSSSS",
};

/** Cells that differ when the dealer hits soft 17. */
const HARD_H17_OVERRIDES: Record<number, string> = {
  11: "DDDDDDDDDD",
};
const SOFT_H17_OVERRIDES: Record<number, string> = {
  18: "DDDDDSSHHH",
  19: "SSSSDSSSSS",
};

const PAIRS_DAS: Record<PairKey, string> = {
  A: "YYYYYYYYYY",
  "10": "NNNNNNNNNN",
  "9": "YYYYYNYYNN",
  "8": "YYYYYYYYYY",
  "7": "YYYYYYNNNN",
  "6": "YYYYYNNNNN",
  "5": "NNNNNNNNNN",
  "4": "NNNYYNNNNN",
  "3": "YYYYYYNNNN",
  "2": "YYYYYYNNNN",
};

/** Cells that differ when doubling after a split is not allowed. */
const PAIRS_NO_DAS_OVERRIDES: Partial<Record<PairKey, string>> = {
  "6": "NYYYYNNNNN",
  "4": "NNNNNNNNNN",
  "3": "NNYYYYNNNN",
  "2": "NNYYYYNNNN",
};

const SURRENDER_S17: Record<string, string> = {
  "hard:15": "NNNNNNNNYN",
  "hard:16": "NNNNNNNYYY",
};
const SURRENDER_H17: Record<string, string> = {
  "hard:15": "NNNNNNNNYY",
  "hard:16": "NNNNNNNYYY",
  "hard:17": "NNNNNNNNNY",
  "pair:8": "NNNNNNNNNY",
};

function parseRow<T>(row: string, parseCell: (cell: string) => T): Record<string, T> {
  if (row.length !== DEALER_UPCARD_KEYS.length) {
    throw new Error(`Strategy row "${row}" must have ${DEALER_UPCARD_KEYS.length} cells`);
  }
  return Object.fromEntries(DEALER_UPCARD_KEYS.map((key, i) => [key, parseCell(row[i])]));
}

function actionRow(row: string): StrategyRow {
  return parseRow(row, (cell) => {
    if (cell !== "H" && cell !== "S" && cell !== "D") throw new Error(`Bad action "${cell}"`);
    return cell as StrategyAction;
  }) as StrategyRow;
}

function yesNoRow(row: string): YesNoRow {
  return parseRow(row, (cell) => {
    if (cell !== "Y" && cell !== "N") throw new Error(`Bad yes/no cell "${cell}"`);
    return cell === "Y";
  }) as YesNoRow;
}

function buildSection<K extends string | number, V>(
  rows: Record<K, string>,
  parse: (row: string) => V,
): Record<string, V> {
  return Object.fromEntries(
    Object.entries<string>(rows).map(([key, row]) => [String(key), parse(row)]),
  );
}

/** Builds the basic-strategy table for a table's rule variations. */
export function strategyTableFor(rules: StrategyRules): StrategyTable {
  const h17 = rules.dealerSoft17 === "hit";
  const hard = { ...HARD_S17, ...(h17 ? HARD_H17_OVERRIDES : {}) };
  const soft = { ...SOFT_S17, ...(h17 ? SOFT_H17_OVERRIDES : {}) };
  const pairs = { ...PAIRS_DAS, ...(rules.doubleAfterSplit ? {} : PAIRS_NO_DAS_OVERRIDES) };
  const surrender = rules.surrender ? (h17 ? SURRENDER_H17 : SURRENDER_S17) : {};

  const name = [
    "multideck",
    h17 ? "h17" : "s17",
    rules.doubleAfterSplit ? "das" : "nodas",
    rules.surrender ? "ls" : "nosurr",
  ].join("-");

  return {
    metadata: {
      name,
      dealerSoft17: rules.dealerSoft17,
      doubleAfterSplit: rules.doubleAfterSplit,
      surrender: rules.surrender,
      deckCount: "4-8",
      notes: "Multi-deck basic strategy, dealer peeks, late surrender when enabled.",
    },
    hard: buildSection(hard, actionRow),
    soft: buildSection(soft, actionRow),
    pair: buildSection(pairs, yesNoRow) as Record<PairKey, YesNoRow>,
    surrender: buildSection(surrender, yesNoRow),
  };
}

/** Strategy for the default table: 6 decks, S17, double after split, no surrender. */
export const mvpS17StrategyTable: StrategyTable = strategyTableFor({
  dealerSoft17: "stand",
  doubleAfterSplit: true,
  surrender: false,
});
