import { describe, expect, it } from "vitest";
import {
  DEFAULT_MVP_RULES,
  hasDoubled,
  settleRound,
  settleWager,
  stakeAtRisk,
  type PlayerHand,
  type RoundResult,
} from "@blackjack/game-core";
import { cards } from "./helpers/fixtureCards";

describe("settleWager", () => {
  it("pays blackjack at 3:2, not 1:1", () => {
    expect(settleWager("blackjack_win", 10, false, DEFAULT_MVP_RULES)).toEqual({
      stake: 10,
      net: 15,
    });
  });

  it("pays blackjack at 6:5 on a 6:5 table", () => {
    expect(settleWager("blackjack_win", 10, false, { blackjackPayout: 1.2 }).net).toBe(12);
  });

  it("pays an ordinary win at 1:1", () => {
    expect(settleWager("win", 25, false, DEFAULT_MVP_RULES).net).toBe(25);
  });

  it("loses the stake on a loss", () => {
    expect(settleWager("lose", 25, false, DEFAULT_MVP_RULES).net).toBe(-25);
  });

  it("returns the original bet on a push", () => {
    expect(settleWager("push", 25, false, DEFAULT_MVP_RULES).net).toBe(0);
  });

  it("loses half the bet on a surrender", () => {
    expect(settleWager("surrender", 50, false, DEFAULT_MVP_RULES).net).toBe(-25);
  });

  it("doubles the stake for a doubled win and a doubled loss", () => {
    expect(settleWager("win", 10, true, DEFAULT_MVP_RULES)).toEqual({ stake: 20, net: 20 });
    expect(settleWager("lose", 10, true, DEFAULT_MVP_RULES)).toEqual({ stake: 20, net: -20 });
  });

  it("rejects negative or non-finite bets", () => {
    expect(() => settleWager("win", -1, false, DEFAULT_MVP_RULES)).toThrow("Invalid bet");
    expect(() => settleWager("win", Number.NaN, false, DEFAULT_MVP_RULES)).toThrow("Invalid bet");
  });
});

function hand(result: RoundResult, doubled = false): PlayerHand {
  return {
    cards: cards("8_spades", "3_hearts"),
    actions: doubled ? ["double"] : ["stand"],
    status: doubled ? "doubled" : "stood",
    fromSplit: true,
    result,
  };
}

describe("settleRound", () => {
  const noBlackjack = cards("10_clubs", "7_hearts");

  it("settles each split hand against the base bet", () => {
    const round = {
      phase: "round-over" as const,
      playerHands: [hand("win", true), hand("lose"), hand("push")],
      insurance: "none" as const,
      dealerHand: noBlackjack,
    };
    expect(settleRound(round, 10, DEFAULT_MVP_RULES)).toEqual({ stake: 40, net: 10 });
  });

  it("pays insurance 2:1 when the dealer has blackjack", () => {
    const round = {
      phase: "round-over" as const,
      playerHands: [hand("lose")],
      insurance: "taken" as const,
      dealerHand: cards("A_clubs", "K_hearts"),
    };
    // Main bet -20, insurance (10) wins 20: net zero, which is why it is "even money".
    expect(settleRound(round, 20, DEFAULT_MVP_RULES)).toEqual({ stake: 30, net: 0 });
  });

  it("loses the insurance bet when the dealer has no blackjack", () => {
    const round = {
      phase: "round-over" as const,
      playerHands: [hand("win")],
      insurance: "taken" as const,
      dealerHand: noBlackjack,
    };
    expect(settleRound(round, 20, DEFAULT_MVP_RULES)).toEqual({ stake: 30, net: 10 });
  });

  it("refuses to settle an unfinished round", () => {
    const round = {
      phase: "player-turn" as const,
      playerHands: [hand("win")],
      insurance: "none" as const,
      dealerHand: noBlackjack,
    };
    expect(() => settleRound(round, 10, DEFAULT_MVP_RULES)).toThrow("not finished");
  });
});

describe("stakeAtRisk", () => {
  it("counts doubled hands twice and insurance at half the bet", () => {
    expect(
      stakeAtRisk({ playerHands: [hand("win", true), hand("win")], insurance: "taken" }, 10),
    ).toBe(35);
  });
});

describe("hasDoubled", () => {
  it("detects a double in the action log", () => {
    expect(hasDoubled({ actions: ["double"] })).toBe(true);
    expect(hasDoubled({ actions: ["hit", "stand"] })).toBe(false);
  });
});
