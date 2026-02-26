import { createDeck, shuffle } from "./cards";
import { scoreHand, shouldDealerDraw } from "./scoring";
import type { Card, GameRules, PlayerAction, RoundResult, RoundState } from "./types";

export const DEFAULT_MVP_RULES: GameRules = {
  dealerSoft17: "stand",
  blackjackPayout: 1.5,
  allowDouble: true,
  allowSplit: false,
  allowSurrender: false,
  deckCount: 6,
  reshuffleCutoffCards: 15,
};

export function createEmptyRoundState(): RoundState {
  return {
    phase: "idle",
    shoe: [],
    reshufflePending: false,
    playerHand: [],
    dealerHand: [],
    dealerHoleHidden: false,
    playerActionsTaken: [],
  };
}

function drawCard(shoe: Card[]): { card: Card; shoe: Card[] } {
  const [card, ...rest] = shoe;
  if (!card) {
    throw new Error("Cannot draw card from empty shoe");
  }
  return { card, shoe: rest };
}

function newShuffledShoe(rules: GameRules, random = Math.random): Card[] {
  return shuffle(createDeck(rules.deckCount), random);
}

function isBelowReshuffleCutoff(shoe: Card[], rules: GameRules): boolean {
  return shoe.length < rules.reshuffleCutoffCards;
}

function withShoeStatus(state: RoundState, rules: GameRules): RoundState {
  return {
    ...state,
    reshufflePending: isBelowReshuffleCutoff(state.shoe, rules),
  };
}

function messageForResult(result: RoundResult, playerTotal: number, dealerTotal: number): string {
  if (result === "blackjack_win") return "Blackjack! Player wins.";
  if (result === "push") return `Push (${playerTotal} vs ${dealerTotal})`;
  if (result === "win") return `Player wins (${playerTotal} vs ${dealerTotal})`;
  return `Dealer wins (${dealerTotal} vs ${playerTotal})`;
}

function resolveRoundResult(playerHand: Card[], dealerHand: Card[]): RoundResult {
  const player = scoreHand(playerHand);
  const dealer = scoreHand(dealerHand);

  if (player.isBust) return "lose";
  if (dealer.isBust) return "win";
  if (player.bestTotal > dealer.bestTotal) return "win";
  if (player.bestTotal < dealer.bestTotal) return "lose";
  return "push";
}

function withResolvedRound(
  base: RoundState,
  result: RoundResult | undefined,
  rules: GameRules = DEFAULT_MVP_RULES,
): RoundState {
  if (!result) return base;

  const playerScore = scoreHand(base.playerHand);
  const dealerScore = scoreHand(base.dealerHand);
  return withShoeStatus({
    ...base,
    phase: "round-over",
    dealerHoleHidden: false,
    result,
    message: messageForResult(result, playerScore.bestTotal, dealerScore.bestTotal),
  }, rules);
}

function settleNaturals(state: RoundState, rules: GameRules = DEFAULT_MVP_RULES): RoundState {
  const playerScore = scoreHand(state.playerHand);
  const dealerScore = scoreHand(state.dealerHand);

  if (!playerScore.isBlackjack && !dealerScore.isBlackjack) return state;
  if (playerScore.isBlackjack && dealerScore.isBlackjack) {
    return withResolvedRound(state, "push", rules);
  }
  if (playerScore.isBlackjack) {
    return withResolvedRound(state, "blackjack_win", rules);
  }
  return withResolvedRound(state, "lose", rules);
}

function playDealerToCompletion(
  dealerHand: Card[],
  shoe: Card[],
  rules: GameRules,
): { dealerHand: Card[]; shoe: Card[] } {
  let currentDealerHand = [...dealerHand];
  let currentShoe = shoe;

  while (shouldDealerDraw(currentDealerHand, rules.dealerSoft17)) {
    const draw = drawCard(currentShoe);
    currentDealerHand = [...currentDealerHand, draw.card];
    currentShoe = draw.shoe;
  }

  return { dealerHand: currentDealerHand, shoe: currentShoe };
}

function resolveAfterDealerPlay(state: RoundState, rules: GameRules): RoundState {
  const dealerPlayed = playDealerToCompletion(state.dealerHand, state.shoe, rules);
  const nextState: RoundState = {
    ...state,
    phase: "dealer-turn",
    dealerHoleHidden: false,
    dealerHand: dealerPlayed.dealerHand,
    shoe: dealerPlayed.shoe,
  };
  return withResolvedRound(
    nextState,
    resolveRoundResult(nextState.playerHand, nextState.dealerHand),
    rules,
  );
}

export function createInitialRoundState(
  rules: GameRules = DEFAULT_MVP_RULES,
  random = Math.random,
): RoundState {
  return {
    ...createEmptyRoundState(),
    shoe: newShuffledShoe(rules, random),
    reshufflePending: false,
    message: "Ready. Press Deal to start.",
  };
}

export function dealRound(
  state: RoundState = createEmptyRoundState(),
  rules: GameRules = DEFAULT_MVP_RULES,
  random = Math.random,
): RoundState {
  const shouldReshuffleBeforeDeal = state.reshufflePending || isBelowReshuffleCutoff(state.shoe, rules);
  let shoe = shouldReshuffleBeforeDeal ? newShuffledShoe(rules, random) : state.shoe;

  const p1 = drawCard(shoe);
  shoe = p1.shoe;
  const d1 = drawCard(shoe);
  shoe = d1.shoe;
  const p2 = drawCard(shoe);
  shoe = p2.shoe;
  const d2 = drawCard(shoe);
  shoe = d2.shoe;

  const next: RoundState = withShoeStatus({
    phase: "player-turn",
    shoe,
    reshufflePending: false,
    playerHand: [p1.card, p2.card],
    dealerHand: [d1.card, d2.card],
    dealerHoleHidden: true,
    playerActionsTaken: [],
    result: undefined,
    message: shouldReshuffleBeforeDeal ? "Shoe reshuffled. Player turn" : "Player turn",
  }, rules);

  return settleNaturals(next, rules);
}

export function isActionAllowed(
  state: RoundState,
  action: PlayerAction,
  rules: GameRules = DEFAULT_MVP_RULES,
): boolean {
  if (state.phase !== "player-turn") return false;
  const playerScore = scoreHand(state.playerHand);
  if (playerScore.isBust) return false;
  if (action === "hit") return playerScore.bestTotal < 21;
  if (action === "stand") return true;
  if (action === "double") {
    if (!rules.allowDouble) return false;
    if (playerScore.bestTotal >= 21) return false;
    return state.playerHand.length === 2 && state.playerActionsTaken.length === 0;
  }
  return false;
}

export function summarizeRoundState(state: RoundState): {
  playerTotal: number;
  dealerVisibleTotal: number | null;
  playerBlackjack: boolean;
} {
  const playerScore = scoreHand(state.playerHand);
  const dealerVisibleCard = state.dealerHand[0];
  const dealerVisibleTotal = dealerVisibleCard ? scoreHand([dealerVisibleCard]).bestTotal : null;

  return {
    playerTotal: playerScore.bestTotal,
    dealerVisibleTotal,
    playerBlackjack: playerScore.isBlackjack,
  };
}

export function playerHit(
  state: RoundState,
  rules: GameRules = DEFAULT_MVP_RULES,
): RoundState {
  if (!isActionAllowed(state, "hit", rules)) {
    return { ...state, message: "Hit is not allowed right now." };
  }

  const draw = drawCard(state.shoe);
  const playerHand = [...state.playerHand, draw.card];
  const playerScore = scoreHand(playerHand);

  const next: RoundState = withShoeStatus({
    ...state,
    shoe: draw.shoe,
    playerHand,
    playerActionsTaken: [...state.playerActionsTaken, "hit"],
    message: "Player hit",
  }, rules);

  if (playerScore.isBust) {
    return withResolvedRound(
      {
        ...next,
        dealerHoleHidden: false,
      },
      "lose",
      rules,
    );
  }

  return next;
}

export function playerStand(
  state: RoundState,
  rules: GameRules = DEFAULT_MVP_RULES,
): RoundState {
  if (!isActionAllowed(state, "stand", rules)) {
    return { ...state, message: "Stand is not allowed right now." };
  }

  return resolveAfterDealerPlay(
    {
      ...state,
      phase: "dealer-turn",
      dealerHoleHidden: false,
      playerActionsTaken: [...state.playerActionsTaken, "stand"],
      message: "Dealer turn",
    },
    rules,
  );
}

export function playerDouble(
  state: RoundState,
  rules: GameRules = DEFAULT_MVP_RULES,
): RoundState {
  if (!isActionAllowed(state, "double", rules)) {
    return { ...state, message: "Double is not allowed right now." };
  }

  const draw = drawCard(state.shoe);
  const playerHand = [...state.playerHand, draw.card];
  const playerScore = scoreHand(playerHand);

  const next: RoundState = withShoeStatus({
    ...state,
    shoe: draw.shoe,
    playerHand,
    dealerHoleHidden: false,
    playerActionsTaken: [...state.playerActionsTaken, "double"],
    phase: "dealer-turn",
    message: "Player doubled",
  }, rules);

  if (playerScore.isBust) {
    return withResolvedRound(next, "lose", rules);
  }

  return resolveAfterDealerPlay(next, rules);
}

export type RoundEvent =
  | { type: "deal" }
  | { type: "hit" }
  | { type: "stand" }
  | { type: "double" };

export function reduceRoundState(
  state: RoundState,
  event: RoundEvent,
  rules: GameRules = DEFAULT_MVP_RULES,
  random = Math.random,
): RoundState {
  if (event.type === "deal") return dealRound(state, rules, random);
  if (event.type === "hit") return playerHit(state, rules);
  if (event.type === "stand") return playerStand(state, rules);
  return playerDouble(state, rules);
}
