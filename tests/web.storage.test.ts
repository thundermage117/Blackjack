import { describe, expect, it } from "vitest";
import {
  loadSession,
  loadSettings,
  saveSession,
  saveSettings,
} from "../apps/web/src/state/storage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const stats = { wins: 4, losses: 2, pushes: 1, blackjacks: 1 };

describe("session storage", () => {
  it("round-trips a saved session", () => {
    const storage = memoryStorage();
    saveSession({ stats, bankroll: 1180, bet: 25 }, storage);
    expect(loadSession(storage)).toEqual({ stats, bankroll: 1180, bet: 25 });
  });

  it("returns nothing when storage is empty or unavailable", () => {
    expect(loadSession(memoryStorage())).toEqual({});
    expect(loadSession(null)).toEqual({});
  });

  it("ignores corrupt JSON", () => {
    expect(loadSession(memoryStorage({ "blackjack.session.v1": "{not json" }))).toEqual({});
  });

  it("drops individually invalid fields but keeps valid ones", () => {
    const storage = memoryStorage({
      "blackjack.session.v1": JSON.stringify({
        stats: { wins: -1, losses: 0, pushes: 0, blackjacks: 0 },
        bankroll: 500,
        bet: 33,
      }),
    });
    expect(loadSession(storage)).toEqual({ bankroll: 500 });
  });

  it("swallows storage write errors", () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveSession({ stats, bankroll: 1, bet: 10 }, throwing)).not.toThrow();
  });
});

describe("settings storage", () => {
  it("defaults to sound on", () => {
    expect(loadSettings(memoryStorage())).toEqual({ muted: false });
  });

  it("round-trips the mute setting", () => {
    const storage = memoryStorage();
    saveSettings({ muted: true }, storage);
    expect(loadSettings(storage)).toEqual({ muted: true });
  });
});
