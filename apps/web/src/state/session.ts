import {
  DEFAULT_MVP_RULES,
  createInitialRoundState,
  dealRound,
  hasDoubled,
  isActionAllowed,
  playerDouble,
  playerHit,
  playerStand,
  scoreHand,
  settleWager,
  type GameRules,
  type RoundResult,
  type RoundState,
  type WagerSettlement,
} from "@blackjack/game-core";
import {
  getHint,
  mvpS17StrategyTable,
  normalizeDealerUpcard,
  type HintAction,
} from "@blackjack/hint-engine";

export const STARTING_BANKROLL = 1000;
export const BET_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_BET = BET_OPTIONS[0];

export interface SessionStats {
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
}

export type HintView =
  { kind: "advice"; action: HintAction; detail: string } | { kind: "unavailable"; detail: string };

/**
 * Dealer cards are revealed one step at a time after the player stands or doubles.
 * `visibleCount` is how many dealer cards are face up; the round is settled
 * (stats/bankroll updated) only once every dealer card is visible.
 */
export interface DealerReveal {
  visibleCount: number;
}

export interface SessionState {
  round: RoundState;
  rules: GameRules;
  stats: SessionStats;
  bankroll: number;
  bet: number;
  hint: HintView | null;
  dealerReveal: DealerReveal | null;
  lastSettlement: WagerSettlement | null;
}

export type SessionAction =
  | { type: "deal" }
  | { type: "hit" }
  | { type: "stand" }
  | { type: "double" }
  | { type: "reveal-step" }
  | { type: "request-hint" }
  | { type: "set-bet"; bet: number }
  | { type: "reset" };

/** Fields that survive a page reload. See ADR-0005. */
export type PersistedSession = Pick<SessionState, "stats" | "bankroll" | "bet">;

export function emptyStats(): SessionStats {
  return { wins: 0, losses: 0, pushes: 0, blackjacks: 0 };
}

export function createSession(
  saved?: Partial<PersistedSession>,
  rules: GameRules = DEFAULT_MVP_RULES,
): SessionState {
  return {
    round: createInitialRoundState(rules),
    rules,
    stats: saved?.stats ?? emptyStats(),
    bankroll: saved?.bankroll ?? STARTING_BANKROLL,
    bet: saved?.bet ?? DEFAULT_BET,
    hint: null,
    dealerReveal: null,
    lastSettlement: null,
  };
}

export function isRevealing(state: SessionState): boolean {
  return state.dealerReveal !== null;
}

export function canAfford(state: SessionState, amount: number): boolean {
  return state.bankroll >= amount;
}

export function isRoundInProgress(state: SessionState): boolean {
  return state.round.phase === "player-turn" || state.round.phase === "dealer-turn";
}

export function canDeal(state: SessionState): boolean {
  return !isRevealing(state) && !isRoundInProgress(state) && canAfford(state, state.bet);
}

export function canChangeBet(state: SessionState): boolean {
  return !isRevealing(state) && !isRoundInProgress(state);
}

export function canPlayerAct(state: SessionState, action: "hit" | "stand" | "double"): boolean {
  if (isRevealing(state)) return false;
  if (!isActionAllowed(state.round, action, state.rules)) return false;
  // Doubling puts a second bet at risk, so the bankroll must cover both.
  if (action === "double") return canAfford(state, state.bet * 2);
  return true;
}

export function canRequestHint(state: SessionState): boolean {
  return !isRevealing(state) && state.round.phase === "player-turn";
}

export function isOutOfChips(state: SessionState): boolean {
  return !isRoundInProgress(state) && !isRevealing(state) && state.bankroll < BET_OPTIONS[0];
}

function applyResultToStats(stats: SessionStats, result: RoundResult): SessionStats {
  if (result === "push") return { ...stats, pushes: stats.pushes + 1 };
  if (result === "lose") return { ...stats, losses: stats.losses + 1 };
  if (result === "blackjack_win") {
    return { ...stats, wins: stats.wins + 1, blackjacks: stats.blackjacks + 1 };
  }
  return { ...stats, wins: stats.wins + 1 };
}

function settle(state: SessionState): SessionState {
  const { result } = state.round;
  if (state.round.phase !== "round-over" || !result) return state;

  const settlement = settleWager(result, state.bet, hasDoubled(state.round), state.rules);
  return {
    ...state,
    stats: applyResultToStats(state.stats, result),
    bankroll: state.bankroll + settlement.net,
    lastSettlement: settlement,
  };
}

/** Applies a round transition and either settles immediately or starts a dealer reveal. */
function transition(
  state: SessionState,
  nextRound: RoundState,
  options: { revealDealer: boolean },
): SessionState {
  const next: SessionState = { ...state, round: nextRound, hint: null };
  if (nextRound.phase !== "round-over") return next;

  const dealerDrewOrRevealed = options.revealDealer && nextRound.dealerHand.length >= 2;
  if (dealerDrewOrRevealed) {
    // Start with only the upcard showing; reveal-step flips the hole card, then each draw.
    return { ...next, dealerReveal: { visibleCount: 1 } };
  }
  return settle(next);
}

function hintFor(state: SessionState): HintView {
  const { round } = state;
  const upcard = round.dealerHand[0];
  if (round.phase !== "player-turn" || !upcard || round.playerHand.length === 0) {
    return { kind: "unavailable", detail: "Hints are available during your turn." };
  }

  const score = scoreHand(round.playerHand);
  const handKind = score.isSoft ? "soft" : "hard";
  try {
    const result = getHint(
      {
        handKind,
        total: score.bestTotal,
        dealerUpcard: normalizeDealerUpcard(upcard.rank),
        doubleAllowed: canPlayerAct(state, "double"),
      },
      mvpS17StrategyTable,
    );
    const situation = `${handKind} ${score.bestTotal} vs dealer ${normalizeDealerUpcard(upcard.rank)}`;
    const detail = result.fallbackApplied
      ? `Basic strategy says double on ${situation}; doubling isn't available, so ${result.action.toLowerCase()}.`
      : `Basic strategy for ${situation}.`;
    return { kind: "advice", action: result.action, detail };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown hint error";
    return { kind: "unavailable", detail: message };
  }
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "deal": {
      if (!canDeal(state)) return state;
      return transition({ ...state, lastSettlement: null }, dealRound(state.round, state.rules), {
        revealDealer: false,
      });
    }
    case "hit":
      if (!canPlayerAct(state, "hit")) return state;
      return transition(state, playerHit(state.round, state.rules), { revealDealer: false });
    case "stand":
      if (!canPlayerAct(state, "stand")) return state;
      return transition(state, playerStand(state.round, state.rules), { revealDealer: true });
    case "double":
      if (!canPlayerAct(state, "double")) return state;
      return transition(state, playerDouble(state.round, state.rules), { revealDealer: true });
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
    case "reset":
      return {
        ...createSession(undefined, state.rules),
        bet: state.bet,
        round: { ...createInitialRoundState(state.rules), message: "Session reset. Press Deal." },
      };
  }
}
