import { describe, expect, it } from "vitest";
import { DEFAULT_MVP_RULES, hasDoubled, settleWager } from "@blackjack/game-core";

describe("settleWager", () => {
  it("pays blackjack at 3:2, not 1:1", () => {
    expect(settleWager("blackjack_win", 10, false, DEFAULT_MVP_RULES)).toEqual({
      stake: 10,
      net: 15,
    });
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

  it("doubles the stake for a doubled win and a doubled loss", () => {
    expect(settleWager("win", 10, true, DEFAULT_MVP_RULES)).toEqual({ stake: 20, net: 20 });
    expect(settleWager("lose", 10, true, DEFAULT_MVP_RULES)).toEqual({ stake: 20, net: -20 });
  });

  it("uses the payout ratio from the rules", () => {
    expect(settleWager("blackjack_win", 10, false, { blackjackPayout: 1.2 }).net).toBe(12);
  });

  it("rejects negative or non-finite bets", () => {
    expect(() => settleWager("win", -1, false, DEFAULT_MVP_RULES)).toThrow("Invalid bet");
    expect(() => settleWager("win", Number.NaN, false, DEFAULT_MVP_RULES)).toThrow("Invalid bet");
  });
});

describe("hasDoubled", () => {
  it("detects a double in the action log", () => {
    expect(hasDoubled({ playerActionsTaken: ["double"] })).toBe(true);
    expect(hasDoubled({ playerActionsTaken: ["hit", "stand"] })).toBe(false);
  });
});
