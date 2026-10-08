import { describe, expect, it } from "vitest";
import {
  createEmptyRoundState,
  dealRound,
  isActionAllowed,
  playerDouble,
  playerHit,
  playerStand,
  reduceRoundState,
  scoreHand,
  type RoundState,
} from "@blackjack/game-core";
import { buildPaddedShoe, parseFixtureCard } from "./helpers/fixtureCards";

/**
 * Deals a round from a stacked shoe. Cards are listed in deal order:
 * player, dealer upcard, player, dealer hole card, then any further draws.
 */
function dealStacked(cards: string[]): RoundState {
  const shoe = buildPaddedShoe(cards.map(parseFixtureCard));
  return dealRound({ ...createEmptyRoundState(), shoe });
}

describe("initial deal", () => {
  it("gives two cards each and hides the dealer hole card", () => {
    const round = dealStacked(["10_spades", "9_clubs", "6_hearts", "7_diamonds"]);

    expect(round.playerHand).toHaveLength(2);
    expect(round.dealerHand).toHaveLength(2);
    expect(round.dealerHoleHidden).toBe(true);
    expect(round.phase).toBe("player-turn");
  });

  it("settles a dealer natural immediately as a loss", () => {
    const round = dealStacked(["10_spades", "A_clubs", "9_hearts", "K_diamonds"]);

    expect(round.phase).toBe("round-over");
    expect(round.result).toBe("lose");
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
    expect(afterHit.playerHand).toEqual(stood.playerHand);
    expect(afterHit.message).toBe("Hit is not allowed right now.");
  });

  it("does not allow double after a hit", () => {
    const dealt = dealStacked(["5_spades", "9_clubs", "3_hearts", "8_diamonds", "2_clubs"]);
    const hit = playerHit(dealt);

    expect(hit.phase).toBe("player-turn");
    expect(isActionAllowed(hit, "double")).toBe(false);
  });

  it("does not allow hitting on 21", () => {
    const dealt = dealStacked(["5_spades", "9_clubs", "6_hearts", "8_diamonds", "10_clubs"]);
    const hit = playerHit(dealt);

    expect(scoreHand(hit.playerHand).bestTotal).toBe(21);
    expect(isActionAllowed(hit, "hit")).toBe(false);
    expect(isActionAllowed(hit, "stand")).toBe(true);
  });
});

describe("double", () => {
  it("draws exactly one card and ends the player turn", () => {
    const dealt = dealStacked(["6_spades", "9_clubs", "5_hearts", "8_diamonds", "Q_clubs"]);
    const doubled = playerDouble(dealt);

    expect(doubled.playerHand).toHaveLength(3);
    expect(doubled.playerActionsTaken).toEqual(["double"]);
    expect(doubled.phase).toBe("round-over");
    expect(doubled.result).toBe("win");
  });
});

describe("dealer play and outcomes", () => {
  it("player bust loses without the dealer drawing", () => {
    const dealt = dealStacked(["10_spades", "6_clubs", "6_hearts", "10_diamonds", "K_clubs"]);
    const busted = playerHit(dealt);

    expect(busted.result).toBe("lose");
    expect(busted.dealerHand).toHaveLength(2);
    expect(busted.dealerHoleHidden).toBe(false);
    expect(busted.message).toBe("Player busts with 26. Dealer wins.");
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

  it("dealer bust is a player win", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "2_hearts", "6_diamonds", "K_clubs"]);
    const stood = playerStand(dealt);
    expect(stood.result).toBe("win");
    expect(stood.message).toBe("Dealer busts with 26. Player wins.");
  });

  it("higher dealer total is a player loss", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "7_hearts", "9_diamonds"]);
    expect(playerStand(dealt).result).toBe("lose");
  });

  it("equal totals push", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "8_hearts", "8_diamonds"]);
    expect(playerStand(dealt).result).toBe("push");
  });

  it("reduceRoundState dispatches events to the matching transitions", () => {
    const dealt = dealStacked(["10_spades", "10_clubs", "8_hearts", "8_diamonds"]);
    expect(reduceRoundState(dealt, { type: "stand" })).toEqual(playerStand(dealt));
  });
});
