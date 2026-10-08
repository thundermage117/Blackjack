import { useEffect, useRef, useState } from "react";
import {
  createInitialRoundState,
  dealRound,
  isActionAllowed,
  playerDouble,
  playerHit,
  playerStand,
  scoreHand,
  type Card,
  type RoundResult,
  type RoundState,
} from "../../../../packages/game-core/src";
import {
  getHint,
  mvpS17StrategyTable,
  normalizeDealerUpcard,
} from "../../../../packages/hint-engine/src";

interface SessionStats {
  wins: number;
  losses: number;
  pushes: number;
}

interface HookState {
  round: RoundState;
  stats: SessionStats;
  hint: string | null;
  isDealerResolving: boolean;
  pendingDealerAction: "stand" | "double" | null;
}

interface HandSummaryView {
  totalLabel: string;
  detailLabel: string;
}

interface BlackjackGameViewModel {
  phase: RoundState["phase"];
  playerCards: Card[];
  dealerCards: Card[];
  dealerHoleHidden: boolean;
  playerSummary: HandSummaryView;
  dealerSummary: HandSummaryView;
  statusMessage: string;
  resultLabel: string | null;
  resultTone: "info" | "positive" | "negative" | "neutral";
  isDealerResolving: boolean;
  dealLabel: string;
  shoeCardsRemaining: number;
  reshufflePending: boolean;
  hint: string | null;
  stats: SessionStats;
  canDeal: boolean;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canRequestHint: boolean;
  canResetSession: boolean;
  dealRound: () => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  requestHint: () => void;
  resetSession: () => void;
}

function formatStatus(round: RoundState): string {
  if (round.message) return round.message;
  if (round.phase === "idle") return "Ready. Press Deal.";
  return round.phase;
}

function applyCompletedRoundToStats(
  stats: SessionStats,
  prev: RoundState,
  next: RoundState,
): SessionStats {
  const finishedNow = prev.phase !== "round-over" && next.phase === "round-over" && next.result;
  if (!finishedNow) return stats;

  if (next.result === "push") {
    return { ...stats, pushes: stats.pushes + 1 };
  }

  if (next.result === "lose") {
    return { ...stats, losses: stats.losses + 1 };
  }

  return { ...stats, wins: stats.wins + 1 };
}

function resultLabel(result?: RoundResult): string | null {
  if (!result) return null;
  if (result === "blackjack_win") return "Blackjack Win";
  if (result === "win") return "Win";
  if (result === "lose") return "Lose";
  return "Push";
}

function summarizePlayerHand(hand: Card[]): HandSummaryView {
  if (hand.length === 0) {
    return { totalLabel: "No cards", detailLabel: "Start a round to play." };
  }

  const score = scoreHand(hand);
  const detailParts: string[] = [];
  detailParts.push(score.isSoft ? "Soft hand" : "Hard hand");
  if (score.isBlackjack) detailParts.push("Blackjack");
  if (score.isBust) detailParts.push("Bust");

  return {
    totalLabel: `Total ${score.bestTotal}`,
    detailLabel: detailParts.join(" · "),
  };
}

function summarizeDealerHand(round: RoundState, revealHoleCard: boolean): HandSummaryView {
  if (round.dealerHand.length === 0) {
    return { totalLabel: "No cards", detailLabel: "Dealer hand is empty." };
  }

  const holeHidden = round.dealerHoleHidden && !revealHoleCard;
  if (holeHidden) {
    const upcard = round.dealerHand[0];
    if (!upcard) {
      return { totalLabel: "No cards", detailLabel: "Dealer hand is empty." };
    }
    const visibleScore = scoreHand([upcard]);
    return {
      totalLabel: `Showing ${visibleScore.bestTotal}`,
      detailLabel: "Hole card hidden",
    };
  }

  const score = scoreHand(round.dealerHand);
  const detailParts: string[] = [];
  detailParts.push(score.isSoft ? "Soft hand" : "Hard hand");
  if (score.isBlackjack) detailParts.push("Blackjack");
  if (score.isBust) detailParts.push("Bust");

  return {
    totalLabel: `Total ${score.bestTotal}`,
    detailLabel: detailParts.join(" · "),
  };
}

export function useBlackjackGame(): BlackjackGameViewModel {
  const dealerResolveTimerRef = useRef<number | null>(null);
  const [state, setState] = useState<HookState>(() => ({
    round: createInitialRoundState(),
    stats: { wins: 0, losses: 0, pushes: 0 },
    hint: null,
    isDealerResolving: false,
    pendingDealerAction: null,
  }));

  useEffect(() => {
    return () => {
      if (dealerResolveTimerRef.current !== null) {
        window.clearTimeout(dealerResolveTimerRef.current);
      }
    };
  }, []);

  const { round, stats, hint, isDealerResolving, pendingDealerAction } = state;

  const transitionRound = (transition: (round: RoundState) => RoundState) => {
    setState((prev) => {
      const nextRound = transition(prev.round);
      return {
        round: nextRound,
        stats: applyCompletedRoundToStats(prev.stats, prev.round, nextRound),
        hint: null,
        isDealerResolving: false,
        pendingDealerAction: null,
      };
    });
  };

  const transitionRoundWithDealerDelay = (
    pendingAction: "stand" | "double",
    transition: (round: RoundState) => RoundState,
  ) => {
    setState((prev) => {
      if (prev.isDealerResolving) return prev;
      return {
        ...prev,
        hint: null,
        isDealerResolving: true,
        pendingDealerAction: pendingAction,
      };
    });

    if (dealerResolveTimerRef.current !== null) {
      window.clearTimeout(dealerResolveTimerRef.current);
    }

    dealerResolveTimerRef.current = window.setTimeout(() => {
      dealerResolveTimerRef.current = null;
      setState((prev) => {
        const nextRound = transition(prev.round);
        return {
          round: nextRound,
          stats: applyCompletedRoundToStats(prev.stats, prev.round, nextRound),
          hint: null,
          isDealerResolving: false,
          pendingDealerAction: null,
        };
      });
    }, 520);
  };

  const resetSession = () => {
    if (dealerResolveTimerRef.current !== null) {
      window.clearTimeout(dealerResolveTimerRef.current);
      dealerResolveTimerRef.current = null;
    }

    setState({
      round: { ...createInitialRoundState(), message: "Session reset. Press Deal to start." },
      stats: { wins: 0, losses: 0, pushes: 0 },
      hint: null,
      isDealerResolving: false,
      pendingDealerAction: null,
    });
  };

  const displayPhase = isDealerResolving ? "dealer-turn" : round.phase;
  const canHit = isActionAllowed(round, "hit");
  const canStand = isActionAllowed(round, "stand");
  const canDouble = isActionAllowed(round, "double");
  const canDeal =
    !isDealerResolving && round.phase !== "player-turn" && round.phase !== "dealer-turn";
  const canRequestHint =
    !isDealerResolving &&
    round.phase === "player-turn" &&
    round.playerHand.length > 0 &&
    round.dealerHand.length > 0;
  const outcomeText = resultLabel(round.result);
  const reshufflePending = round.reshufflePending;
  const statusMessage = isDealerResolving
    ? pendingDealerAction === "double"
      ? "Dealer resolving after double..."
      : "Dealer revealing and drawing..."
    : reshufflePending && round.phase === "round-over"
      ? `${formatStatus(round)} Cut card reached. Shoe will reshuffle next round.`
      : formatStatus(round);
  const resultTone: BlackjackGameViewModel["resultTone"] =
    round.result === "blackjack_win" || round.result === "win"
      ? "positive"
      : round.result === "lose"
        ? "negative"
        : round.result === "push"
          ? "neutral"
          : "info";

  const dealerHoleHidden = round.dealerHoleHidden && !isDealerResolving;
  const dealLabel =
    round.phase === "round-over" ? (reshufflePending ? "Reshuffle & Deal" : "Next Round") : "Deal";

  return {
    phase: displayPhase,
    playerCards: round.playerHand,
    dealerCards: round.dealerHand,
    dealerHoleHidden,
    playerSummary: summarizePlayerHand(round.playerHand),
    dealerSummary: summarizeDealerHand(round, isDealerResolving),
    statusMessage,
    resultLabel: outcomeText,
    resultTone,
    isDealerResolving,
    dealLabel,
    shoeCardsRemaining: round.shoe.length,
    reshufflePending,
    hint,
    stats,
    canDeal,
    canHit: canHit && !isDealerResolving,
    canStand: canStand && !isDealerResolving,
    canDouble: canDouble && !isDealerResolving,
    canRequestHint,
    canResetSession: true,
    dealRound: () => {
      if (!canDeal) return;
      transitionRound((current) => dealRound(current));
    },
    hit: () => transitionRound((current) => playerHit(current)),
    stand: () => {
      if (!canStand || isDealerResolving) return;
      transitionRoundWithDealerDelay("stand", (current) => playerStand(current));
    },
    double: () => {
      if (!canDouble || isDealerResolving) return;
      transitionRoundWithDealerDelay("double", (current) => playerDouble(current));
    },
    requestHint: () => {
      setState((prev) => {
        const current = prev.round;
        if (
          current.phase !== "player-turn" ||
          !current.dealerHand[0] ||
          current.playerHand.length === 0
        ) {
          return { ...prev, hint: "Hint unavailable right now." };
        }

        const playerScore = scoreHand(current.playerHand);
        if (playerScore.isBust || playerScore.bestTotal > 21) {
          return { ...prev, hint: "Hint unavailable: player hand is busted." };
        }

        try {
          const hintResult = getHint(
            {
              handKind: playerScore.isSoft ? "soft" : "hard",
              total: playerScore.bestTotal,
              dealerUpcard: normalizeDealerUpcard(current.dealerHand[0].rank),
              doubleAllowed: isActionAllowed(current, "double"),
            },
            mvpS17StrategyTable,
          );

          const fallback = hintResult.fallbackApplied ? " (fallback applied)" : "";
          return { ...prev, hint: `${hintResult.action}${fallback}` };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown hint error";
          return { ...prev, hint: `Hint unavailable: ${message}` };
        }
      });
    },
    resetSession,
  };
}
