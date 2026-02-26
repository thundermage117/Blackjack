import type { DealerUpcardKey, StrategyAction } from "./types";

export const DEALER_UPCARD_KEYS: DealerUpcardKey[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];

export function toRowKey(kind: "hard" | "soft", total: number): string {
  return `${kind}:${total}`;
}

export function toStrategyBucketKey(total: number): string {
  return String(total);
}

export function isStrategyAction(value: string): value is StrategyAction {
  return value === "H" || value === "S" || value === "D";
}

export function normalizeDealerUpcard(rank: string): DealerUpcardKey {
  if (rank === "J" || rank === "Q" || rank === "K") return "10";
  if (rank === "A") return "A";
  if (DEALER_UPCARD_KEYS.includes(rank as DealerUpcardKey)) {
    return rank as DealerUpcardKey;
  }
  throw new Error(`Unsupported dealer upcard rank: ${rank}`);
}
