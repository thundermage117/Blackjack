import { describe, expect, it } from "vitest";
import type { Card } from "@blackjack/game-core";
import { cuesForTableChange } from "../apps/web/src/audio/cues";
import type { TableView } from "../apps/web/src/state/tableView";
import { parseFixtureCard } from "./helpers/fixtureCards";

const cards = (...ids: string[]): Card[] => ids.map(parseFixtureCard);

function view(overrides: Partial<TableView>): TableView {
  return {
    handNumber: 1,
    playerCards: [],
    dealerCards: [],
    dealerHoleHidden: false,
    result: null,
    shoeCardsRemaining: 300,
    ...overrides,
  };
}

const idle = view({ handNumber: 0, shoeCardsRemaining: 312 });
const dealt = view({
  playerCards: cards("10_spades", "6_hearts"),
  dealerCards: cards("9_clubs", "7_diamonds"),
  dealerHoleHidden: true,
  shoeCardsRemaining: 308,
});

describe("cuesForTableChange", () => {
  it("plays four deal snaps for the opening deal", () => {
    expect(cuesForTableChange(idle, dealt)).toEqual(["deal", "deal", "deal", "deal"]);
  });

  it("plays one deal snap for a hit", () => {
    const hit = { ...dealt, playerCards: cards("10_spades", "6_hearts", "2_clubs") };
    expect(cuesForTableChange(dealt, hit)).toEqual(["deal"]);
  });

  it("plays a flip when the dealer hole card is revealed", () => {
    expect(cuesForTableChange(dealt, { ...dealt, dealerHoleHidden: false })).toEqual(["flip"]);
  });

  it("plays deal, flip, then lose for a player bust", () => {
    const bust = {
      ...dealt,
      playerCards: cards("10_spades", "6_hearts", "K_clubs"),
      dealerHoleHidden: false,
      result: "lose" as const,
    };
    expect(cuesForTableChange(dealt, bust)).toEqual(["deal", "flip", "lose"]);
  });

  it("plays the outcome only once, when the result first appears", () => {
    const won = { ...dealt, dealerHoleHidden: false, result: "win" as const };
    expect(cuesForTableChange(dealt, won)).toEqual(["flip", "win"]);
    expect(cuesForTableChange(won, won)).toEqual([]);
  });

  it("treats a new hand as fresh cards even when the previous hand had more", () => {
    const finished = {
      ...dealt,
      playerCards: cards("2_spades", "3_hearts", "4_clubs"),
      dealerHoleHidden: false,
      result: "lose" as const,
    };
    const next = { ...dealt, handNumber: 2, shoeCardsRemaining: 300 };
    expect(cuesForTableChange(finished, next)).toEqual(["deal", "deal", "deal", "deal"]);
  });

  it("plays a shuffle before the deal when the shoe was replenished", () => {
    const reshuffled = { ...dealt, handNumber: 2, shoeCardsRemaining: 308 };
    const lowShoe = { ...dealt, shoeCardsRemaining: 12, result: "push" as const };
    expect(cuesForTableChange(lowShoe, reshuffled)[0]).toBe("shuffle");
  });

  it("plays a blackjack fanfare for a natural dealt in the same update", () => {
    const natural = {
      ...dealt,
      playerCards: cards("A_spades", "K_hearts"),
      dealerHoleHidden: false,
      result: "blackjack_win" as const,
    };
    expect(cuesForTableChange(idle, natural)).toEqual([
      "deal",
      "deal",
      "deal",
      "deal",
      "blackjack",
    ]);
  });
});
