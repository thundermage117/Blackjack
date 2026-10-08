import { scoreHand, type Card } from "@blackjack/game-core";
import { resultLabel, type TableView } from "./tableView";

function cardName(card: Card): string {
  const rank: Record<string, string> = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };
  return `${rank[card.rank] ?? card.rank} of ${card.suit}`;
}

/**
 * How many leading cards of a hand were already on the table. A hand created by a
 * split starts with a card moved from its sibling, which is not newly dealt.
 */
function unchangedPrefix(before: Card[] | undefined, after: Card[]): number {
  if (!before) return 1;
  let i = 0;
  while (i < before.length && i < after.length && sameCard(before[i], after[i])) i += 1;
  return i;
}

function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/**
 * Screen-reader text for a change on the table, or null if nothing worth saying
 * happened. Cards are announced as they land, then totals and results, so the game
 * is playable without seeing the cards.
 */
export function announcementForTableChange(prev: TableView, next: TableView): string | null {
  const parts: string[] = [];
  const isNewHand = next.handNumber !== prev.handNumber;
  const multiHand = next.playerHands.length > 1;

  if (isNewHand && next.playerHands[0] && next.dealerCards[0]) {
    const cards = next.playerHands[0].cards.map(cardName).join(" and ");
    parts.push(
      `You have ${cards}, ${scoreHand(next.playerHands[0].cards).bestTotal}. Dealer shows ${cardName(next.dealerCards[0])}.`,
    );
  } else {
    if (next.playerHands.length > prev.playerHands.length && prev.playerHands.length > 0) {
      parts.push(`Split into ${next.playerHands.length} hands.`);
    }
    next.playerHands.forEach((hand, index) => {
      const newCards = hand.cards.slice(
        unchangedPrefix(prev.playerHands[index]?.cards, hand.cards),
      );
      if (newCards.length === 0) return;
      const label = multiHand ? `Hand ${index + 1}` : "You";
      parts.push(
        `${label}: ${newCards.map(cardName).join(", ")}. Total ${scoreHand(hand.cards).bestTotal}.`,
      );
    });

    if (prev.dealerHoleHidden && !next.dealerHoleHidden && next.dealerCards[1]) {
      parts.push(`Dealer turns over ${cardName(next.dealerCards[1])}.`);
    }
    const newDealer = next.dealerCards.slice(Math.max(2, prev.dealerCards.length));
    if (newDealer.length > 0) {
      parts.push(`Dealer draws ${newDealer.map(cardName).join(", ")}.`);
    }
  }

  if (next.isSettled && (isNewHand || !prev.isSettled)) {
    parts.push(`Dealer has ${scoreHand(next.dealerCards).bestTotal}.`);
    next.playerHands.forEach((hand, index) => {
      const label = resultLabel(hand.result);
      if (label) parts.push(multiHand ? `Hand ${index + 1}: ${label}.` : `${label}.`);
    });
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
