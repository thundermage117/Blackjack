export type DealerUpcardKey = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "A";
export type PairKey = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
export type StrategyAction = "H" | "S" | "D";
export type HintAction = "Hit" | "Stand" | "Double" | "Split" | "Surrender";
export type HandKind = "hard" | "soft";

export type StrategyRow = Record<DealerUpcardKey, StrategyAction>;
/** For each dealer upcard: should this pair be split / this hand surrendered? */
export type YesNoRow = Record<DealerUpcardKey, boolean>;

/** The rule variations that change basic strategy (multi-deck, 4-8 decks). */
export interface StrategyRules {
  dealerSoft17: "stand" | "hit";
  doubleAfterSplit: boolean;
  surrender: boolean;
}

export interface StrategyTable {
  metadata: {
    name: string;
    dealerSoft17: "stand" | "hit";
    doubleAfterSplit: boolean;
    surrender: boolean;
    deckCount: number | "any" | "4-8";
    notes?: string;
  };
  hard: Record<string, StrategyRow>;
  soft: Record<string, StrategyRow>;
  /** Keyed by pair rank; `true` means split. */
  pair: Record<PairKey, YesNoRow>;
  /** Keyed by `hard:<total>` or `pair:<rank>`; `true` means surrender. Empty without surrender. */
  surrender: Record<string, YesNoRow>;
}

export interface HintQuery {
  handKind: HandKind;
  total: number;
  dealerUpcard: DealerUpcardKey;
  doubleAllowed: boolean;
  /** Set when the hand is a two-card pair. */
  pair?: PairKey | null;
  splitAllowed?: boolean;
  surrenderAllowed?: boolean;
}

export interface HintResult {
  action: HintAction;
  /** Which part of the table produced the advice. */
  source: "surrender" | "pair" | "totals";
  sourceAction: StrategyAction | "P" | "R";
  fallbackApplied: boolean;
  rowKey: string;
}
