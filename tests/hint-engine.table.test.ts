import { describe, expect, it } from "vitest";
import { DEFAULT_MVP_RULES } from "@blackjack/game-core";
import { DEALER_UPCARD_KEYS, isStrategyAction, mvpS17StrategyTable } from "@blackjack/hint-engine";

const HARD_TOTALS = Array.from({ length: 18 }, (_, i) => String(i + 4)); // 4..21
const SOFT_TOTALS = Array.from({ length: 10 }, (_, i) => String(i + 12)); // 12..21

describe("mvpS17StrategyTable", () => {
  it("matches the engine ruleset", () => {
    expect(mvpS17StrategyTable.metadata.dealerSoft17).toBe(DEFAULT_MVP_RULES.dealerSoft17);
    expect(mvpS17StrategyTable.metadata.deckCount).toBe(DEFAULT_MVP_RULES.deckCount);
  });

  it.each([
    ["hard", HARD_TOTALS],
    ["soft", SOFT_TOTALS],
  ] as const)("has a complete %s section", (kind, totals) => {
    const section = mvpS17StrategyTable[kind];
    expect(Object.keys(section).sort()).toEqual([...totals].sort());

    for (const total of totals) {
      const row = section[total];
      expect(Object.keys(row).sort(), `${kind}:${total}`).toEqual([...DEALER_UPCARD_KEYS].sort());
      for (const action of Object.values(row)) {
        expect(isStrategyAction(action), `${kind}:${total}`).toBe(true);
      }
    }
  });

  it("always stands on hard 17 and above", () => {
    for (const total of ["17", "18", "19", "20", "21"]) {
      expect(new Set(Object.values(mvpS17StrategyTable.hard[total]))).toEqual(new Set(["S"]));
    }
  });
});
