import type { Card } from "../../../../packages/game-core/src";

interface PlayingCardProps {
  card?: Card;
  hidden?: boolean;
  compact?: boolean;
}

function suitSymbol(suit: Card["suit"]): string {
  if (suit === "spades") return "♠";
  if (suit === "hearts") return "♥";
  if (suit === "diamonds") return "♦";
  return "♣";
}

function suitClass(suit: Card["suit"]): string {
  return suit === "hearts" || suit === "diamonds" ? "is-red" : "is-black";
}

export function PlayingCard({ card, hidden = false, compact = false }: PlayingCardProps) {
  if (hidden || !card) {
    return (
      <div
        className={`playing-card is-hidden${compact ? " is-compact" : ""}`}
        aria-label="Hidden dealer card"
        role="img"
      >
        <div className="card-back-pattern" aria-hidden="true" />
      </div>
    );
  }

  const symbol = suitSymbol(card.suit);
  const toneClass = suitClass(card.suit);

  return (
    <div
      className={`playing-card ${toneClass}${compact ? " is-compact" : ""}`}
      aria-label={`${card.rank} of ${card.suit}`}
      role="img"
    >
      <div className="card-corner top" aria-hidden="true">
        <span>{card.rank}</span>
        <span>{symbol}</span>
      </div>
      <div className="card-glyph" aria-hidden="true">
        <span>{symbol}</span>
      </div>
      <div className="card-corner bottom" aria-hidden="true">
        <span>{card.rank}</span>
        <span>{symbol}</span>
      </div>
    </div>
  );
}
