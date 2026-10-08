import {
  DEFAULT_TABLE_OPTIONS,
  createInitialRoundState,
  dealRound,
  isActionAllowed,
  playerDouble,
  playerHit,
  playerSplit,
  playerStand,
  playerSurrender,
  resolveInsurance,
  settleRound,
  stakeAtRisk,
  type GameRules,
  type RoundResult,
  type RoundState,
  type TableOptions,
  type WagerSettlement,
} from "@blackjack/game-core";
import { strategyTableFor, type StrategyTable } from "@blackjack/hint-engine";
import { countFor } from "../learning/counting";
import { LEVELS, rulesForLevel, tableOptionsForLevel, type LevelId } from "../learning/levels";
import {
  emptyTrainerStats,
  grade,
  recommendInsurance,
  recommendPlay,
  recordDecision,
  type Decision,
  type Feedback,
  type Recommendation,
  type TrainerStats,
} from "../learning/trainer";

export const STARTING_BANKROLL = 1000;
export const BET_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_BET = BET_OPTIONS[0];
/** At the Counting level, quiz the running count after this many hands. */
export const COUNT_CHECK_INTERVAL = 5;
/** After "not yet" on a level-up suggestion, wait this many decisions before asking again. */
export const PROMOTION_SNOOZE_DECISIONS = 15;

export interface SessionStats {
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
}

export interface Settings {
  muted: boolean;
  haptics: boolean;
  /** Trainer feedback after decisions. */
  feedback: boolean;
  /** Counting level: show the running/true count on the table. */
  showCount: boolean;
  /** Counting level: quiz the running count every few hands. */
  countChecks: boolean;
  /** Counting level: hide hand totals for practice. */
  hideTotals: boolean;
}

export type HintView =
  | { kind: "advice"; action: Decision; situation: string; detail: string }
  | { kind: "unavailable"; detail: string };

/** Dealer cards are revealed one per step; settlement waits until all are shown. */
export interface DealerReveal {
  visibleCount: number;
}

export interface CountCheck {
  expected: number;
  /** `undefined` while waiting for an answer; `null` if skipped. */
  answer?: number | null;
}

export interface SessionState {
  round: RoundState;
  level: LevelId;
  /** Table rules the player chose; only applied at levels with the rules editor. */
  tableOptions: TableOptions;
  /** Effective engine rules for the current level and table. */
  rules: GameRules;
  strategy: StrategyTable;
  stats: SessionStats;
  bankroll: number;
  bet: number;
  hint: HintView | null;
  feedback: Feedback | null;
  trainer: TrainerStats;
  dealerReveal: DealerReveal | null;
  lastSettlement: WagerSettlement | null;
  handNumber: number;
  handsSinceCountCheck: number;
  countCheck: CountCheck | null;
  promotionSnoozedAt: number | null;
  settings: Settings;
  /** Shuffle source. Not persisted; tests and `?seed=` inject a seeded one. */
  random: () => number;
}

export type PlayerDecisionAction =
  | { type: "hit" }
  | { type: "stand" }
  | { type: "double" }
  | { type: "split" }
  | { type: "surrender" }
  | { type: "insurance"; take: boolean };

export type SessionAction =
  | { type: "deal" }
  | PlayerDecisionAction
  | { type: "reveal-step" }
  | { type: "request-hint" }
  | { type: "set-bet"; bet: number }
  | { type: "set-level"; level: LevelId }
  | { type: "set-table-options"; options: TableOptions }
  | { type: "update-settings"; settings: Partial<Settings> }
  | { type: "answer-count-check"; answer: number | null }
  | { type: "snooze-promotion" }
  | { type: "reset" };

/** Fields that survive a page reload, including a hand in progress (ADR-0011). */
export type PersistedSession = Omit<
  SessionState,
  "rules" | "strategy" | "random" | "hint" | "feedback"
>;

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  haptics: true,
  feedback: true,
  showCount: true,
  countChecks: true,
  hideTotals: false,
};

export function emptyStats(): SessionStats {
  return { wins: 0, losses: 0, pushes: 0, blackjacks: 0 };
}

function withTable(
  state: Pick<SessionState, "level" | "tableOptions">,
): Pick<SessionState, "rules" | "strategy"> {
  const options = tableOptionsForLevel(state.level, state.tableOptions);
  const rules = rulesForLevel(state.level, state.tableOptions);
  return {
    rules,
    strategy: strategyTableFor({
      dealerSoft17: options.dealerSoft17,
      doubleAfterSplit: options.doubleAfterSplit,
      surrender: rules.allowSurrender,
    }),
  };
}

export function createSession(
  saved: Partial<PersistedSession> = {},
  random: () => number = Math.random,
): SessionState {
  const levelId = saved.level ?? 1;
  const tableOptions = saved.tableOptions ?? DEFAULT_TABLE_OPTIONS;
  const table = withTable({ level: levelId, tableOptions });

  return {
    round: saved.round ?? createInitialRoundState(table.rules, random),
    level: levelId,
    tableOptions,
    ...table,
    stats: saved.stats ?? emptyStats(),
    bankroll: saved.bankroll ?? STARTING_BANKROLL,
    bet: saved.bet ?? DEFAULT_BET,
    hint: null,
    feedback: null,
    trainer: saved.trainer ?? emptyTrainerStats(),
    dealerReveal: saved.dealerReveal ?? null,
    lastSettlement: saved.lastSettlement ?? null,
    handNumber: saved.handNumber ?? 0,
    handsSinceCountCheck: saved.handsSinceCountCheck ?? 0,
    countCheck: saved.countCheck ?? null,
    promotionSnoozedAt: saved.promotionSnoozedAt ?? null,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
    random,
  };
}

export function toPersisted(state: SessionState): PersistedSession {
  return {
    round: state.round,
    level: state.level,
    tableOptions: state.tableOptions,
    stats: state.stats,
    bankroll: state.bankroll,
    bet: state.bet,
    trainer: state.trainer,
    dealerReveal: state.dealerReveal,
    lastSettlement: state.lastSettlement,
    handNumber: state.handNumber,
    handsSinceCountCheck: state.handsSinceCountCheck,
    countCheck: state.countCheck,
    promotionSnoozedAt: state.promotionSnoozedAt,
    settings: state.settings,
  };
}

// ---------------------------------------------------------------------------
// Selectors

export function currentLevel(state: SessionState) {
  return LEVELS[state.level];
}

export function isRevealing(state: SessionState): boolean {
  return state.dealerReveal !== null;
}

export function isRoundInProgress(state: SessionState): boolean {
  const { phase } = state.round;
  return phase === "insurance" || phase === "player-turn" || phase === "dealer-turn";
}

export function isBetweenHands(state: SessionState): boolean {
  return !isRevealing(state) && !isRoundInProgress(state);
}

export function isCountCheckPending(state: SessionState): boolean {
  return state.countCheck !== null && state.countCheck.answer === undefined;
}

export function canAfford(state: SessionState, amount: number): boolean {
  return state.bankroll >= amount;
}

export function canDeal(state: SessionState): boolean {
  return isBetweenHands(state) && !isCountCheckPending(state) && canAfford(state, state.bet);
}

export function canChangeBet(state: SessionState): boolean {
  return isBetweenHands(state);
}

export function canPlayerAct(state: SessionState, action: PlayerDecisionAction): boolean {
  if (isRevealing(state)) return false;
  const atRisk = stakeAtRisk(state.round, state.bet);

  if (action.type === "insurance") {
    if (state.round.phase !== "insurance") return false;
    return !action.take || canAfford(state, atRisk + state.bet / 2);
  }
  if (!isActionAllowed(state.round, action.type, state.rules)) return false;
  // Doubling and splitting put another base bet on the table.
  if (action.type === "double" || action.type === "split") {
    return canAfford(state, atRisk + state.bet);
  }
  return true;
}

export function canRequestHint(state: SessionState): boolean {
  if (isRevealing(state)) return false;
  return state.round.phase === "player-turn" || state.round.phase === "insurance";
}

export function isOutOfChips(state: SessionState): boolean {
  return isBetweenHands(state) && state.bankroll < BET_OPTIONS[0];
}

/** The basic-strategy (or count-based, at the Counting level) play right now. */
export function currentRecommendation(state: SessionState): Recommendation | null {
  if (isRevealing(state)) return null;
  if (state.round.phase === "insurance") {
    const useCount = currentLevel(state).assists.counting;
    return recommendInsurance(useCount ? countFor(state.round).true : undefined);
  }
  return recommendPlay(state.round, state.rules, state.strategy, {
    double: canPlayerAct(state, { type: "double" }),
    split: canPlayerAct(state, { type: "split" }),
    surrender: canPlayerAct(state, { type: "surrender" }),
  });
}

export function isPromotionReady(state: SessionState): boolean {
  const { promotion } = currentLevel(state);
  if (!promotion) return false;
  const { levelDecisions, levelCorrect } = state.trainer;
  if (levelDecisions < promotion.minDecisions) return false;
  if (levelCorrect / levelDecisions < promotion.minAccuracy) return false;
  const snoozedAt = state.promotionSnoozedAt;
  return snoozedAt === null || levelDecisions >= snoozedAt + PROMOTION_SNOOZE_DECISIONS;
}

// ---------------------------------------------------------------------------
// Transitions

function applyResultToStats(stats: SessionStats, result: RoundResult | undefined): SessionStats {
  if (result === "push") return { ...stats, pushes: stats.pushes + 1 };
  if (result === "lose" || result === "surrender") return { ...stats, losses: stats.losses + 1 };
  if (result === "blackjack_win") {
    return { ...stats, wins: stats.wins + 1, blackjacks: stats.blackjacks + 1 };
  }
  if (result === "win") return { ...stats, wins: stats.wins + 1 };
  return stats;
}

function settle(state: SessionState): SessionState {
  if (state.round.phase !== "round-over") return state;

  const settlement = settleRound(state.round, state.bet, state.rules);
  const stats = state.round.playerHands.reduce(
    (acc, hand) => applyResultToStats(acc, hand.result),
    state.stats,
  );

  const handsSinceCountCheck = state.handsSinceCountCheck + 1;
  const quizDue =
    currentLevel(state).assists.counting &&
    state.settings.countChecks &&
    handsSinceCountCheck >= COUNT_CHECK_INTERVAL;

  return {
    ...state,
    stats,
    bankroll: state.bankroll + settlement.net,
    lastSettlement: settlement,
    handsSinceCountCheck: quizDue ? 0 : handsSinceCountCheck,
    countCheck: quizDue ? { expected: countFor(state.round).running } : state.countCheck,
  };
}

/**
 * Applies a round transition. A round that ends while the hole card was still hidden
 * gets a staged dealer reveal (ADR-0007); otherwise it settles immediately.
 */
function applyRound(state: SessionState, nextRound: RoundState): SessionState {
  const next: SessionState = { ...state, round: nextRound, hint: null };
  if (nextRound.phase !== "round-over") return next;
  if (state.round.dealerHoleHidden) return { ...next, dealerReveal: { visibleCount: 1 } };
  return settle(next);
}

function decisionFor(action: PlayerDecisionAction): Decision {
  switch (action.type) {
    case "hit":
      return "Hit";
    case "stand":
      return "Stand";
    case "double":
      return "Double";
    case "split":
      return "Split";
    case "surrender":
      return "Surrender";
    case "insurance":
      return action.take ? "Take insurance" : "No insurance";
  }
}

function roundAfter(state: SessionState, action: PlayerDecisionAction): RoundState {
  const { round, rules } = state;
  switch (action.type) {
    case "hit":
      return playerHit(round, rules);
    case "stand":
      return playerStand(round, rules);
    case "double":
      return playerDouble(round, rules);
    case "split":
      return playerSplit(round, rules);
    case "surrender":
      return playerSurrender(round, rules);
    case "insurance":
      return resolveInsurance(round, action.take, rules);
  }
}

function playerDecision(state: SessionState, action: PlayerDecisionAction): SessionState {
  if (!canPlayerAct(state, action)) return state;

  const recommendation = currentRecommendation(state);
  const feedback = recommendation ? grade(recommendation, decisionFor(action)) : null;
  const graded: SessionState = feedback
    ? { ...state, feedback, trainer: recordDecision(state.trainer, feedback) }
    : state;

  return applyRound(graded, roundAfter(state, action));
}

function hintFor(state: SessionState): HintView {
  const recommendation = currentRecommendation(state);
  if (!recommendation) {
    return { kind: "unavailable", detail: "Hints are available during your turn." };
  }
  return {
    kind: "advice",
    action: recommendation.action,
    situation: recommendation.situation,
    detail: recommendation.explanation,
  };
}

/** Rebuilds rules for a new level/table; a changed table gets a fresh shoe. */
function withNewTable(state: SessionState, changes: Partial<SessionState>): SessionState {
  const next = { ...state, ...changes };
  const table = withTable(next);
  const before = tableOptionsForLevel(state.level, state.tableOptions);
  const after = tableOptionsForLevel(next.level, next.tableOptions);
  const tableChanged = JSON.stringify(before) !== JSON.stringify(after);

  return {
    ...next,
    ...table,
    hint: null,
    round: tableChanged
      ? { ...createInitialRoundState(table.rules, state.random), message: "New table. Fresh shoe." }
      : next.round,
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "deal": {
      if (!canDeal(state)) return state;
      const next: SessionState = {
        ...state,
        lastSettlement: null,
        feedback: null,
        countCheck: null,
        handNumber: state.handNumber + 1,
      };
      return applyRound(next, dealRound(state.round, state.rules, state.random));
    }
    case "hit":
    case "stand":
    case "double":
    case "split":
    case "surrender":
    case "insurance":
      return playerDecision(state, action);
    case "reveal-step": {
      if (!state.dealerReveal) return state;
      const visibleCount = state.dealerReveal.visibleCount + 1;
      if (visibleCount >= state.round.dealerHand.length) {
        return settle({ ...state, dealerReveal: null });
      }
      return { ...state, dealerReveal: { visibleCount } };
    }
    case "request-hint":
      if (!canRequestHint(state)) return state;
      return { ...state, hint: hintFor(state) };
    case "set-bet":
      if (!canChangeBet(state) || !BET_OPTIONS.includes(action.bet as never)) return state;
      return { ...state, bet: action.bet };
    case "set-level":
      if (!isBetweenHands(state) || action.level === state.level) return state;
      return withNewTable(state, {
        level: action.level,
        trainer: { ...state.trainer, levelDecisions: 0, levelCorrect: 0 },
        promotionSnoozedAt: null,
        feedback: null,
        countCheck: null,
        handsSinceCountCheck: 0,
      });
    case "set-table-options":
      if (!isBetweenHands(state) || !currentLevel(state).assists.tableRulesEditable) return state;
      return withNewTable(state, { tableOptions: action.options });
    case "update-settings":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "answer-count-check": {
      if (!state.countCheck || !isCountCheckPending(state)) return state;
      const correct = action.answer === state.countCheck.expected;
      return {
        ...state,
        countCheck: { ...state.countCheck, answer: action.answer },
        trainer:
          action.answer === null
            ? state.trainer
            : {
                ...state.trainer,
                countChecks: state.trainer.countChecks + 1,
                countChecksCorrect: state.trainer.countChecksCorrect + (correct ? 1 : 0),
              },
      };
    }
    case "snooze-promotion":
      return { ...state, promotionSnoozedAt: state.trainer.levelDecisions };
    case "reset": {
      const fresh = createSession(
        {
          bet: state.bet,
          level: state.level,
          tableOptions: state.tableOptions,
          settings: state.settings,
        },
        state.random,
      );
      return { ...fresh, round: { ...fresh.round, message: "Session reset. Press Deal." } };
    }
  }
}
