import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Card, RoundState } from "@blackjack/game-core";
import { cuesForTableChange } from "../audio/cues";
import { SoundEngine } from "../audio/soundEngine";
import {
  BET_OPTIONS,
  canAfford,
  canChangeBet,
  canDeal,
  canPlayerAct,
  canRequestHint,
  createSession,
  isOutOfChips,
  isRevealing,
  sessionReducer,
  type HintView,
  type SessionStats,
} from "./session";
import { loadSession, loadSettings, saveSession, saveSettings } from "./storage";
import {
  resultLabel,
  resultTone,
  selectTableView,
  summarizeDealerHand,
  summarizePlayerHand,
  type HandSummaryView,
  type ResultTone,
} from "./tableView";

/** Pause before the hole card flips, then between each dealer draw. */
const FIRST_REVEAL_DELAY_MS = 450;
const REVEAL_STEP_DELAY_MS = 600;

export interface BlackjackGameViewModel {
  phase: RoundState["phase"];
  handNumber: number;
  playerCards: Card[];
  dealerCards: Card[];
  dealerHoleHidden: boolean;
  playerSummary: HandSummaryView;
  dealerSummary: HandSummaryView;
  statusMessage: string;
  resultLabel: string | null;
  resultTone: ResultTone;
  /** Chips won or lost on the hand just settled, or null mid-hand. */
  lastNet: number | null;
  isDealerRevealing: boolean;
  dealLabel: string;
  shoeCardsRemaining: number;
  reshufflePending: boolean;
  hint: HintView | null;
  stats: SessionStats;
  bankroll: number;
  bet: number;
  betOptions: readonly number[];
  muted: boolean;
  canDeal: boolean;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canRequestHint: boolean;
  canChangeBet: boolean;
  isOutOfChips: boolean;
  dealRound: () => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  requestHint: () => void;
  setBet: (bet: number) => void;
  toggleMuted: () => void;
  resetSession: () => void;
}

export function useBlackjackGame(): BlackjackGameViewModel {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    createSession(loadSession()),
  );
  const [muted, setMuted] = useState(() => loadSettings().muted);
  const [sound] = useState(() => new SoundEngine());

  const view = useMemo(() => selectTableView(state), [state]);
  const prevViewRef = useRef(view);

  // Advance the dealer reveal one card at a time.
  useEffect(() => {
    if (!state.dealerReveal) return;
    const delay =
      state.dealerReveal.visibleCount === 1 ? FIRST_REVEAL_DELAY_MS : REVEAL_STEP_DELAY_MS;
    const timer = window.setTimeout(() => dispatch({ type: "reveal-step" }), delay);
    return () => window.clearTimeout(timer);
  }, [state.dealerReveal]);

  // Play sounds for whatever just changed on the table.
  useEffect(() => {
    sound.playSequence(cuesForTableChange(prevViewRef.current, view));
    prevViewRef.current = view;
  }, [sound, view]);

  useEffect(() => {
    saveSession({ stats: state.stats, bankroll: state.bankroll, bet: state.bet });
  }, [state.stats, state.bankroll, state.bet]);

  useEffect(() => {
    sound.muted = muted;
    saveSettings({ muted });
  }, [sound, muted]);

  const setBet = useCallback(
    (bet: number) => {
      sound.play("chip");
      dispatch({ type: "set-bet", bet });
    },
    [sound],
  );

  const requestHint = useCallback(() => {
    sound.play("hint");
    dispatch({ type: "request-hint" });
  }, [sound]);

  const { round } = state;
  const revealing = isRevealing(state);
  const outOfChips = isOutOfChips(state);

  return {
    phase: revealing ? "dealer-turn" : round.phase,
    handNumber: view.handNumber,
    playerCards: view.playerCards,
    dealerCards: view.dealerCards,
    dealerHoleHidden: view.dealerHoleHidden,
    playerSummary: summarizePlayerHand(view.playerCards),
    dealerSummary: summarizeDealerHand(view.dealerCards, view.dealerHoleHidden),
    statusMessage: statusMessage(state.round, {
      revealing,
      outOfChips,
      betTooHigh: !outOfChips && canChangeBet(state) && !canAfford(state, state.bet),
    }),
    resultLabel: resultLabel(view.result),
    resultTone: resultTone(view.result),
    lastNet: revealing ? null : (state.lastSettlement?.net ?? null),
    isDealerRevealing: revealing,
    dealLabel: dealLabel(round),
    shoeCardsRemaining: view.shoeCardsRemaining,
    reshufflePending: round.reshufflePending,
    hint: state.hint,
    stats: state.stats,
    bankroll: state.bankroll,
    bet: state.bet,
    betOptions: BET_OPTIONS,
    muted,
    canDeal: canDeal(state),
    canHit: canPlayerAct(state, "hit"),
    canStand: canPlayerAct(state, "stand"),
    canDouble: canPlayerAct(state, "double"),
    canRequestHint: canRequestHint(state),
    canChangeBet: canChangeBet(state),
    isOutOfChips: outOfChips,
    dealRound: () => dispatch({ type: "deal" }),
    hit: () => dispatch({ type: "hit" }),
    stand: () => dispatch({ type: "stand" }),
    double: () => dispatch({ type: "double" }),
    requestHint,
    setBet,
    toggleMuted: () => setMuted((value) => !value),
    resetSession: () => dispatch({ type: "reset" }),
  };
}

function statusMessage(
  round: RoundState,
  flags: { revealing: boolean; outOfChips: boolean; betTooHigh: boolean },
): string {
  // The engine's message already names the winner, so hold it back until the reveal ends.
  if (flags.revealing) return "Dealer reveals and draws...";
  if (flags.outOfChips) return "Out of chips. Reset the session for a fresh bankroll.";
  if (flags.betTooHigh) return "Your bet is more than your bankroll. Pick a smaller chip.";

  const message = round.message ?? (round.phase === "idle" ? "Ready. Press Deal." : round.phase);
  if (round.phase === "round-over" && round.reshufflePending) {
    return `${message} Cut card reached: the shoe will be reshuffled next hand.`;
  }
  return message;
}

function dealLabel(round: RoundState): string {
  if (round.phase !== "round-over") return "Deal";
  return round.reshufflePending ? "Reshuffle & Deal" : "Next Hand";
}
