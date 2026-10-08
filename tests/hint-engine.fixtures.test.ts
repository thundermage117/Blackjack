import { describe, expect, it } from "vitest";
import { isPair, pairKey, scoreHand } from "@blackjack/game-core";
import {
  getHint,
  getInsuranceAdvice,
  mvpS17StrategyTable,
  normalizeDealerUpcard,
  strategyTableFor,
  type StrategyRules,
} from "@blackjack/hint-engine";
import hintFixtures from "./fixtures/hint-fixtures.json";
import { parseFixtureCard } from "./helpers/fixtureCards";

type HintFixture = {
  id: string;
  playerHand: string[];
  dealerUpcard: string;
  doubleAllowed: boolean;
  splitAllowed?: boolean;
  surrenderAllowed?: boolean;
  rules?: StrategyRules;
  expectedAction: "Hit" | "Stand" | "Double" | "Split" | "Surrender";
};

describe("hint-engine fixtures", () => {
  const fixtures = hintFixtures as HintFixture[];

  it.each(fixtures)("$id", (fixture) => {
    const playerHand = fixture.playerHand.map(parseFixtureCard);
    const dealerUpcard = parseFixtureCard(fixture.dealerUpcard);
    const playerScore = scoreHand(playerHand);
    const table = fixture.rules ? strategyTableFor(fixture.rules) : mvpS17StrategyTable;

    const result = getHint(
      {
        handKind: playerScore.isSoft ? "soft" : "hard",
        total: playerScore.bestTotal,
        dealerUpcard: normalizeDealerUpcard(dealerUpcard.rank),
        doubleAllowed: fixture.doubleAllowed,
        pair: isPair(playerHand) ? pairKey(playerHand[0]) : null,
        splitAllowed: fixture.splitAllowed ?? false,
        surrenderAllowed: fixture.surrenderAllowed ?? false,
      },
      table,
    );

    expect(result.action).toBe(fixture.expectedAction);
  });
});

describe("insurance advice", () => {
  it("declines insurance under basic strategy", () => {
    expect(getInsuranceAdvice().take).toBe(false);
    expect(getInsuranceAdvice(2.5).take).toBe(false);
  });

  it("takes insurance at a true count of +3 or more", () => {
    expect(getInsuranceAdvice(3).take).toBe(true);
  });
});
