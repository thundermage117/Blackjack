import { describe, expect, it } from "vitest";
import {
  DEFAULT_TABLE_OPTIONS,
  createEmptyRoundState,
  dealRound,
  type TableOptions,
} from "@blackjack/game-core";
import { mvpS17StrategyTable } from "@blackjack/hint-engine";
import { chartCellFor } from "../apps/web/src/learning/chart";
import { countFor } from "../apps/web/src/learning/counting";
import { explainAction } from "../apps/web/src/learning/explanations";
import {
  LEVELS,
  LEVEL_IDS,
  rulesForLevel,
  tableOptionsForLevel,
} from "../apps/web/src/learning/levels";
import {
  emptyTrainerStats,
  grade,
  recommendPlay,
  recordDecision,
  topMistakes,
} from "../apps/web/src/learning/trainer";
import { buildPaddedShoe, cards } from "./helpers/fixtureCards";

const custom: TableOptions = { ...DEFAULT_TABLE_OPTIONS, dealerSoft17: "hit", surrender: true };

describe("levels", () => {
  it("unlock actions progressively", () => {
    const unlocked = LEVEL_IDS.map(
      (id) => Object.values(LEVELS[id].actions).filter(Boolean).length,
    );
    expect(unlocked).toEqual([0, 2, 4, 4]);
  });

  it("use the default table until the rules editor unlocks", () => {
    expect(tableOptionsForLevel(2, custom)).toEqual(DEFAULT_TABLE_OPTIONS);
    expect(tableOptionsForLevel(3, custom)).toEqual(custom);
  });

  it("switch locked actions off in the engine rules", () => {
    expect(rulesForLevel(1, custom)).toMatchObject({
      allowDouble: false,
      allowSplit: false,
      allowInsurance: false,
      allowSurrender: false,
      dealerSoft17: "stand",
    });
    expect(rulesForLevel(3, custom)).toMatchObject({
      allowDouble: true,
      allowSurrender: true,
      dealerSoft17: "hit",
    });
  });

  it("only the last level has no promotion", () => {
    expect(LEVEL_IDS.filter((id) => LEVELS[id].promotion === null)).toEqual([4]);
  });
});

function dealt(ids: string[]) {
  const shoe = buildPaddedShoe(cards(...ids));
  return dealRound({ ...createEmptyRoundState(), shoe });
}

describe("trainer", () => {
  const rules = rulesForLevel(2, DEFAULT_TABLE_OPTIONS);
  const all = { double: true, split: true, surrender: false };

  it("recommends a split for a pair of 8s and names the situation", () => {
    const rec = recommendPlay(
      dealt(["8_spades", "10_clubs", "8_hearts", "7_diamonds"]),
      rules,
      mvpS17StrategyTable,
      all,
    );
    expect(rec).toMatchObject({ action: "Split", situation: "pair of 8s vs 10" });
    expect(rec?.explanation).toContain("Always split 8s");
  });

  it("describes a pair by its total when splitting is unavailable", () => {
    const rec = recommendPlay(
      dealt(["8_spades", "10_clubs", "8_hearts", "7_diamonds"]),
      rules,
      mvpS17StrategyTable,
      { ...all, split: false },
    );
    expect(rec).toMatchObject({ action: "Hit", situation: "hard 16 vs 10" });
  });

  it("records mistakes and ranks the most frequent first", () => {
    let stats = emptyTrainerStats();
    const rec = { action: "Hit" as const, situation: "hard 16 vs 10", explanation: "" };
    const other = { action: "Stand" as const, situation: "hard 13 vs 2", explanation: "" };
    stats = recordDecision(stats, grade(rec, "Stand"));
    stats = recordDecision(stats, grade(rec, "Stand"));
    stats = recordDecision(stats, grade(other, "Hit"));
    stats = recordDecision(stats, grade(other, "Stand"));

    expect(stats).toMatchObject({ decisions: 4, correct: 1 });
    expect(topMistakes(stats).map((m) => [m.situation, m.count])).toEqual([
      ["hard 16 vs 10", 2],
      ["hard 13 vs 2", 1],
    ]);
  });
});

describe("explanations", () => {
  const ctx = {
    handKind: "hard" as const,
    dealerUpcard: "10" as const,
    pair: null,
    doubleFallback: false,
  };

  it("explain common plays in plain language", () => {
    expect(explainAction("Hit", { ...ctx, total: 16 })).toContain(
      "Standing on 16 loses more often",
    );
    expect(explainAction("Stand", { ...ctx, total: 13, dealerUpcard: "5" })).toContain("weak 5");
    expect(explainAction("Stand", { ...ctx, total: 18 })).toContain("risk of busting");
    expect(explainAction("Hit", { ...ctx, total: 12, dealerUpcard: "2" })).toContain("exception");
    expect(explainAction("Stand", { ...ctx, total: 20, pair: "10" })).toContain("Never split tens");
  });

  it("always start with a capital letter, with or without the double fallback", () => {
    const cases: Array<[Parameters<typeof explainAction>[0], Parameters<typeof explainAction>[1]]> =
      [
        ["Hit", { ...ctx, total: 9, dealerUpcard: "2" }],
        ["Hit", { ...ctx, total: 11, dealerUpcard: "A" }],
        ["Hit", { ...ctx, handKind: "soft", total: 17, dealerUpcard: "2" }],
        ["Stand", { ...ctx, handKind: "soft", total: 19, dealerUpcard: "6" }],
        ["Hit", { ...ctx, total: 10, dealerUpcard: "5", doubleFallback: true }],
        ["Stand", { ...ctx, handKind: "soft", total: 18, dealerUpcard: "4", doubleFallback: true }],
      ];
    for (const [action, context] of cases) {
      expect(explainAction(action, context)).toMatch(/^[A-Z0-9]/);
    }
    expect(
      explainAction("Hit", { ...ctx, total: 10, dealerUpcard: "5", doubleFallback: true }),
    ).toBe("Doubling isn't available, so you can't bust with one card from 10. Take one.");
  });
});

describe("countFor", () => {
  it("does not count the face-down hole card", () => {
    // Player 2,3 (+2), dealer upcard 4 (+1), hole 5 (+1, unseen).
    const round = dealt(["2_spades", "4_clubs", "3_hearts", "5_diamonds"]);
    expect(countFor(round).running).toBe(3);
  });
});

describe("chartCellFor", () => {
  const round = dealt(["8_spades", "10_clubs", "8_hearts", "7_diamonds"]);
  it("points at the pair row only when a split is possible", () => {
    expect(chartCellFor(round, true)).toEqual({ section: "pair", row: "8", upcard: "10" });
    expect(chartCellFor(round, false)).toEqual({ section: "hard", row: "16", upcard: "10" });
  });
});
