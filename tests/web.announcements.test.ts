import { describe, expect, it } from "vitest";
import type { Card, RoundResult } from "@blackjack/game-core";
import { announcementForTableChange } from "../apps/web/src/state/announcements";
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
    dealerHoleHidden: true,
    isSettled: false,
    shoeCardsRemaining: 300,
    count: { running: 0, true: 0, decksRemaining: 6 },
    ...overrides,
  };
}

const idle = view({ handNumber: 0, phase: "idle", dealerHoleHidden: false });
const dealt = view({
  playerHands: [hand(cards("10_spades", "6_hearts"))],
  dealerCards: cards("9_clubs", "7_diamonds"),
});

describe("announcementForTableChange", () => {
  it("announces the opening deal without revealing the hole card", () => {
    expect(announcementForTableChange(idle, dealt)).toBe(
      "You have 10 of spades and 6 of hearts, 16. Dealer shows 9 of clubs.",
    );
  });

  it("announces a drawn card and the new total", () => {
    const hit = { ...dealt, playerHands: [hand(cards("10_spades", "6_hearts", "Q_clubs"))] };
    expect(announcementForTableChange(dealt, hit)).toBe("You: Queen of clubs. Total 26.");
  });

  it("announces the dealer reveal and the result", () => {
    const done = view({
      ...dealt,
      phase: "round-over",
      isSettled: true,
      dealerHoleHidden: false,
      dealerCards: cards("9_clubs", "7_diamonds", "5_hearts"),
      playerHands: [hand(cards("10_spades", "9_hearts"), "lose")],
    });
    const before = { ...dealt, playerHands: [hand(cards("10_spades", "9_hearts"))] };
    expect(announcementForTableChange(before, done)).toBe(
      "Dealer turns over 7 of diamonds. Dealer draws 5 of hearts. Dealer has 21. Lose.",
    );
  });

  it("labels split hands", () => {
    const before = { ...dealt, playerHands: [hand(cards("8_spades", "8_hearts"))] };
    const split = {
      ...dealt,
      playerHands: [hand(cards("8_spades", "3_clubs")), hand(cards("8_hearts"))],
    };
    expect(announcementForTableChange(before, split)).toBe(
      "Split into 2 hands. Hand 1: 3 of clubs. Total 11.",
    );
  });

  it("says nothing when nothing changed", () => {
    expect(announcementForTableChange(dealt, dealt)).toBeNull();
  });
});
