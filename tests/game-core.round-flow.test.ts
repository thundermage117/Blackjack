import { describe, expect, it } from "vitest";
import {
  DEFAULT_MVP_RULES,
  createEmptyRoundState,
  createRules,
  dealRound,
  isActionAllowed,
  playerDouble,
  playerHit,
  playerSplit,
  playerStand,
  playerSurrender,
  reduceRoundState,
  resolveInsurance,
  scoreHand,
  type GameRules,
  type RoundState,
} from "@blackjack/game-core";
import { buildPaddedShoe, parseFixtureCard } from "./helpers/fixtureCards";

/**
 * Deals a round from a stacked shoe. Cards are listed in deal order:
 * player, dealer upcard, player, dealer hole card, then any further draws.
 */
function dealStacked(cards: string[], rules: GameRules = DEFAULT_MVP_RULES): RoundState {
  const shoe = buildPaddedShoe(cards.map(parseFixtureCard));
  return dealRound({ ...createEmptyRoundState(), shoe }, rules);
}

const ranks = (state: RoundState, hand = 0) => state.playerHands[hand].cards.map((c) => c.rank);
const handTotal = (state: RoundState, hand = 0) =>
  scoreHand(state.playerHands[hand].cards).bestTotal;

describe("initial deal", () => {
  it("gives two cards each and hides the dealer hole card", () => {
    const round = dealStacked(["10_spades", "9_clubs", "6_hearts", "7_diamonds"]);

    expect(round.playerHands).toHaveLength(1);
    expect(round.playerHands[0].cards).toHaveLength(2);
    expect(round.dealerHand).toHaveLength(2);
    expect(round.dealerHoleHidden).toBe(true);
    expect(round.phase).toBe("player-turn");
  });

  it("settles a dealer natural immediately as a loss (dealer peeks with a ten up)", () => {
    const round = dealStacked(["10_spades", "K_clubs", "9_hearts", "A_diamonds"]);

    expect(round.phase).toBe("round-over");
    expect(round.playerHands[0].result).toBe("lose");
    expect(round.dealerHoleHidden).toBe(false);
    expect(round.message).toBe("Dealer has blackjack. Dealer wins.");
  });
});

describe("player action guards", () => {
  it("does not allow hit or double after standing", () => {
    const dealt = dealStacked(["10_spades", "9_clubs", "8_hearts", "8_diamonds"]);
    const stood = playerStand(dealt);

    expect(stood.phase).toBe("round-over");
    expect(isActionAllowed(stood, "hit")).toBe(false);
    expect(isActionAllowed(stood, "double")).toBe(false);

    const afterHit = playerHit(stood);
    expect(afterHit.playerHands).toEqual(stood.playerHands);
    expect(afterHit.message).toBe("Hit is not allowed right now.");
  });

  it("does not allow double after a hit", () => {
    const dealt = dealStacked(["5_spades", "9_clubs", "3_hearts", "8_diamonds", "2_clubs"]);
    const hit = playerHit(dealt);

    expect(hit.phase).toBe("player-turn");
    expect(isActionAllowed(hit, "double")).toBe(false);
  });

  it("auto-stands a hand that reaches 21, which is not a natural", () => {
    const dealt = dealStacked([
      "5_spades",
      "9_clubs",
      "6_hearts",
      "8_diamonds",
      "10_clubs",
      "4_hearts",
    ]);
    const hit = playerHit(dealt);

    expect(handTotal(hit)).toBe(21);
    expect(hit.playerHands[0].status).toBe("stood");
    expect(scoreHand(hit.playerHands[0].cards).isBlackjack).toBe(false);
    expect(hit.phase).toBe("round-over");
    expect(hit.playerHands[0].result).toBe("win");
  });
});

describe("double", () => {
  it("draws exactly one card and ends the player turn", () => {
    const dealt = dealStacked(["6_spades", "9_clubs", "5_hearts", "8_diamonds", "Q_clubs"]);
    const doubled = playerDouble(dealt);

    expect(doubled.playerHands[0].cards).toHaveLength(3);
    expect(doubled.playerHands[0].actions).toEqual(["double"]);
    expect(doubled.playerHands[0].status).toBe("doubled");
    expect(doubled.phase).toBe("round-over");
    expect(doubled.playerHands[0].result).toBe("win");
  });
});

describe("dealer play and outcomes", () => {
  it("player bust loses without the dealer drawing", () => {
    const dealt = dealStacked(["10_spades", "6_clubs", "6_hearts", "10_diamonds", "K_clubs"]);
    const busted = playerHit(dealt);

    expect(busted.playerHands[0].result).toBe("lose");
    expect(busted.dealerHand).toHaveLength(2);
    expect(busted.dealerHoleHidden).toBe(false);
    expect(busted.message).toBe("You bust with 26. Dealer wins.");
  });

  it("dealer draws until reaching 17 or more, then stops", () => {
    const dealt = dealStacked([
      "10_spades",
      "2_clubs",
      "8_hearts",
      "3_diamonds",
      "4_clubs",
      "2_hearts",
      "6_spades",
      "9_spades",
    ]);
    const stood = playerStand(dealt);

    expect(stood.dealerHand.map((c) => c.rank)).toEqual(["2", "3", "4", "2", "6"]);
    expect(scoreHand(stood.dealerHand).bestTotal).toBe(17);
  });

  it("dealer hits soft 17 when the table rule says so", () => {
    const h17 = createRules({ ...tableDefaults(), dealerSoft17: "hit" });
    const dealt = dealStacked(["10_spades", "A_clubs", "8_hearts", "6_diamonds", "3_clubs"], h17);
    const stood = playerStand(resolveInsurance(dealt, false, h17), h17);

    expect(stood.dealerHand.map((c) => c.rank)).toEqual(["A", "6", "3"]);
    expect(stood.playerHands[0].result).toBe("lose");
  });

  it("dealer bust is a player win", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "2_hearts", "6_diamonds", "K_clubs"]);
    const stood = playerStand(dealt);
    expect(stood.playerHands[0].result).toBe("win");
    expect(stood.message).toBe("Dealer busts with 26. You win.");
  });

  it("higher dealer total is a player loss", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "7_hearts", "9_diamonds"]);
    expect(playerStand(dealt).playerHands[0].result).toBe("lose");
  });

  it("equal totals push", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "8_hearts", "8_diamonds"]);
    expect(playerStand(dealt).playerHands[0].result).toBe("push");
  });

  it("reduceRoundState dispatches events to the matching transitions", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "8_hearts", "8_diamonds"]);
    expect(reduceRoundState(dealt, { type: "stand" })).toEqual(playerStand(dealt));
  });
});

function tableDefaults() {
  return {
    deckCount: 6 as const,
    dealerSoft17: "stand" as const,
    doubleAfterSplit: true,
    surrender: false,
    blackjackPayout: 1.5 as const,
  };
}

describe("split", () => {
  it("is only allowed on a two-card pair, with tens counting as a pair", () => {
    const pair = dealStacked(["8_spades", "9_clubs", "8_hearts", "7_diamonds"]);
    const tens = dealStacked(["K_spades", "9_clubs", "Q_hearts", "7_diamonds"]);
    const noPair = dealStacked(["8_spades", "9_clubs", "7_hearts", "7_diamonds"]);

    expect(isActionAllowed(pair, "split")).toBe(true);
    expect(isActionAllowed(tens, "split")).toBe(true);
    expect(isActionAllowed(noPair, "split")).toBe(false);
  });

  it("plays split hands in order, dealing the second hand's card when it is reached", () => {
    // P 8, D 6, P 8, D 10 | split draws: 3 (hand 1) ... hand 2 later gets K
    const dealt = dealStacked([
      "8_spades",
      "6_clubs",
      "8_hearts",
      "10_diamonds",
      "3_clubs",
      "10_clubs",
      "K_hearts",
      "9_spades",
    ]);
    const split = playerSplit(dealt);

    expect(split.playerHands).toHaveLength(2);
    expect(ranks(split, 0)).toEqual(["8", "3"]);
    expect(ranks(split, 1)).toEqual(["8"]);
    expect(split.activeHandIndex).toBe(0);
    expect(split.playerHands.every((hand) => hand.fromSplit)).toBe(true);

    // Hand 1 doubles (double after split) on 11 and draws the 10.
    expect(isActionAllowed(split, "double")).toBe(true);
    const afterDouble = playerDouble(split);
    expect(ranks(afterDouble, 0)).toEqual(["8", "3", "10"]);
    expect(afterDouble.activeHandIndex).toBe(1);
    expect(ranks(afterDouble, 1)).toEqual(["8", "K"]);

    // Hand 2 stands on 18; dealer 16 draws 9 and busts.
    const done = playerStand(afterDouble);
    expect(done.phase).toBe("round-over");
    expect(done.playerHands.map((h) => h.result)).toEqual(["win", "win"]);
    expect(done.message).toContain("Hand 1: win");
  });

  it("forbids double after split when the table disallows it", () => {
    const noDas = createRules({ ...tableDefaults(), doubleAfterSplit: false });
    const dealt = dealStacked(["8_spades", "6_clubs", "8_hearts", "10_diamonds", "3_clubs"], noDas);
    const split = playerSplit(dealt, noDas);
    expect(isActionAllowed(split, "double", noDas)).toBe(false);
  });

  it("gives split aces one card each and finishes both hands", () => {
    const dealt = dealStacked([
      "A_spades",
      "7_clubs",
      "A_hearts",
      "10_diamonds",
      "K_clubs",
      "5_hearts",
    ]);
    const split = playerSplit(dealt);

    expect(ranks(split, 0)).toEqual(["A", "K"]);
    expect(ranks(split, 1)).toEqual(["A", "5"]);
    expect(split.playerHands.map((h) => h.status)).toEqual(["stood", "stood"]);
    expect(split.phase).toBe("round-over");
    // 21 after a split is not a natural: it pays 1:1, not 3:2.
    expect(split.playerHands[0].result).toBe("win");
    expect(split.playerHands[1].result).toBe("lose");
  });

  it("allows re-splitting up to the maximum number of hands", () => {
    const dealt = dealStacked([
      "8_spades",
      "6_clubs",
      "8_hearts",
      "10_diamonds",
      "8_clubs",
      "8_diamonds",
      "8_spades",
    ]);
    let round = playerSplit(dealt); // 2 hands, hand 1 = 8,8
    round = playerSplit(round); // 3 hands, hand 1 = 8,8
    round = playerSplit(round); // 4 hands
    expect(round.playerHands).toHaveLength(4);
    expect(isActionAllowed(round, "split")).toBe(false);
  });
});

describe("insurance", () => {
  it("is offered when the dealer shows an Ace, before the peek", () => {
    const dealt = dealStacked(["10_spades", "A_clubs", "9_hearts", "K_diamonds"]);
    expect(dealt.phase).toBe("insurance");
    expect(dealt.insurance).toBe("offered");
    expect(isActionAllowed(dealt, "hit")).toBe(false);
  });

  it("resolves the dealer blackjack after insurance is taken", () => {
    const dealt = dealStacked(["10_spades", "A_clubs", "9_hearts", "K_diamonds"]);
    const resolved = resolveInsurance(dealt, true);
    expect(resolved.insurance).toBe("taken");
    expect(resolved.phase).toBe("round-over");
    expect(resolved.playerHands[0].result).toBe("lose");
  });

  it("continues to the player turn when the dealer has no blackjack", () => {
    const dealt = dealStacked(["10_spades", "A_clubs", "9_hearts", "6_diamonds"]);
    const resolved = resolveInsurance(dealt, false);
    expect(resolved.insurance).toBe("declined");
    expect(resolved.phase).toBe("player-turn");
  });

  it("is not offered when the table rules disable it", () => {
    const rules = { ...DEFAULT_MVP_RULES, allowInsurance: false };
    const dealt = dealStacked(["10_spades", "A_clubs", "9_hearts", "6_diamonds"], rules);
    expect(dealt.phase).toBe("player-turn");
    expect(dealt.insurance).toBe("none");
  });
});

describe("surrender", () => {
  const lateSurrender = createRules({ ...tableDefaults(), surrender: true });

  it("forfeits the hand without the dealer drawing", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "6_hearts", "6_diamonds"], lateSurrender);
    const surrendered = playerSurrender(dealt, lateSurrender);

    expect(surrendered.playerHands[0].status).toBe("surrendered");
    expect(surrendered.playerHands[0].result).toBe("surrender");
    expect(surrendered.dealerHand).toHaveLength(2);
    expect(surrendered.phase).toBe("round-over");
  });

  it("is only allowed as the first decision and never after a split", () => {
    const dealt = dealStacked(
      ["8_spades", "10_clubs", "8_hearts", "6_diamonds", "2_clubs"],
      lateSurrender,
    );
    expect(isActionAllowed(dealt, "surrender", lateSurrender)).toBe(true);
    expect(isActionAllowed(playerSplit(dealt, lateSurrender), "surrender", lateSurrender)).toBe(
      false,
    );
    expect(isActionAllowed(playerHit(dealt, lateSurrender), "surrender", lateSurrender)).toBe(
      false,
    );
  });

  it("is unavailable when the table rules disable it", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "6_hearts", "6_diamonds"]);
    expect(isActionAllowed(dealt, "surrender")).toBe(false);
  });
});
