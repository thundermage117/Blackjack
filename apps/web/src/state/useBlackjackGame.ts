import { useState } from "react";
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
}

interface BlackjackGameViewModel {
  phase: RoundState["phase"];
  playerDisplay: string;
  dealerDisplay: string;
  statusMessage: string;
  hint: string | null;
  stats: SessionStats;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canRequestHint: boolean;
  dealRound: () => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  requestHint: () => void;
}

function suitSymbol(suit: Card["suit"]): string {
  if (suit === "clubs") return "C";
  if (suit === "diamonds") return "D";
  if (suit === "hearts") return "H";
  return "S";
}

function formatCard(card: Card): string {
  return `${card.rank}${suitSymbol(card.suit)}`;
}

function formatPlayerHand(hand: Card[]): string {
  if (hand.length === 0) return "No cards";
  const score = scoreHand(hand);
  const softness = score.isSoft ? "soft" : "hard";
  return `${hand.map(formatCard).join(" ")} (${score.bestTotal}, ${softness})`;
}

function formatDealerHand(round: RoundState): string {
  if (round.dealerHand.length === 0) return "No cards";

  if (round.dealerHoleHidden) {
    const upcard = round.dealerHand[0];
    if (!upcard) return "No cards";
    const visibleTotal = scoreHand([upcard]).bestTotal;
    return `${formatCard(upcard)} [hidden] (showing ${visibleTotal})`;
  }

  const score = scoreHand(round.dealerHand);
  const softness = score.isSoft ? "soft" : "hard";
  return `${round.dealerHand.map(formatCard).join(" ")} (${score.bestTotal}, ${softness})`;
}

function formatStatus(round: RoundState): string {
  if (round.message) return round.message;
  if (round.phase === "idle") return "Ready. Press Deal.";
  return round.phase;
}

function applyCompletedRoundToStats(stats: SessionStats, prev: RoundState, next: RoundState): SessionStats {
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

export function useBlackjackGame(): BlackjackGameViewModel {
  const [state, setState] = useState<HookState>(() => ({
    round: createInitialRoundState(),
    stats: { wins: 0, losses: 0, pushes: 0 },
    hint: null,
  }));

  const { round, stats, hint } = state;

  const transitionRound = (transition: (round: RoundState) => RoundState) => {
    setState((prev) => {
      const nextRound = transition(prev.round);
      return {
        round: nextRound,
        stats: applyCompletedRoundToStats(prev.stats, prev.round, nextRound),
        hint: null,
      };
    });
  };

  const canHit = isActionAllowed(round, "hit");
  const canStand = isActionAllowed(round, "stand");
  const canDouble = isActionAllowed(round, "double");
  const canRequestHint = round.phase === "player-turn" && round.playerHand.length > 0 && round.dealerHand.length > 0;
  const outcomeText = resultLabel(round.result);
  const statusMessage = outcomeText ? `${formatStatus(round)} [${outcomeText}]` : formatStatus(round);

  return {
    phase: round.phase,
    playerDisplay: formatPlayerHand(round.playerHand),
    dealerDisplay: formatDealerHand(round),
    statusMessage,
    hint,
    stats,
    canHit,
    canStand,
    canDouble,
    canRequestHint,
    dealRound: () => transitionRound((current) => dealRound(current)),
    hit: () => transitionRound((current) => playerHit(current)),
    stand: () => transitionRound((current) => playerStand(current)),
    double: () => transitionRound((current) => playerDouble(current)),
    requestHint: () => {
      setState((prev) => {
        const current = prev.round;
        if (current.phase !== "player-turn" || !current.dealerHand[0] || current.playerHand.length === 0) {
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
  };
}
