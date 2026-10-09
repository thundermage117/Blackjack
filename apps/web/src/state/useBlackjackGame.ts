import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  createSeededRandom,
  secureRandom,
  type GameRules,
  type TableOptions,
} from "@blackjack/game-core";
import type { StrategyTable } from "@blackjack/hint-engine";
import { cuesForTableChange, type SoundCue } from "../audio/cues";
import { vibrateFor } from "../audio/haptics";
import { SoundEngine } from "../audio/soundEngine";
import { chartCellFor, type ChartCell } from "../learning/chart";
import type { CountView } from "../learning/counting";
import { LEVELS, type LevelDefinition, type LevelId } from "../learning/levels";
import {
  accuracy,
  topMistakes,
  type Feedback,
  type MistakeRecord,
  type Recommendation,
} from "../learning/trainer";
import { announcementForTableChange } from "./announcements";
import {
  BET_OPTIONS,
  canChangeBet,
  canDeal,
  canPlayerAct,
  canRequestHint,
  createSession,
  currentLevel,
  currentRecommendation,
  isBetweenHands,
  isCountCheckPending,
  isOutOfChips,
  isPromotionReady,
  isRevealing,
  sessionReducer,
  toPersisted,
  type CountCheck,
  type HintView,
  type SessionState,
  type SessionStats,
  type Settings,
} from "./session";
import { loadSession, saveSession } from "./storage";
import { selectTableView, toneForNet, type ResultTone, type TableView } from "./tableView";

/** Pause before the hole card flips, then between each dealer draw. */
const FIRST_REVEAL_DELAY_MS = 450;
const REVEAL_STEP_DELAY_MS = 600;

export interface GameViewModel {
  table: TableView;
  /** Latest screen-reader text describing the table change. */
  announcement: string;
  level: LevelDefinition;
  nextLevel: LevelDefinition | null;
  settings: Settings;
  tableOptions: TableOptions;
  /** Effective engine rules (table rules with locked actions switched off). */
  rules: GameRules;
  strategy: StrategyTable;
  chartCell: ChartCell | null;
  statusMessage: string;
  tone: ResultTone;
  /** Chips won or lost on the hand just settled, or null mid-hand. */
  lastNet: number | null;
  isRevealing: boolean;
  isBetweenHands: boolean;
  isOutOfChips: boolean;
  dealLabel: string;
  hint: HintView | null;
  /** Shown without asking at levels with auto-hints. */
  autoRecommendation: Recommendation | null;
  /** Trainer feedback for the last decision, filtered by level and settings. */
  feedback: Feedback | null;
  count: CountView | null;
  countCheck: CountCheck | null;
  isCountCheckPending: boolean;
  stats: SessionStats;
  trainer: {
    accuracy: number | null;
    decisions: number;
    levelDecisions: number;
    levelAccuracy: number | null;
    mistakes: Array<{ situation: string } & MistakeRecord>;
    countChecks: number;
    countChecksCorrect: number;
  };
  promotionReady: boolean;
  bankroll: number;
  bet: number;
  betOptions: readonly number[];
  can: {
    deal: boolean;
    hit: boolean;
    stand: boolean;
    double: boolean;
    split: boolean;
    surrender: boolean;
    takeInsurance: boolean;
    declineInsurance: boolean;
    hint: boolean;
    changeBet: boolean;
  };
  actions: {
    deal: () => void;
    hit: () => void;
    stand: () => void;
    double: () => void;
    split: () => void;
    surrender: () => void;
    insurance: (take: boolean) => void;
    requestHint: () => void;
    setBet: (bet: number) => void;
    setLevel: (level: LevelId) => void;
    setTableOptions: (options: TableOptions) => void;
    updateSettings: (settings: Partial<Settings>) => void;
    answerCountCheck: (answer: number | null) => void;
    snoozePromotion: () => void;
    reset: () => void;
  };
}

/** `?seed=123` gives a reproducible shoe (used by the end-to-end tests). */
function randomFromUrl(): () => number {
  if (typeof window === "undefined") return secureRandom;
  const seed = new URLSearchParams(window.location.search).get("seed");
  return seed !== null && /^\d+$/.test(seed) ? createSeededRandom(Number(seed)) : secureRandom;
}

function initSession(): SessionState {
  return createSession(loadSession(), randomFromUrl());
}

export function useBlackjackGame(): GameViewModel {
  const [state, dispatch] = useReducer(sessionReducer, undefined, initSession);
  const [sound] = useState(() => new SoundEngine());
  const [announcement, setAnnouncement] = useState("");

  const table = useMemo(() => selectTableView(state), [state]);
  const prevTableRef = useRef(table);
  const prevFeedbackRef = useRef(state.feedback);
  const levelDef = currentLevel(state);

  const feedbackToShow =
    state.settings.feedback &&
    state.feedback &&
    (levelDef.assists.feedback === "every" || !state.feedback.correct)
      ? state.feedback
      : null;

  const settingsRef = useRef(state.settings);
  settingsRef.current = state.settings;
  const emit = (cues: SoundCue[]) => {
    sound.playSequence(cues);
    if (settingsRef.current.haptics) vibrateFor(cues);
  };

  // Advance the dealer reveal one card at a time.
  useEffect(() => {
    if (!state.dealerReveal) return;
    const delay =
      state.dealerReveal.visibleCount === 1 ? FIRST_REVEAL_DELAY_MS : REVEAL_STEP_DELAY_MS;
    const timer = window.setTimeout(() => dispatch({ type: "reveal-step" }), delay);
    return () => window.clearTimeout(timer);
  }, [state.dealerReveal]);

  // Sounds, haptics and screen-reader text for whatever just changed on the table.
  useEffect(() => {
    const prev = prevTableRef.current;
    prevTableRef.current = table;
    if (prev === table) return;
    emit(cuesForTableChange(prev, table));
    const text = announcementForTableChange(prev, table);
    if (text) setAnnouncement(text);
    // emit only reads refs and the stable sound engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  // A short tone for trainer feedback.
  useEffect(() => {
    if (state.feedback === prevFeedbackRef.current) return;
    prevFeedbackRef.current = state.feedback;
    if (feedbackToShow) emit([feedbackToShow.correct ? "correct" : "mistake"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.feedback]);

  useEffect(() => {
    saveSession(toPersisted(state));
  }, [state]);

  useEffect(() => {
    sound.muted = state.settings.muted;
  }, [sound, state.settings.muted]);

  const { round } = state;
  const revealing = isRevealing(state);
  const outOfChips = isOutOfChips(state);
  const canSplit = canPlayerAct(state, { type: "split" });
  const settledNet = table.isSettled ? (state.lastSettlement?.net ?? null) : null;

  return {
    table,
    announcement,
    level: levelDef,
    nextLevel: LEVELS[(state.level + 1) as LevelId] ?? null,
    settings: state.settings,
    tableOptions: state.tableOptions,
    rules: state.rules,
    strategy: state.strategy,
    chartCell: chartCellFor(round, canSplit),
    statusMessage: statusMessage(state, { revealing, outOfChips }),
    tone: toneForNet(settledNet),
    lastNet: settledNet,
    isRevealing: revealing,
    isBetweenHands: isBetweenHands(state),
    isOutOfChips: outOfChips,
    dealLabel: dealLabel(state),
    hint: state.hint,
    autoRecommendation: levelDef.assists.autoHint ? currentRecommendation(state) : null,
    feedback: feedbackToShow,
    // Hidden while a count check is open, or the panel would give the answer away.
    count:
      levelDef.assists.counting && state.settings.showCount && !isCountCheckPending(state)
        ? table.count
        : null,
    countCheck: state.countCheck,
    isCountCheckPending: isCountCheckPending(state),
    stats: state.stats,
    trainer: {
      accuracy: accuracy(state.trainer.correct, state.trainer.decisions),
      decisions: state.trainer.decisions,
      levelDecisions: state.trainer.levelDecisions,
      levelAccuracy: accuracy(state.trainer.levelCorrect, state.trainer.levelDecisions),
      mistakes: topMistakes(state.trainer),
      countChecks: state.trainer.countChecks,
      countChecksCorrect: state.trainer.countChecksCorrect,
    },
    promotionReady: isPromotionReady(state),
    bankroll: state.bankroll,
    bet: state.bet,
    betOptions: BET_OPTIONS,
    can: {
      deal: canDeal(state),
      hit: canPlayerAct(state, { type: "hit" }),
      stand: canPlayerAct(state, { type: "stand" }),
      double: canPlayerAct(state, { type: "double" }),
      split: canSplit,
      surrender: canPlayerAct(state, { type: "surrender" }),
      takeInsurance: canPlayerAct(state, { type: "insurance", take: true }),
      declineInsurance: canPlayerAct(state, { type: "insurance", take: false }),
      hint: canRequestHint(state),
      changeBet: canChangeBet(state),
    },
    actions: {
      deal: () => dispatch({ type: "deal" }),
      hit: () => dispatch({ type: "hit" }),
      stand: () => dispatch({ type: "stand" }),
      double: () => dispatch({ type: "double" }),
      split: () => dispatch({ type: "split" }),
      surrender: () => dispatch({ type: "surrender" }),
      insurance: (take) => dispatch({ type: "insurance", take }),
      requestHint: () => {
        if (!canRequestHint(state)) return;
        sound.play("hint");
        dispatch({ type: "request-hint" });
      },
      setBet: (bet) => {
        if (!canChangeBet(state) || bet === state.bet) return;
        emit(["chip"]);
        dispatch({ type: "set-bet", bet });
      },
      setLevel: (level) => dispatch({ type: "set-level", level }),
      setTableOptions: (options) => dispatch({ type: "set-table-options", options }),
      updateSettings: (settings) => dispatch({ type: "update-settings", settings }),
      answerCountCheck: (answer) => dispatch({ type: "answer-count-check", answer }),
      snoozePromotion: () => dispatch({ type: "snooze-promotion" }),
      reset: () => dispatch({ type: "reset" }),
    },
  };
}

function dealLabel(state: SessionState): string {
  if (state.round.phase !== "round-over") return "Deal";
  return state.round.reshufflePending ? "Shuffle & Deal" : "Next Hand";
}

function statusMessage(
  state: SessionState,
  flags: { revealing: boolean; outOfChips: boolean },
): string {
  const { round } = state;
  // The engine's message already names the winner, so hold it back until the reveal ends.
  if (flags.revealing) return "Dealer reveals and draws…";
  if (flags.outOfChips) return "Out of chips. Reset the session for a fresh bankroll.";
  if (isCountCheckPending(state)) return "Count check: what is the running count?";
  if (isBetweenHands(state) && state.bankroll < state.bet) {
    return "Your bet is more than your bankroll. Pick a smaller chip.";
  }
  if (round.phase === "player-turn" && round.playerHands.length > 1) {
    return `Playing hand ${round.activeHandIndex + 1} of ${round.playerHands.length}`;
  }

  const message = round.message ?? (round.phase === "idle" ? "Place your bet and deal." : "");
  if (round.phase === "round-over" && round.reshufflePending) {
    return `${message} Cut card reached: fresh shoe next hand.`;
  }
  return message;
}
