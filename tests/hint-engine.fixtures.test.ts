import { describe, expect, it } from "vitest";
import hintFixtures from "./fixtures/hint-fixtures.json";
import { parseFixtureCard } from "./helpers/fixtureCards";
import { scoreHand } from "@blackjack/game-core";
import { getHint, mvpS17StrategyTable, normalizeDealerUpcard } from "@blackjack/hint-engine";

type HintFixture = {
  id: string;
  playerHand: string[];
  dealerUpcard: string;
  doubleAllowed: boolean;
  expectedAction: "Hit" | "Stand" | "Double";
};

describe("hint-engine fixtures", () => {
  const fixtures = hintFixtures as HintFixture[];

  it.each(fixtures)("$id", (fixture) => {
    const playerHand = fixture.playerHand.map(parseFixtureCard);
    const dealerUpcard = parseFixtureCard(fixture.dealerUpcard);
    const playerScore = scoreHand(playerHand);

    const result = getHint(
      {
        handKind: playerScore.isSoft ? "soft" : "hard",
        total: playerScore.bestTotal,
        dealerUpcard: normalizeDealerUpcard(dealerUpcard.rank),
        doubleAllowed: fixture.doubleAllowed,
      },
      mvpS17StrategyTable,
    );

    expect(result.action).toBe(fixture.expectedAction);
  });
});
