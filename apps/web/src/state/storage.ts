import {
  isBlackjackPayout,
  isSupportedDeckCount,
  type Card,
  type InsuranceState,
  type PlayerAction,
  type PlayerHand,
  type RoundPhase,
  type RoundResult,
  type RoundState,
  type TableOptions,
} from "@blackjack/game-core";
import { isLevelId } from "../learning/levels";
import type { MistakeRecord, TrainerStats } from "../learning/trainer";
import { BET_OPTIONS, type PersistedSession, type SessionStats, type Settings } from "./session";

/** v2 adds levels, table options, trainer stats, settings and the hand in progress. */
const SESSION_KEY = "blackjack.session.v2";
const LEGACY_SESSION_KEY = "blackjack.session.v1";
const LEGACY_SETTINGS_KEY = "blackjack.settings.v1";

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

// ---------------------------------------------------------------------------
// Validators: each returns undefined for anything malformed, so one bad field
// never discards the rest of the save.

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function oneOf<T extends string>(values: readonly T[]) {
  return (value: unknown): value is T => values.includes(value as T);
}

const isRank = oneOf(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const);
const isSuit = oneOf(["clubs", "diamonds", "hearts", "spades"] as const);
const isPhase = oneOf<RoundPhase>([
  "idle",
  "insurance",
  "player-turn",
  "dealer-turn",
  "round-over",
]);
const isInsurance = oneOf<InsuranceState>(["none", "offered", "taken", "declined"]);
const isAction = oneOf<PlayerAction>(["hit", "stand", "double", "split", "surrender"]);
const isResult = oneOf<RoundResult>(["win", "lose", "push", "blackjack_win", "surrender"]);
const isStatus = oneOf<PlayerHand["status"]>([
  "playing",
  "stood",
  "doubled",
  "busted",
  "blackjack",
  "surrendered",
]);

function parseCards(value: unknown): Card[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cards: Card[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isRank(item.rank) || !isSuit(item.suit)) return undefined;
    cards.push({ rank: item.rank, suit: item.suit });
  }
  return cards;
}

function parseHand(value: unknown): PlayerHand | undefined {
  if (!isRecord(value)) return undefined;
  const cards = parseCards(value.cards);
  if (!cards || !Array.isArray(value.actions) || !value.actions.every(isAction)) return undefined;
  if (!isStatus(value.status) || typeof value.fromSplit !== "boolean") return undefined;
  if (value.result !== undefined && !isResult(value.result)) return undefined;
  return {
    cards,
    actions: value.actions,
    status: value.status,
    fromSplit: value.fromSplit,
    ...(value.result ? { result: value.result } : {}),
  };
}

export function parseRound(value: unknown): RoundState | undefined {
  if (!isRecord(value)) return undefined;
  const shoe = parseCards(value.shoe);
  const dealerHand = parseCards(value.dealerHand);
  if (!shoe || !dealerHand || !Array.isArray(value.playerHands)) return undefined;
  const playerHands = value.playerHands.map(parseHand);
  if (playerHands.some((hand) => !hand)) return undefined;
  if (!isPhase(value.phase) || !isInsurance(value.insurance)) return undefined;
  if (!isCount(value.activeHandIndex) || typeof value.dealerHoleHidden !== "boolean") {
    return undefined;
  }
  if (typeof value.reshufflePending !== "boolean") return undefined;
  if (value.phase !== "idle" && playerHands.length === 0) return undefined;

  return {
    phase: value.phase,
    shoe,
    reshufflePending: value.reshufflePending,
    playerHands: playerHands as PlayerHand[],
    activeHandIndex: value.activeHandIndex,
    dealerHand,
    dealerHoleHidden: value.dealerHoleHidden,
    insurance: value.insurance,
    ...(typeof value.message === "string" ? { message: value.message } : {}),
  };
}

function parseStats(value: unknown): SessionStats | undefined {
  if (!isRecord(value)) return undefined;
  const { wins, losses, pushes, blackjacks } = value;
  if (![wins, losses, pushes, blackjacks].every(isCount)) return undefined;
  return { wins, losses, pushes, blackjacks } as SessionStats;
}

function parseTableOptions(value: unknown): TableOptions | undefined {
  if (!isRecord(value)) return undefined;
  const { deckCount, dealerSoft17, doubleAfterSplit, surrender, blackjackPayout } = value;
  if (!isSupportedDeckCount(deckCount) || !isBlackjackPayout(blackjackPayout)) return undefined;
  if (dealerSoft17 !== "stand" && dealerSoft17 !== "hit") return undefined;
  if (typeof doubleAfterSplit !== "boolean" || typeof surrender !== "boolean") return undefined;
  return { deckCount, dealerSoft17, doubleAfterSplit, surrender, blackjackPayout };
}

function parseTrainer(value: unknown): TrainerStats | undefined {
  if (!isRecord(value) || !isRecord(value.mistakes)) return undefined;
  const counts = [
    "decisions",
    "correct",
    "levelDecisions",
    "levelCorrect",
    "countChecks",
    "countChecksCorrect",
  ] as const;
  if (!counts.every((key) => isCount(value[key]))) return undefined;

  const mistakes: Record<string, MistakeRecord> = {};
  for (const [situation, record] of Object.entries(value.mistakes)) {
    if (isRecord(record) && isCount(record.count) && typeof record.recommended === "string") {
      mistakes[situation] = record as unknown as MistakeRecord;
    }
  }
  return { ...(value as unknown as TrainerStats), mistakes };
}

function parseSettings(value: unknown): Partial<Settings> | undefined {
  if (!isRecord(value)) return undefined;
  const settings: Partial<Settings> = {};
  for (const key of [
    "muted",
    "haptics",
    "feedback",
    "showCount",
    "countChecks",
    "hideTotals",
  ] as const) {
    if (typeof value[key] === "boolean") settings[key] = value[key];
  }
  return settings;
}

/** Loads saved session fields, dropping anything missing or malformed. */
export function loadSession(
  storage: KeyValueStorage | null = defaultStorage(),
): Partial<PersistedSession> {
  const data = readJson(storage, SESSION_KEY) ?? migrateV1(storage);
  if (!isRecord(data)) return {};

  const saved: Partial<PersistedSession> = {};
  const stats = parseStats(data.stats);
  if (stats) saved.stats = stats;
  if (isFiniteNumber(data.bankroll) && data.bankroll >= 0) saved.bankroll = data.bankroll;
  if (BET_OPTIONS.includes(data.bet as never)) saved.bet = data.bet as number;
  if (isLevelId(data.level)) saved.level = data.level;
  const tableOptions = parseTableOptions(data.tableOptions);
  if (tableOptions) saved.tableOptions = tableOptions;
  const trainer = parseTrainer(data.trainer);
  if (trainer) saved.trainer = trainer;
  const settings = parseSettings(data.settings);
  if (settings) saved.settings = settings as Settings;
  if (isCount(data.handNumber)) saved.handNumber = data.handNumber;
  if (isCount(data.handsSinceCountCheck)) saved.handsSinceCountCheck = data.handsSinceCountCheck;
  if (isCount(data.promotionSnoozedAt)) saved.promotionSnoozedAt = data.promotionSnoozedAt;

  // The hand in progress is restored only if the whole round is valid.
  const round = parseRound(data.round);
  if (round) {
    saved.round = round;
    if (isRecord(data.dealerReveal) && isCount(data.dealerReveal.visibleCount)) {
      saved.dealerReveal = { visibleCount: data.dealerReveal.visibleCount };
    }
    if (isRecord(data.lastSettlement)) {
      const { stake, net } = data.lastSettlement;
      if (isFiniteNumber(stake) && isFiniteNumber(net)) saved.lastSettlement = { stake, net };
    }
    if (isRecord(data.countCheck) && isFiniteNumber(data.countCheck.expected)) {
      const answer = data.countCheck.answer;
      saved.countCheck = {
        expected: data.countCheck.expected,
        ...(answer === null || isFiniteNumber(answer) ? { answer } : {}),
      };
    }
  }
  return saved;
}

/** v1 stored stats/bankroll/bet and, separately, the mute setting. */
function migrateV1(storage: KeyValueStorage | null): Json | null {
  const legacy = readJson(storage, LEGACY_SESSION_KEY);
  const legacySettings = readJson(storage, LEGACY_SETTINGS_KEY);
  if (!isRecord(legacy) && !isRecord(legacySettings)) return null;

  const stats = isRecord(legacy) && isRecord(legacy.stats) ? legacy.stats : undefined;
  return {
    ...(isRecord(legacy) ? legacy : {}),
    // v1 stats predate the blackjacks counter in some saves.
    ...(stats ? { stats: { blackjacks: 0, ...stats } } : {}),
    settings: isRecord(legacySettings) ? { muted: legacySettings.muted === true } : {},
  };
}

export function saveSession(
  session: PersistedSession,
  storage: KeyValueStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Quota exceeded or storage disabled: persistence is best-effort.
  }
}
