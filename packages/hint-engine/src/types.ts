export type DealerUpcardKey = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "A";
export type StrategyAction = "H" | "S" | "D";
export type HintAction = "Hit" | "Stand" | "Double";
export type HandKind = "hard" | "soft";

export type StrategyRow = Record<DealerUpcardKey, StrategyAction>;

export interface StrategyTable {
  metadata: {
    name: string;
    dealerSoft17: "stand" | "hit";
    deckCount: number | "any";
    notes?: string;
  };
  hard: Record<string, StrategyRow>;
  soft: Record<string, StrategyRow>;
  pair?: Record<string, StrategyRow>;
}

export interface HintQuery {
  handKind: HandKind;
  total: number;
  dealerUpcard: DealerUpcardKey;
  doubleAllowed: boolean;
}

export interface HintResult {
  action: HintAction;
  sourceAction: StrategyAction;
  fallbackApplied: boolean;
  rowKey: string;
}
