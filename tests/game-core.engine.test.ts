import { describe, expect, it } from "vitest";
import engineFixtures from "./fixtures/engine-acceptance.json";
import { buildPaddedShoe, parseFixtureCard } from "./helpers/fixtureCards";
import {
  createEmptyRoundState,
  dealRound,
  isActionAllowed,
  scoreHand,
  shouldDealerDraw,
  type RoundState,
} from "../packages/game-core/src";

type EngineFixture = {
  id: string;
  playerHand?: string[];
  dealerHand?: string[];
  playerActionsTaken?: Array<"hit" | "stand" | "double">;
  expected: Record<string, unknown>;
};

function asRoundState(partial: Partial<RoundState>): RoundState {
  return {
    ...createEmptyRoundState(),
    phase: "player-turn",
    shoe: buildPaddedShoe([]),
    dealerHoleHidden: true,
    ...partial,
  };
}

describe("game-core engine fixtures", () => {
  const fixtures = engineFixtures as EngineFixture[];

  it.each(
    fixtures.filter((f) => f.id.startsWith("natural-blackjack")),
  )("$id", (fixture) => {
    const playerHand = (fixture.playerHand ?? []).map(parseFixtureCard);
    const dealerHand = (fixture.dealerHand ?? []).map(parseFixtureCard);
    expect(playerHand).toHaveLength(2);
    expect(dealerHand).toHaveLength(2);

    const shoe = buildPaddedShoe([playerHand[0], dealerHand[0], playerHand[1], dealerHand[1]]);
    const dealt = dealRound({ ...createEmptyRoundState(), shoe });

    expect(scoreHand(dealt.playerHand).isBlackjack).toBe(fixture.expected.playerBlackjack);
    expect(scoreHand(dealt.dealerHand).isBlackjack).toBe(fixture.expected.dealerBlackjack);
    expect(dealt.result).toBe(fixture.expected.result);
    expect(dealt.phase).toBe("round-over");
  });

  it.each(
    fixtures.filter((f) => f.id === "soft-total-reduces-ace-on-hit"),
  )("$id", (fixture) => {
    const playerHand = (fixture.playerHand ?? []).map(parseFixtureCard);
    const score = scoreHand(playerHand);

    expect(score.bestTotal).toBe(fixture.expected.bestTotal);
    expect(score.isSoft).toBe(fixture.expected.isSoft);
    expect(score.isBust).toBe(fixture.expected.isBust);
  });

  it.each(
    fixtures.filter((f) => f.id === "double-only-on-first-two-cards"),
  )("$id", (fixture) => {
    const playerHand = (fixture.playerHand ?? []).map(parseFixtureCard);
    const state = asRoundState({
      playerHand,
      dealerHand: [parseFixtureCard("9_clubs"), parseFixtureCard("7_hearts")],
      playerActionsTaken: fixture.playerActionsTaken ?? [],
    });

    expect(isActionAllowed(state, "double")).toBe(fixture.expected.doubleAllowed);
  });

  it.each(
    fixtures.filter((f) => f.id.startsWith("dealer-")),
  )("$id", (fixture) => {
    const dealerHand = (fixture.dealerHand ?? []).map(parseFixtureCard);
    const score = scoreHand(dealerHand);

    expect(score.bestTotal).toBe(fixture.expected.dealerTotal);
    expect(score.isSoft).toBe(fixture.expected.dealerSoft);
    expect(shouldDealerDraw(dealerHand, "stand")).toBe(fixture.expected.dealerShouldDraw);
  });
});
