import { createDeck, secureRandom, shuffle } from "./cards";
import { DEFAULT_MVP_RULES } from "./rules";
import { isPair, scoreHand, shouldDealerDraw } from "./scoring";
import type {
  Card,
  GameRules,
  HandScore,
  HandStatus,
  PlayerAction,
  PlayerHand,
  RoundResult,
  RoundState,
} from "./types";

export function createEmptyRoundState(): RoundState {
  return {
    phase: "idle",
    shoe: [],
    reshufflePending: false,
    playerHands: [],
    activeHandIndex: 0,
    dealerHand: [],
    dealerHoleHidden: false,
    insurance: "none",
  };
}

function newHand(cards: Card[], fromSplit = false): PlayerHand {
  return { cards, actions: [], status: "playing", fromSplit };
}

function drawCard(shoe: Card[]): { card: Card; shoe: Card[] } {
  const [card, ...rest] = shoe;
  if (!card) {
    // The cut card (reshuffleCutoffCards) leaves far more cards than any round can use.
    throw new Error("Cannot draw card from empty shoe");
  }
  return { card, shoe: rest };
}

function newShuffledShoe(rules: GameRules, random: () => number = secureRandom): Card[] {
  return shuffle(createDeck(rules.deckCount), random);
}

function isBelowReshuffleCutoff(shoe: Card[], rules: GameRules): boolean {
  return shoe.length < rules.reshuffleCutoffCards;
}

function withShoeStatus(state: RoundState, rules: GameRules): RoundState {
  return { ...state, reshufflePending: isBelowReshuffleCutoff(state.shoe, rules) };
}

function replaceHand(state: RoundState, index: number, hand: PlayerHand): RoundState {
  return {
    ...state,
    playerHands: state.playerHands.map((existing, i) => (i === index ? hand : existing)),
  };
}

export function getActiveHand(state: RoundState): PlayerHand | undefined {
  if (state.phase !== "player-turn") return undefined;
  return state.playerHands[state.activeHandIndex];
}

export function isSplitAcesHand(hand: PlayerHand): boolean {
  return hand.fromSplit && hand.cards[0]?.rank === "A";
}

// ---------------------------------------------------------------------------
// Resolution

function resultForHand(hand: PlayerHand, dealer: HandScore): RoundResult {
  const player = scoreHand(hand.cards);
  if (hand.status === "surrendered") return "surrender";
  if (hand.status === "blackjack") return dealer.isBlackjack ? "push" : "blackjack_win";
  if (player.isBust) return "lose";
  if (dealer.isBlackjack) return "lose";
  if (dealer.isBust) return "win";
  if (player.bestTotal > dealer.bestTotal) return "win";
  if (player.bestTotal < dealer.bestTotal) return "lose";
  return "push";
}

function messageForHand(hand: PlayerHand, dealer: HandScore): string {
  const player = scoreHand(hand.cards);
  const result = hand.result;
  if (result === "blackjack_win") return "Blackjack! Player wins.";
  if (result === "surrender") return "Player surrenders. Half the bet is returned.";
  if (player.isBust) return `Player busts with ${player.bestTotal}. Dealer wins.`;
  if (result === "push" && hand.status === "blackjack") return "Both have blackjack. Push.";
  if (dealer.isBlackjack) return "Dealer has blackjack. Dealer wins.";
  if (dealer.isBust) return `Dealer busts with ${dealer.bestTotal}. Player wins.`;
  if (result === "push") return `Push (${player.bestTotal} vs ${dealer.bestTotal})`;
  if (result === "win") return `Player wins (${player.bestTotal} vs ${dealer.bestTotal})`;
  return `Dealer wins (${dealer.bestTotal} vs ${player.bestTotal})`;
}

function shortResult(result: RoundResult | undefined): string {
  if (result === "blackjack_win") return "blackjack";
  return result ?? "pending";
}

function resolveRound(state: RoundState, rules: GameRules): RoundState {
  const dealer = scoreHand(state.dealerHand);
  const playerHands = state.playerHands.map((hand) => ({
    ...hand,
    result: resultForHand(hand, dealer),
  }));

  const message =
    playerHands.length === 1
      ? messageForHand(playerHands[0], dealer)
      : `Dealer ${dealer.isBust ? "busts with" : "has"} ${dealer.bestTotal}. ` +
        playerHands.map((hand, i) => `Hand ${i + 1}: ${shortResult(hand.result)}`).join(" · ");

  return withShoeStatus(
    { ...state, playerHands, phase: "round-over", dealerHoleHidden: false, message },
    rules,
  );
}

function playDealerToCompletion(state: RoundState, rules: GameRules): RoundState {
  let dealerHand = state.dealerHand;
  let shoe = state.shoe;
  while (shouldDealerDraw(dealerHand, rules.dealerSoft17)) {
    const draw = drawCard(shoe);
    dealerHand = [...dealerHand, draw.card];
    shoe = draw.shoe;
  }
  return { ...state, dealerHand, shoe };
}

/**
 * All player hands are finished: the dealer plays (unless no hand is still live,
 * i.e. every hand busted or surrendered) and the round resolves.
 */
function finishPlayerTurn(state: RoundState, rules: GameRules): RoundState {
  const revealed: RoundState = { ...state, phase: "dealer-turn", dealerHoleHidden: false };
  const anyLive = state.playerHands.some(
    (hand) => hand.status !== "busted" && hand.status !== "surrendered",
  );
  return resolveRound(anyLive ? playDealerToCompletion(revealed, rules) : revealed, rules);
}

/**
 * Moves play to the next unfinished hand. A split hand waiting on its second
 * card receives it here, so cards come out in casino order.
 */
function advanceToNextHand(state: RoundState, rules: GameRules): RoundState {
  let current = state;
  for (let index = state.activeHandIndex + 1; index < current.playerHands.length; index += 1) {
    let hand = current.playerHands[index];
    if (hand.status !== "playing") continue;

    if (hand.cards.length === 1) {
      const draw = drawCard(current.shoe);
      hand = { ...hand, cards: [...hand.cards, draw.card] };
      current = { ...current, shoe: draw.shoe };
    }

    const finishedStatus = autoFinishedStatus(hand);
    if (finishedStatus) {
      current = replaceHand(current, index, { ...hand, status: finishedStatus });
      continue;
    }

    return withShoeStatus(
      {
        ...replaceHand(current, index, hand),
        activeHandIndex: index,
        message: `Hand ${index + 1}`,
      },
      rules,
    );
  }
  return finishPlayerTurn(current, rules);
}

/** Hands that need no decision: busted, 21, or split aces (one card each). */
function autoFinishedStatus(hand: PlayerHand): HandStatus | null {
  const score = scoreHand(hand.cards);
  if (score.isBust) return "busted";
  if (score.bestTotal === 21) return "stood";
  if (isSplitAcesHand(hand) && hand.cards.length >= 2) return "stood";
  return null;
}

// ---------------------------------------------------------------------------
// Public API

export function createInitialRoundState(
  rules: GameRules = DEFAULT_MVP_RULES,
  random: () => number = secureRandom,
): RoundState {
  return {
    ...createEmptyRoundState(),
    shoe: newShuffledShoe(rules, random),
    message: "Ready. Press Deal to start.",
  };
}

export function dealRound(
  state: RoundState = createEmptyRoundState(),
  rules: GameRules = DEFAULT_MVP_RULES,
  random: () => number = secureRandom,
): RoundState {
  const shouldReshuffle = state.reshufflePending || isBelowReshuffleCutoff(state.shoe, rules);
  let shoe = shouldReshuffle ? newShuffledShoe(rules, random) : state.shoe;

  const p1 = drawCard(shoe);
  const d1 = drawCard(p1.shoe);
  const p2 = drawCard(d1.shoe);
  const d2 = drawCard(p2.shoe);
  shoe = d2.shoe;

  const playerHand = newHand([p1.card, p2.card]);
  const dealt: RoundState = withShoeStatus(
    {
      phase: "player-turn",
      shoe,
      reshufflePending: false,
      playerHands: [playerHand],
      activeHandIndex: 0,
      dealerHand: [d1.card, d2.card],
      dealerHoleHidden: true,
      insurance: "none",
      message: shouldReshuffle ? "Shoe reshuffled. Player turn" : "Player turn",
    },
    rules,
  );

  if (dealt.dealerHand[0].rank === "A" && rules.allowInsurance) {
    return {
      ...dealt,
      phase: "insurance",
      insurance: "offered",
      message: "Dealer shows an Ace. Insurance?",
    };
  }
  return peekForNaturals(dealt, rules);
}

/** The dealer peeks for blackjack, so naturals on either side end the round immediately. */
function peekForNaturals(state: RoundState, rules: GameRules): RoundState {
  const [playerHand] = state.playerHands;
  const playerNatural = scoreHand(playerHand.cards).isBlackjack;
  const dealerNatural = scoreHand(state.dealerHand).isBlackjack;
  if (!playerNatural && !dealerNatural) return { ...state, phase: "player-turn" };

  const settledHand: PlayerHand = { ...playerHand, status: playerNatural ? "blackjack" : "stood" };
  return resolveRound({ ...state, playerHands: [settledHand] }, rules);
}

/**
 * Resolves the insurance decision, then peeks. Insurance is a side bet of half
 * the main bet that pays 2:1 if the dealer has blackjack (see settleRound).
 */
export function resolveInsurance(
  state: RoundState,
  take: boolean,
  rules: GameRules = DEFAULT_MVP_RULES,
): RoundState {
  if (state.phase !== "insurance") {
    return { ...state, message: "Insurance is not on offer right now." };
  }
  return peekForNaturals(
    { ...state, insurance: take ? "taken" : "declined", message: "Player turn" },
    rules,
  );
}

export function canSplitHand(state: RoundState, hand: PlayerHand, rules: GameRules): boolean {
  if (!rules.allowSplit) return false;
  if (hand.cards.length !== 2 || hand.actions.length > 0) return false;
  if (!isPair(hand.cards)) return false;
  if (state.playerHands.length >= rules.maxHands) return false;
  if (isSplitAcesHand(hand) && !rules.resplitAces) return false;
  return true;
}

export function isActionAllowed(
  state: RoundState,
  action: PlayerAction,
  rules: GameRules = DEFAULT_MVP_RULES,
): boolean {
  const hand = getActiveHand(state);
  if (!hand || hand.status !== "playing") return false;

  const score = scoreHand(hand.cards);
  if (score.isBust) return false;
  if (action === "stand") return true;
  if (action === "hit") return score.bestTotal < 21;
  if (action === "split") return canSplitHand(state, hand, rules);
  if (action === "surrender") {
    // Late surrender: only as the first decision on the original two-card hand.
    return (
      rules.allowSurrender &&
      state.playerHands.length === 1 &&
      hand.cards.length === 2 &&
      hand.actions.length === 0
    );
  }

  // double
  if (!rules.allowDouble || score.bestTotal >= 21) return false;
  if (hand.cards.length !== 2 || hand.actions.length > 0) return false;
  return !hand.fromSplit || rules.doubleAfterSplit;
}

function rejected(state: RoundState, action: PlayerAction): RoundState {
  const label = action[0].toUpperCase() + action.slice(1);
  return { ...state, message: `${label} is not allowed right now.` };
}

export function playerHit(state: RoundState, rules: GameRules = DEFAULT_MVP_RULES): RoundState {
  if (!isActionAllowed(state, "hit", rules)) return rejected(state, "hit");

  const index = state.activeHandIndex;
  const hand = state.playerHands[index];
  const draw = drawCard(state.shoe);
  const updated: PlayerHand = {
    ...hand,
    cards: [...hand.cards, draw.card],
    actions: [...hand.actions, "hit"],
  };
  const next = withShoeStatus(
    { ...replaceHand(state, index, updated), shoe: draw.shoe, message: "Player hit" },
    rules,
  );

  const finishedStatus = autoFinishedStatus(updated);
  if (!finishedStatus) return next;
  return advanceToNextHand(replaceHand(next, index, { ...updated, status: finishedStatus }), rules);
}

export function playerStand(state: RoundState, rules: GameRules = DEFAULT_MVP_RULES): RoundState {
  if (!isActionAllowed(state, "stand", rules)) return rejected(state, "stand");

  const index = state.activeHandIndex;
  const hand = state.playerHands[index];
  const updated: PlayerHand = { ...hand, actions: [...hand.actions, "stand"], status: "stood" };
  return advanceToNextHand(replaceHand(state, index, updated), rules);
}

export function playerDouble(state: RoundState, rules: GameRules = DEFAULT_MVP_RULES): RoundState {
  if (!isActionAllowed(state, "double", rules)) return rejected(state, "double");

  const index = state.activeHandIndex;
  const hand = state.playerHands[index];
  const draw = drawCard(state.shoe);
  const cards = [...hand.cards, draw.card];
  const updated: PlayerHand = {
    ...hand,
    cards,
    actions: [...hand.actions, "double"],
    status: scoreHand(cards).isBust ? "busted" : "doubled",
  };
  const next = {
    ...replaceHand(state, index, updated),
    shoe: draw.shoe,
    message: "Player doubled",
  };
  return advanceToNextHand(next, rules);
}

export function playerSplit(state: RoundState, rules: GameRules = DEFAULT_MVP_RULES): RoundState {
  if (!isActionAllowed(state, "split", rules)) return rejected(state, "split");

  const index = state.activeHandIndex;
  const hand = state.playerHands[index];
  const [first, second] = hand.cards;
  const draw = drawCard(state.shoe);

  const firstHand = newHand([first, draw.card], true);
  // The second hand gets its next card when play reaches it (see advanceToNextHand).
  const secondHand = newHand([second], true);
  const playerHands = [
    ...state.playerHands.slice(0, index),
    firstHand,
    secondHand,
    ...state.playerHands.slice(index + 1),
  ];

  const next = withShoeStatus(
    { ...state, playerHands, shoe: draw.shoe, message: `Split into ${playerHands.length} hands` },
    rules,
  );

  const finishedStatus = autoFinishedStatus(firstHand);
  if (!finishedStatus) return next;
  return advanceToNextHand(
    replaceHand(next, index, { ...firstHand, status: finishedStatus }),
    rules,
  );
}

export function playerSurrender(
  state: RoundState,
  rules: GameRules = DEFAULT_MVP_RULES,
): RoundState {
  if (!isActionAllowed(state, "surrender", rules)) return rejected(state, "surrender");

  const index = state.activeHandIndex;
  const hand = state.playerHands[index];
  const updated: PlayerHand = {
    ...hand,
    actions: [...hand.actions, "surrender"],
    status: "surrendered",
  };
  return advanceToNextHand(replaceHand(state, index, updated), rules);
}

export type RoundEvent =
  | { type: "deal" }
  | { type: "hit" }
  | { type: "stand" }
  | { type: "double" }
  | { type: "split" }
  | { type: "surrender" }
  | { type: "insurance"; take: boolean };

export function reduceRoundState(
  state: RoundState,
  event: RoundEvent,
  rules: GameRules = DEFAULT_MVP_RULES,
  random: () => number = secureRandom,
): RoundState {
  switch (event.type) {
    case "deal":
      return dealRound(state, rules, random);
    case "hit":
      return playerHit(state, rules);
    case "stand":
      return playerStand(state, rules);
    case "double":
      return playerDouble(state, rules);
    case "split":
      return playerSplit(state, rules);
    case "surrender":
      return playerSurrender(state, rules);
    case "insurance":
      return resolveInsurance(state, event.take, rules);
  }
}
