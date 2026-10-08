import { BET_OPTIONS, type PersistedSession, type SessionStats } from "./session";

/** Bump the version suffix whenever the persisted shape changes incompatibly. */
const SESSION_KEY = "blackjack.session.v1";
const SETTINGS_KEY = "blackjack.settings.v1";

export interface Settings {
  muted: boolean;
}

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Access can throw in private mode or when site data is blocked.
    return null;
  }
}

function readJson(storage: KeyValueStorage | null, key: string): unknown {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: KeyValueStorage | null, key: string, value: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled: persistence is best-effort.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseStats(value: unknown): SessionStats | undefined {
  if (!isRecord(value)) return undefined;
  const { wins, losses, pushes, blackjacks } = value;
  if (![wins, losses, pushes, blackjacks].every(isNonNegativeNumber)) return undefined;
  return { wins, losses, pushes, blackjacks } as SessionStats;
}

/** Loads saved session fields, dropping anything missing or malformed. */
export function loadSession(
  storage: KeyValueStorage | null = defaultStorage(),
): Partial<PersistedSession> {
  const data = readJson(storage, SESSION_KEY);
  if (!isRecord(data)) return {};

  const saved: Partial<PersistedSession> = {};
  const stats = parseStats(data.stats);
  if (stats) saved.stats = stats;
  if (isNonNegativeNumber(data.bankroll)) saved.bankroll = data.bankroll;
  if (BET_OPTIONS.includes(data.bet as never)) saved.bet = data.bet as number;
  return saved;
}

export function saveSession(
  session: PersistedSession,
  storage: KeyValueStorage | null = defaultStorage(),
): void {
  writeJson(storage, SESSION_KEY, {
    stats: session.stats,
    bankroll: session.bankroll,
    bet: session.bet,
  });
}

export function loadSettings(storage: KeyValueStorage | null = defaultStorage()): Settings {
  const data = readJson(storage, SETTINGS_KEY);
  return { muted: isRecord(data) && data.muted === true };
}

export function saveSettings(
  settings: Settings,
  storage: KeyValueStorage | null = defaultStorage(),
): void {
  writeJson(storage, SETTINGS_KEY, settings);
}
