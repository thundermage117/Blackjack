import { describe, expect, it } from "vitest";
import { createEmptyRoundState } from "@blackjack/game-core";
import {
  STARTING_BANKROLL,
  canDeal,
  canPlayerAct,
  createSession,
  isOutOfChips,
  sessionReducer,
  type SessionAction,
  type SessionState,
} from "../apps/web/src/state/session";
import { buildPaddedShoe, parseFixtureCard } from "./helpers/fixtureCards";

/** A session whose shoe deals the given cards in order: P, D-up, P, D-hole, then draws. */
function stackedSession(cards: string[], overrides: Partial<SessionState> = {}): SessionState {
  const session = createSession();
  return {
    ...session,
    round: { ...createEmptyRoundState(), shoe: buildPaddedShoe(cards.map(parseFixtureCard)) },
    ...overrides,
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

describe("session reducer", () => {
  it("starts with the default bankroll and empty stats", () => {
    const session = createSession();
    expect(session.bankroll).toBe(STARTING_BANKROLL);
    expect(session.stats).toEqual({ wins: 0, losses: 0, pushes: 0, blackjacks: 0 });
  });

  it("restores persisted fields", () => {
    const stats = { wins: 3, losses: 1, pushes: 0, blackjacks: 1 };
    const session = createSession({ bankroll: 640, bet: 50, stats });
    expect(session).toMatchObject({ bankroll: 640, bet: 50, stats });
  });

  it("settles a natural blackjack at 3:2 immediately on deal", () => {
    const dealt = run(stackedSession(["A_spades", "9_clubs", "K_hearts", "7_diamonds"]), {
      type: "deal",
    });

    expect(dealt.dealerReveal).toBeNull();
    expect(dealt.bankroll).toBe(STARTING_BANKROLL + 15);
    expect(dealt.stats).toMatchObject({ wins: 1, blackjacks: 1 });
  });

  it("reveals the dealer hand step by step before settling a stand", () => {
    const stood = run(
      stackedSession(["10_spades", "2_clubs", "8_hearts", "3_diamonds", "4_clubs", "9_spades"]),
      { type: "deal" },
      { type: "stand" },
    );

    // Dealer: 2, 3, 4, 9 = 18 vs player 18 -> push, but nothing settles until fully revealed.
    expect(stood.dealerReveal).toEqual({ visibleCount: 1 });
    expect(stood.stats.pushes).toBe(0);
    expect(canDeal(stood)).toBe(false);

    const step = sessionReducer(stood, { type: "reveal-step" });
    expect(step.dealerReveal).toEqual({ visibleCount: 2 });

    const done = revealAll(step);
    expect(done.dealerReveal).toBeNull();
    expect(done.round.result).toBe("push");
    expect(done.stats.pushes).toBe(1);
    expect(done.bankroll).toBe(STARTING_BANKROLL);
    expect(canDeal(done)).toBe(true);
  });

  it("settles a player bust immediately without a reveal", () => {
    const busted = run(
      stackedSession(["10_spades", "6_clubs", "6_hearts", "10_diamonds", "K_clubs"], { bet: 25 }),
      { type: "deal" },
      { type: "hit" },
    );

    expect(busted.round.result).toBe("lose");
    expect(busted.dealerReveal).toBeNull();
    expect(busted.bankroll).toBe(STARTING_BANKROLL - 25);
  });

  it("doubles the stake when the player doubles", () => {
    const doubled = revealAll(
      run(
        stackedSession(["6_spades", "9_clubs", "5_hearts", "8_diamonds", "Q_clubs"], { bet: 50 }),
        { type: "deal" },
        { type: "double" },
      ),
    );

    expect(doubled.round.result).toBe("win");
    expect(doubled.lastSettlement).toEqual({ stake: 100, net: 100 });
    expect(doubled.bankroll).toBe(STARTING_BANKROLL + 100);
  });

  it("blocks double when the bankroll cannot cover a second bet", () => {
    const dealt = run(
      stackedSession(["6_spades", "9_clubs", "5_hearts", "8_diamonds"], {
        bankroll: 150,
        bet: 100,
      }),
      { type: "deal" },
    );
    expect(canPlayerAct(dealt, "double")).toBe(false);
    expect(run(dealt, { type: "double" })).toBe(dealt);
  });

  it("blocks dealing when the bet exceeds the bankroll", () => {
    const session = stackedSession([], { bankroll: 40, bet: 50 });
    expect(canDeal(session)).toBe(false);
    expect(run(session, { type: "deal" })).toBe(session);
  });

  it("reports out-of-chips below the minimum bet and reset restores the bankroll", () => {
    const broke = stackedSession([], { bankroll: 5 });
    expect(isOutOfChips(broke)).toBe(true);

    const reset = run(broke, { type: "reset" });
    expect(reset.bankroll).toBe(STARTING_BANKROLL);
    expect(isOutOfChips(reset)).toBe(false);
  });

  it("only accepts listed bet sizes and only between rounds", () => {
    const session = createSession();
    expect(run(session, { type: "set-bet", bet: 25 }).bet).toBe(25);
    expect(run(session, { type: "set-bet", bet: 33 }).bet).toBe(session.bet);

    const dealt = run(stackedSession(["10_spades", "9_clubs", "6_hearts", "7_diamonds"]), {
      type: "deal",
    });
    expect(run(dealt, { type: "set-bet", bet: 100 }).bet).toBe(dealt.bet);
  });

  it("gives strategy advice during the player turn and clears it after an action", () => {
    const dealt = run(
      stackedSession(["10_spades", "10_clubs", "6_hearts", "7_diamonds", "2_clubs"]),
      {
        type: "deal",
      },
    );
    const hinted = run(dealt, { type: "request-hint" });

    expect(hinted.hint).toEqual({
      kind: "advice",
      action: "Hit",
      detail: "Basic strategy for hard 16 vs dealer 10.",
    });
    expect(run(hinted, { type: "hit" }).hint).toBeNull();
  });

  it("explains the fallback when strategy says double but doubling is unaffordable", () => {
    const dealt = run(
      stackedSession(["6_spades", "9_clubs", "5_hearts", "8_diamonds"], {
        bankroll: 150,
        bet: 100,
      }),
      { type: "deal" },
      { type: "request-hint" },
    );

    expect(dealt.hint).toMatchObject({ kind: "advice", action: "Hit" });
    expect(dealt.hint?.detail).toContain("doubling isn't available");
  });
});
