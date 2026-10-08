import { describe, expect, it } from "vitest";
import { createEmptyRoundState } from "@blackjack/game-core";
import { createSession, sessionReducer, toPersisted } from "../apps/web/src/state/session";
import { loadSession, parseRound, saveSession } from "../apps/web/src/state/storage";
import { buildPaddedShoe, cards } from "./helpers/fixtureCards";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    dump: () => Object.fromEntries(data),
  };
}

describe("session storage v2", () => {
  it("round-trips a session including a hand in progress", () => {
    const base = createSession({ level: 2 });
    const dealt = sessionReducer(
      {
        ...base,
        round: {
          ...createEmptyRoundState(),
          shoe: buildPaddedShoe(cards("10_spades", "9_clubs", "6_hearts", "7_diamonds")),
        },
      },
      { type: "deal" },
    );
    const storage = memoryStorage();
    saveSession(toPersisted(dealt), storage);

    const loaded = loadSession(storage);
    expect(loaded.round).toEqual(dealt.round);
    expect(loaded.round?.phase).toBe("player-turn");
    expect(loaded.level).toBe(2);
    expect(loaded.handNumber).toBe(1);
  });

  it("returns nothing when storage is empty, unavailable or corrupt", () => {
    expect(loadSession(memoryStorage())).toEqual({});
    expect(loadSession(null)).toEqual({});
    expect(loadSession(memoryStorage({ "blackjack.session.v2": "{nope" }))).toEqual({});
  });

  it("drops invalid fields one by one", () => {
    const storage = memoryStorage({
      "blackjack.session.v2": JSON.stringify({
        bankroll: 640,
        bet: 33,
        level: 9,
        tableOptions: { deckCount: 3 },
        round: { phase: "player-turn", shoe: [{ rank: "Z", suit: "hearts" }] },
      }),
    });
    expect(loadSession(storage)).toEqual({ bankroll: 640 });
  });

  it("migrates a v1 save and the old mute setting", () => {
    const storage = memoryStorage({
      "blackjack.session.v1": JSON.stringify({
        stats: { wins: 3, losses: 2, pushes: 1, blackjacks: 1 },
        bankroll: 1180,
        bet: 25,
      }),
      "blackjack.settings.v1": JSON.stringify({ muted: true }),
    });
    expect(loadSession(storage)).toEqual({
      stats: { wins: 3, losses: 2, pushes: 1, blackjacks: 1 },
      bankroll: 1180,
      bet: 25,
      settings: { muted: true },
    });
  });

  it("swallows storage write errors", () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveSession(toPersisted(createSession()), throwing)).not.toThrow();
  });
});

describe("parseRound", () => {
  it("rejects rounds with malformed hands", () => {
    const round = {
      ...createEmptyRoundState(),
      phase: "player-turn",
      playerHands: [{ cards: [] }],
    };
    expect(parseRound(round)).toBeUndefined();
  });

  it("accepts an idle round", () => {
    expect(parseRound(createEmptyRoundState())).toEqual(createEmptyRoundState());
  });
});
