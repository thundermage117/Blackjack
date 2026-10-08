import { describe, expect, it } from "vitest";
import type { Card, RoundResult } from "@blackjack/game-core";
import { cuesForTableChange, outcomeCue } from "../apps/web/src/audio/cues";
import type { PlayerHandView, TableView } from "../apps/web/src/state/tableView";
import { cards } from "./helpers/fixtureCards";

function hand(handCards: Card[], result: RoundResult | null = null): PlayerHandView {
  return { cards: handCards, status: "playing", isActive: true, doubled: false, result };
}

function view(overrides: Partial<TableView>): TableView {
  return {
    handNumber: 1,
    phase: "player-turn",
    playerHands: [],
    dealerCards: [],
    dealerHoleHidden: false,
    isSettled: false,
    shoeCardsRemaining: 300,
    count: { running: 0, true: 0, decksRemaining: 6 },
    ...overrides,
  };
}

const idle = view({ handNumber: 0, phase: "idle", shoeCardsRemaining: 312 });
const dealt = view({
  playerHands: [hand(cards("10_spades", "6_hearts"))],
  dealerCards: cards("9_clubs", "7_diamonds"),
  dealerHoleHidden: true,
  shoeCardsRemaining: 308,
});

function settled(base: TableView, results: RoundResult[], handsCards?: Card[][]): TableView {
  return {
    ...base,
    phase: "round-over",
    isSettled: true,
    dealerHoleHidden: false,
    playerHands: results.map((result, i) =>
      hand(handsCards?.[i] ?? base.playerHands[i]?.cards ?? [], result),
    ),
  };
}

describe("cuesForTableChange", () => {
  it("plays four deal snaps for the opening deal", () => {
    expect(cuesForTableChange(idle, dealt)).toEqual(["deal", "deal", "deal", "deal"]);
  });

  it("plays one deal snap for a hit", () => {
    const hit = { ...dealt, playerHands: [hand(cards("10_spades", "6_hearts", "2_clubs"))] };
    expect(cuesForTableChange(dealt, hit)).toEqual(["deal"]);
  });

  it("plays one snap when a split hand receives its card", () => {
    const split = {
      ...dealt,
      playerHands: [hand(cards("8_spades", "3_clubs")), hand(cards("8_hearts"))],
    };
    const before = { ...dealt, playerHands: [hand(cards("8_spades", "8_hearts"))] };
    expect(cuesForTableChange(before, split)).toEqual(["deal"]);
  });

  it("plays a flip when the dealer hole card is revealed", () => {
    expect(cuesForTableChange(dealt, { ...dealt, dealerHoleHidden: false })).toEqual(["flip"]);
  });

  it("plays deal, flip, then lose for a player bust", () => {
    const bust = settled(dealt, ["lose"], [cards("10_spades", "6_hearts", "K_clubs")]);
    expect(cuesForTableChange(dealt, bust)).toEqual(["deal", "flip", "lose"]);
  });

  it("plays the outcome only once, when the round settles", () => {
    const won = settled(dealt, ["win"]);
    expect(cuesForTableChange(dealt, won)).toEqual(["flip", "win"]);
    expect(cuesForTableChange(won, won)).toEqual([]);
  });

  it("plays a shuffle before the deal when the shoe was replenished", () => {
    const lowShoe = settled({ ...dealt, shoeCardsRemaining: 12 }, ["push"]);
    const reshuffled = { ...dealt, handNumber: 2, shoeCardsRemaining: 308 };
    expect(cuesForTableChange(lowShoe, reshuffled)[0]).toBe("shuffle");
  });

  it("plays a blackjack fanfare for a natural dealt in the same update", () => {
    const natural = settled({ ...dealt }, ["blackjack_win"], [cards("A_spades", "K_hearts")]);
    expect(cuesForTableChange(idle, natural)).toEqual([
      "deal",
      "deal",
      "deal",
      "deal",
      "blackjack",
    ]);
  });
});

describe("outcomeCue", () => {
  it("summarises split hands by majority", () => {
    expect(outcomeCue(["win", "win", "lose"])).toBe("win");
    expect(outcomeCue(["win", "lose"])).toBe("push");
    expect(outcomeCue(["lose", "surrender"])).toBe("lose");
    expect(outcomeCue(["lose", "blackjack_win"])).toBe("blackjack");
    expect(outcomeCue([])).toBeNull();
  });
});
