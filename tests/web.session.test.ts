import { describe, expect, it } from "vitest";
import { DEFAULT_TABLE_OPTIONS, createEmptyRoundState } from "@blackjack/game-core";
import {
  COUNT_CHECK_INTERVAL,
  STARTING_BANKROLL,
  canDeal,
  canPlayerAct,
  createSession,
  currentRecommendation,
  isCountCheckPending,
  isOutOfChips,
  isPromotionReady,
  sessionReducer,
  toPersisted,
  type SessionAction,
  type SessionState,
} from "../apps/web/src/state/session";
import { buildPaddedShoe, parseFixtureCard } from "./helpers/fixtureCards";

/** A session whose shoe deals the given cards in order: P, D-up, P, D-hole, then draws. */
function stacked(cards: string[], overrides: Partial<SessionState> = {}): SessionState {
  const base = createSession({ level: overrides.level ?? 2 });
  return {
    ...base,
    ...overrides,
    round: { ...createEmptyRoundState(), shoe: buildPaddedShoe(cards.map(parseFixtureCard)) },
  };
}

function run(state: SessionState, ...actions: SessionAction[]): SessionState {
  return actions.reduce(sessionReducer, state);
}

function revealAll(state: SessionState): SessionState {
  let current = state;
  while (current.dealerReveal) current = sessionReducer(current, { type: "reveal-step" });
  return current;
}

describe("session basics", () => {
  it("starts at level 1 with the default bankroll", () => {
    const session = createSession();
    expect(session.level).toBe(1);
    expect(session.bankroll).toBe(STARTING_BANKROLL);
    expect(session.rules.allowDouble).toBe(false);
  });

  it("round-trips through the persisted shape", () => {
    const played = revealAll(
      run(stacked(["10_spades", "9_clubs", "8_hearts", "7_diamonds"]), { type: "deal" }),
    );
    const restored = createSession(toPersisted(played));
    expect(restored.round).toEqual(played.round);
    expect(restored.level).toBe(played.level);
    expect(restored.trainer).toEqual(played.trainer);
  });

  it("settles a natural blackjack at 3:2 immediately on deal", () => {
    const dealt = run(stacked(["A_spades", "9_clubs", "K_hearts", "7_diamonds"]), {
      type: "deal",
    });
    expect(dealt.dealerReveal).toBeNull();
    expect(dealt.bankroll).toBe(STARTING_BANKROLL + 15);
    expect(dealt.stats).toMatchObject({ wins: 1, blackjacks: 1 });
  });

  it("reveals the dealer hand step by step before settling", () => {
    const stood = run(
      stacked(["10_spades", "2_clubs", "8_hearts", "3_diamonds", "4_clubs", "9_spades"]),
      { type: "deal" },
      { type: "stand" },
    );
    expect(stood.dealerReveal).toEqual({ visibleCount: 1 });
    expect(stood.stats.pushes).toBe(0);
    expect(canDeal(stood)).toBe(false);

    const done = revealAll(stood);
    expect(done.round.playerHands[0].result).toBe("push");
    expect(done.stats.pushes).toBe(1);
    expect(canDeal(done)).toBe(true);
  });
});

describe("betting", () => {
  it("doubles the stake when the player doubles", () => {
    const doubled = revealAll(
      run(
        stacked(["6_spades", "9_clubs", "5_hearts", "8_diamonds", "Q_clubs"], { bet: 50 }),
        { type: "deal" },
        { type: "double" },
      ),
    );
    expect(doubled.lastSettlement).toEqual({ stake: 100, net: 100 });
    expect(doubled.bankroll).toBe(STARTING_BANKROLL + 100);
  });

  it("settles each split hand separately", () => {
    // 8,8 vs 6: hand 1 = 8,3 → double → 8,3,10 (21); hand 2 = 8,K (18). Dealer 6,10,9 busts.
    const split = revealAll(
      run(
        stacked(
          [
            "8_spades",
            "6_clubs",
            "8_hearts",
            "10_diamonds",
            "3_clubs",
            "10_clubs",
            "K_hearts",
            "9_spades",
          ],
          {
            bet: 10,
          },
        ),
        { type: "deal" },
        { type: "split" },
        { type: "double" },
        { type: "stand" },
      ),
    );
    expect(split.round.playerHands.map((h) => h.result)).toEqual(["win", "win"]);
    expect(split.lastSettlement).toEqual({ stake: 30, net: 30 });
    expect(split.stats.wins).toBe(2);
  });

  it("blocks double and split when the bankroll cannot cover another bet", () => {
    const dealt = run(
      stacked(["8_spades", "9_clubs", "8_hearts", "7_diamonds"], { bankroll: 150, bet: 100 }),
      {
        type: "deal",
      },
    );
    expect(canPlayerAct(dealt, { type: "double" })).toBe(false);
    expect(canPlayerAct(dealt, { type: "split" })).toBe(false);
    expect(run(dealt, { type: "split" })).toBe(dealt);
  });

  it("reports out-of-chips and reset restores the bankroll but keeps the level", () => {
    const broke = stacked([], { bankroll: 5, level: 3 });
    expect(isOutOfChips(broke)).toBe(true);
    const reset = run(broke, { type: "reset" });
    expect(reset.bankroll).toBe(STARTING_BANKROLL);
    expect(reset.level).toBe(3);
  });
});

describe("levels and table rules", () => {
  it("level 1 locks double and split", () => {
    const dealt = run(stacked(["8_spades", "9_clubs", "8_hearts", "7_diamonds"], { level: 1 }), {
      type: "deal",
    });
    expect(canPlayerAct(dealt, { type: "double" })).toBe(false);
    expect(canPlayerAct(dealt, { type: "split" })).toBe(false);
  });

  it("insurance is only offered from level 3", () => {
    const cards = ["10_spades", "A_clubs", "9_hearts", "6_diamonds"];
    expect(run(stacked(cards, { level: 2 }), { type: "deal" }).round.phase).toBe("player-turn");
    expect(run(stacked(cards, { level: 3 }), { type: "deal" }).round.phase).toBe("insurance");
  });

  it("ignores table rule changes below level 3", () => {
    const session = createSession({ level: 2 });
    const changed = run(session, {
      type: "set-table-options",
      options: { ...DEFAULT_TABLE_OPTIONS, dealerSoft17: "hit" },
    });
    expect(changed).toBe(session);
  });

  it("applies table rules at level 3 with a fresh shoe and matching strategy", () => {
    const session = createSession({ level: 3 });
    const changed = run(session, {
      type: "set-table-options",
      options: { ...DEFAULT_TABLE_OPTIONS, deckCount: 8, dealerSoft17: "hit", surrender: true },
    });
    expect(changed.rules.dealerSoft17).toBe("hit");
    expect(changed.rules.allowSurrender).toBe(true);
    expect(changed.strategy.metadata.name).toBe("multideck-h17-das-ls");
    expect(changed.round.shoe).toHaveLength(8 * 52);
  });

  it("dropping back below level 3 restores the default table", () => {
    const custom = createSession({
      level: 3,
      tableOptions: { ...DEFAULT_TABLE_OPTIONS, dealerSoft17: "hit" },
    });
    const lowered = run(custom, { type: "set-level", level: 2 });
    expect(lowered.rules.dealerSoft17).toBe("stand");
    expect(lowered.tableOptions.dealerSoft17).toBe("hit"); // remembered for later
  });

  it("does not change level mid-hand", () => {
    const dealt = run(stacked(["10_spades", "9_clubs", "6_hearts", "7_diamonds"]), {
      type: "deal",
    });
    expect(run(dealt, { type: "set-level", level: 3 })).toBe(dealt);
  });
});

describe("trainer", () => {
  it("grades a correct decision", () => {
    const stood = run(
      stacked(["10_spades", "6_clubs", "3_hearts", "8_diamonds"]),
      { type: "deal" },
      { type: "stand" },
    );
    expect(stood.feedback).toMatchObject({
      correct: true,
      action: "Stand",
      situation: "hard 13 vs 6",
    });
    expect(stood.trainer).toMatchObject({ decisions: 1, correct: 1, levelDecisions: 1 });
  });

  it("records a mistake with the right play", () => {
    const stood = run(
      stacked(["10_spades", "10_clubs", "6_hearts", "8_diamonds"]),
      { type: "deal" },
      { type: "stand" },
    );
    expect(stood.feedback).toMatchObject({ correct: false, action: "Hit", chosen: "Stand" });
    expect(stood.trainer.mistakes["hard 16 vs 10"]).toEqual({ count: 1, recommended: "Hit" });
  });

  it("grades insurance: basic strategy declines it", () => {
    const offered = run(stacked(["10_spades", "A_clubs", "9_hearts", "6_diamonds"], { level: 3 }), {
      type: "deal",
    });
    expect(currentRecommendation(offered)?.action).toBe("No insurance");
    const taken = run(offered, { type: "insurance", take: true });
    expect(taken.feedback).toMatchObject({ correct: false, action: "No insurance" });
  });

  it("suggests a level up after enough accurate decisions, and can be snoozed", () => {
    const session = createSession({ level: 1 });
    const ready: SessionState = {
      ...session,
      trainer: { ...session.trainer, levelDecisions: 25, levelCorrect: 24 },
    };
    expect(isPromotionReady(ready)).toBe(true);
    const snoozed = run(ready, { type: "snooze-promotion" });
    expect(isPromotionReady(snoozed)).toBe(false);

    const notAccurate: SessionState = {
      ...session,
      trainer: { ...session.trainer, levelDecisions: 25, levelCorrect: 20 },
    };
    expect(isPromotionReady(notAccurate)).toBe(false);
  });

  it("resets level progress on a level change", () => {
    const session = createSession({ level: 1 });
    const progressed: SessionState = {
      ...session,
      trainer: {
        ...session.trainer,
        decisions: 30,
        correct: 29,
        levelDecisions: 30,
        levelCorrect: 29,
      },
    };
    const next = run(progressed, { type: "set-level", level: 2 });
    expect(next.trainer).toMatchObject({ decisions: 30, levelDecisions: 0, levelCorrect: 0 });
  });
});

describe("count checks", () => {
  it(`quizzes the running count every ${COUNT_CHECK_INTERVAL} hands at the counting level`, () => {
    // Two low cards for the player, two for the dealer: every hand is a quick stand.
    let session: SessionState = {
      ...createSession({ level: 4 }),
      round: {
        ...createEmptyRoundState(),
        shoe: buildPaddedShoe(
          Array.from({ length: COUNT_CHECK_INTERVAL }, () => [
            "10_spades",
            "10_clubs",
            "9_hearts",
            "9_diamonds",
          ])
            .flat()
            .map(parseFixtureCard),
        ),
      },
    };
    for (let hand = 0; hand < COUNT_CHECK_INTERVAL; hand += 1) {
      expect(isCountCheckPending(session)).toBe(false);
      session = revealAll(run(session, { type: "deal" }, { type: "stand" }));
    }

    expect(isCountCheckPending(session)).toBe(true);
    expect(session.countCheck?.expected).toBe(-2 * COUNT_CHECK_INTERVAL);
    expect(canDeal(session)).toBe(false);

    const answered = run(session, { type: "answer-count-check", answer: -10 });
    expect(answered.trainer).toMatchObject({ countChecks: 1, countChecksCorrect: 1 });
    expect(canDeal(answered)).toBe(true);
  });

  it("does not quiz below the counting level", () => {
    let session = stacked(["10_spades", "10_clubs", "9_hearts", "9_diamonds"], { level: 3 });
    session = { ...session, handsSinceCountCheck: COUNT_CHECK_INTERVAL };
    const done = revealAll(run(session, { type: "deal" }, { type: "stand" }));
    expect(done.countCheck).toBeNull();
  });
});
