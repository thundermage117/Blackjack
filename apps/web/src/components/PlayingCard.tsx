import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Card } from "@blackjack/game-core";

interface PlayingCardProps {
  card?: Card;
  hidden?: boolean;
  compact?: boolean;
  /** Delay before the deal-in animation starts, used to stagger the opening deal. */
  dealDelayMs?: number;
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

export function PlayingCard({
  card,
  hidden = false,
  compact = false,
  dealDelayMs = 0,
}: PlayingCardProps) {
  const faceDown = hidden || !card;
  const wasFaceDown = useRef(faceDown);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (wasFaceDown.current && !faceDown) setIsFlipping(true);
    wasFaceDown.current = faceDown;
  }, [faceDown]);

  const classes = [
    "playing-card",
    faceDown ? "is-hidden" : suitClass(card.suit),
    compact ? "is-compact" : "",
    isFlipping ? "is-flipping" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style: CSSProperties | undefined =
    dealDelayMs > 0 ? { animationDelay: `${dealDelayMs}ms` } : undefined;

  if (faceDown) {
    return (
      <div className={classes} style={style} aria-label="Hidden dealer card" role="img">
        <div className="card-back-pattern" aria-hidden="true" />
      </div>
    );
  }

  const symbol = suitSymbol(card.suit);
  return (
    <div
      className={classes}
      style={isFlipping ? undefined : style}
      aria-label={`${card.rank} of ${card.suit}`}
      role="img"
      onAnimationEnd={() => setIsFlipping(false)}
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
