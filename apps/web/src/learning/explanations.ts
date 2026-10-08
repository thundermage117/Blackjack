import type { DealerUpcardKey, HintAction, PairKey } from "@blackjack/hint-engine";

export interface DecisionContext {
  handKind: "hard" | "soft";
  total: number;
  dealerUpcard: DealerUpcardKey;
  pair: PairKey | null;
  /** True when the table said "double" but doubling was not available. */
  doubleFallback: boolean;
}

const WEAK_UPCARDS: DealerUpcardKey[] = ["2", "3", "4", "5", "6"];

function isWeak(upcard: DealerUpcardKey): boolean {
  return WEAK_UPCARDS.includes(upcard);
}

/**
 * A one-sentence reason for a basic-strategy play, aimed at someone learning.
 * These are rules of thumb that explain the table, not proofs.
 */
export function explainAction(action: HintAction, ctx: DecisionContext): string {
  const { handKind, total, dealerUpcard, pair } = ctx;
  const weak = isWeak(dealerUpcard);

  if (action === "Surrender") {
    return "This hand loses far more often than it wins. Surrendering keeps half your bet.";
  }

  if (action === "Split") {
    if (pair === "A") return "Always split Aces: two hands starting at 11 beat one soft 12.";
    if (pair === "8")
      return "Always split 8s: 16 is the worst total, but two hands of 8 are decent.";
    if (weak) return "The dealer is weak, so put more money out with two hands.";
    return "Two hands starting from this card do better than playing the pair together.";
  }

  if (pair === "10" && action === "Stand") {
    return "Never split tens: 20 already wins most hands.";
  }
  if (pair === "5" && action === "Double") {
    return "Never split 5s: treat them as 10 and double.";
  }

  if (action === "Double") {
    if (handKind === "soft") {
      return "A soft hand can't bust with one card, and the dealer is likely to bust. Double up.";
    }
    return `${total} is a strong start: one card often makes 19-21, so double while you're ahead.`;
  }

  // Sentences are written capitalized; this prefixes the fallback note when it applies.
  const explain = (sentence: string) =>
    ctx.doubleFallback
      ? `Doubling isn't available, so ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`
      : sentence;

  if (handKind === "soft") {
    if (action === "Hit") {
      return explain(
        `A soft ${total} can't bust with one more card, and ${total <= 17 ? "it rarely wins as is" : "it's not enough against this upcard"}.`,
      );
    }
    return explain(`Soft ${total} is a solid total. Stand.`);
  }

  if (action === "Stand") {
    if (total >= 17) return `${total} or more: the risk of busting is too high to hit.`;
    if (weak) {
      return `The dealer shows a weak ${dealerUpcard} and busts often. Don't risk busting yourself on ${total}.`;
    }
    return explain(`Stand on ${total} against a ${dealerUpcard}.`);
  }

  // Hit on a hard total.
  if (total <= 11) return explain(`You can't bust with one card from ${total}. Take one.`);
  if (total === 12 && (dealerUpcard === "2" || dealerUpcard === "3")) {
    return "12 against a 2 or 3 is the exception: the dealer is not weak enough, so hit.";
  }
  return `The dealer's ${dealerUpcard === "10" ? "ten" : dealerUpcard} is strong. Standing on ${total} loses more often than hitting.`;
}
