import { describe, expect, it } from "vitest";
import { summarizeDealerHand } from "../apps/web/src/state/tableView";
import { cards } from "./helpers/fixtureCards";

describe("dealer summary", () => {
  it("names an Ace upcard instead of showing 11", () => {
    expect(summarizeDealerHand(cards("A_spades", "K_hearts"), true)).toEqual({
      totalLabel: "A",
      detailLabel: "Showing",
    });
  });

  it("shows the value of any other upcard", () => {
    expect(summarizeDealerHand(cards("K_spades", "5_hearts"), true).totalLabel).toBe("10");
  });
});
