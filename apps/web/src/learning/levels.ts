import {
  DEFAULT_TABLE_OPTIONS,
  createRules,
  type GameRules,
  type TableOptions,
} from "@blackjack/game-core";

export type LevelId = 1 | 2 | 3 | 4;
export type FeedbackMode = "every" | "mistakes";

/**
 * A learning level is pure configuration: which actions exist at the table and how
 * much help the player gets. Game code asks the level, never checks `level >= n`
 * directly (see ADR-0010).
 */
export interface LevelDefinition {
  id: LevelId;
  name: string;
  tagline: string;
  /** Short bullet points shown in the level picker. */
  unlocks: string[];
  actions: {
    double: boolean;
    split: boolean;
    insurance: boolean;
    surrender: boolean;
  };
  assists: {
    /** Highlight the basic-strategy move and show its explanation without asking. */
    autoHint: boolean;
    feedback: FeedbackMode;
    /** Whether the player may change deck count, soft 17, DAS, surrender and payout. */
    tableRulesEditable: boolean;
    counting: boolean;
  };
  /** When the next level is suggested. `null` on the last level. */
  promotion: { minDecisions: number; minAccuracy: number } | null;
}

export const LEVELS: Record<LevelId, LevelDefinition> = {
  1: {
    id: 1,
    name: "Basics",
    tagline: "Hit or stand. Learn when to stop.",
    unlocks: ["Hit and Stand only", "The right move is highlighted", "Feedback on every decision"],
    actions: { double: false, split: false, insurance: false, surrender: false },
    assists: { autoHint: true, feedback: "every", tableRulesEditable: false, counting: false },
    promotion: { minDecisions: 25, minAccuracy: 0.9 },
  },
  2: {
    id: 2,
    name: "Strategy",
    tagline: "Double down and split pairs.",
    unlocks: ["Double and Split", "Hints on request", "Strategy chart"],
    actions: { double: true, split: true, insurance: false, surrender: false },
    assists: { autoHint: false, feedback: "mistakes", tableRulesEditable: false, counting: false },
    promotion: { minDecisions: 40, minAccuracy: 0.9 },
  },
  3: {
    id: 3,
    name: "Full table",
    tagline: "Insurance, surrender and table rules.",
    unlocks: ["Insurance and Surrender", "Choose decks, soft 17, DAS and payout"],
    actions: { double: true, split: true, insurance: true, surrender: true },
    assists: { autoHint: false, feedback: "mistakes", tableRulesEditable: true, counting: false },
    promotion: { minDecisions: 50, minAccuracy: 0.92 },
  },
  4: {
    id: 4,
    name: "Counting",
    tagline: "Keep the Hi-Lo count.",
    unlocks: ["Running and true count", "Count checks between hands", "Count-based insurance"],
    actions: { double: true, split: true, insurance: true, surrender: true },
    assists: { autoHint: false, feedback: "mistakes", tableRulesEditable: true, counting: true },
    promotion: null,
  },
};

export const LEVEL_IDS: LevelId[] = [1, 2, 3, 4];

export function isLevelId(value: unknown): value is LevelId {
  return LEVEL_IDS.includes(value as LevelId);
}

/** Levels without the rules editor always play the default table. */
export function tableOptionsForLevel(level: LevelId, chosen: TableOptions): TableOptions {
  return LEVELS[level].assists.tableRulesEditable ? chosen : DEFAULT_TABLE_OPTIONS;
}

/** The engine rules for a table at a level: locked actions are switched off. */
export function rulesForLevel(level: LevelId, chosen: TableOptions): GameRules {
  const { actions } = LEVELS[level];
  const rules = createRules(tableOptionsForLevel(level, chosen));
  return {
    ...rules,
    allowDouble: actions.double,
    allowSplit: actions.split,
    allowInsurance: actions.insurance,
    allowSurrender: actions.surrender && rules.allowSurrender,
  };
}
