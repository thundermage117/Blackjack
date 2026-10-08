import { describe, expect, it } from "vitest";
import { DEFAULT_MVP_RULES } from "@blackjack/game-core";
import {
  DEALER_UPCARD_KEYS,
  isStrategyAction,
  mvpS17StrategyTable,
  strategyTableFor,
  type StrategyRules,
} from "@blackjack/hint-engine";

const HARD_TOTALS = Array.from({ length: 18 }, (_, i) => String(i + 4)); // 4..21
const SOFT_TOTALS = Array.from({ length: 10 }, (_, i) => String(i + 12)); // 12..21
const PAIRS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

const VARIANTS: StrategyRules[] = [];
for (const dealerSoft17 of ["stand", "hit"] as const) {
  for (const doubleAfterSplit of [true, false]) {
    for (const surrender of [true, false]) {
      VARIANTS.push({ dealerSoft17, doubleAfterSplit, surrender });
    }
  }
}

const sorted = (keys: string[]) => [...keys].sort();

describe("strategy tables", () => {
  it("default table matches the default engine ruleset", () => {
    expect(mvpS17StrategyTable.metadata).toMatchObject({
      dealerSoft17: DEFAULT_MVP_RULES.dealerSoft17,
      doubleAfterSplit: DEFAULT_MVP_RULES.doubleAfterSplit,
      surrender: DEFAULT_MVP_RULES.allowSurrender,
    });
  });

  it.each(VARIANTS)("is complete for %o", (rules) => {
    const table = strategyTableFor(rules);

    for (const [kind, totals] of [
      ["hard", HARD_TOTALS],
      ["soft", SOFT_TOTALS],
    ] as const) {
      expect(sorted(Object.keys(table[kind]))).toEqual(sorted(totals));
      for (const total of totals) {
        const row = table[kind][total];
        expect(sorted(Object.keys(row)), `${kind}:${total}`).toEqual(sorted(DEALER_UPCARD_KEYS));
        Object.values(row).forEach((action) => expect(isStrategyAction(action)).toBe(true));
      }
    }

    expect(sorted(Object.keys(table.pair))).toEqual(sorted(PAIRS));
    expect(Object.keys(table.surrender).length > 0).toBe(rules.surrender);
  });

  it("always stands on hard 17+ and splits aces and eights (without surrender)", () => {
    for (const rules of VARIANTS) {
      const table = strategyTableFor(rules);
      for (const total of ["17", "18", "19", "20", "21"]) {
        expect(new Set(Object.values(table.hard[total]))).toEqual(new Set(["S"]));
      }
      expect(Object.values(table.pair.A).every(Boolean)).toBe(true);
      expect(Object.values(table.pair["10"]).some(Boolean)).toBe(false);
    }
  });

  it("only changes the documented cells between S17 and H17", () => {
    const s17 = strategyTableFor({
      dealerSoft17: "stand",
      doubleAfterSplit: true,
      surrender: false,
    });
    const h17 = strategyTableFor({ dealerSoft17: "hit", doubleAfterSplit: true, surrender: false });
    const diffs: string[] = [];
    for (const kind of ["hard", "soft"] as const) {
      for (const total of Object.keys(s17[kind])) {
        for (const up of DEALER_UPCARD_KEYS) {
          if (s17[kind][total][up] !== h17[kind][total][up]) diffs.push(`${kind}:${total}v${up}`);
        }
      }
    }
    expect(diffs.sort()).toEqual(["hard:11vA", "soft:18v2", "soft:19v6"]);
  });
});
