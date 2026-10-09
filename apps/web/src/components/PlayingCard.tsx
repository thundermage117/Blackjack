import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Card } from "@blackjack/game-core";

interface PlayingCardProps {
  card?: Card;
  hidden?: boolean;
  /** Delay before the deal-in animation starts, used to stagger the opening deal. */
  dealDelayMs?: number;
}

const SUIT_SYMBOL: Record<Card["suit"], string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

/**
 * Pip positions as [x%, y%] inside the pip area (`.card-center`), laid out like a real deck.
 * The pip area keeps clear of the corner indices, so the two never touch.
 */
const L = 18;
const C = 50;
const R = 82;
// Rows for 9 and 10: four evenly spaced lines.
const Q1 = 8;
const Q2 = 36;
const Q3 = 64;
const Q4 = 92;
// prettier-ignore
const PIP_LAYOUTS: Record<string, Array<[number, number]>> = {
  "2": [[C, Q1], [C, Q4]],
  "3": [[C, Q1], [C, 50], [C, Q4]],
  "4": [[L, Q1], [R, Q1], [L, Q4], [R, Q4]],
  "5": [[L, Q1], [R, Q1], [C, 50], [L, Q4], [R, Q4]],
  "6": [[L, Q1], [R, Q1], [L, 50], [R, 50], [L, Q4], [R, Q4]],
  "7": [[L, Q1], [R, Q1], [C, 29], [L, 50], [R, 50], [L, Q4], [R, Q4]],
  "8": [[L, Q1], [R, Q1], [C, 29], [L, 50], [R, 50], [C, 71], [L, Q4], [R, Q4]],
  "9": [[L, Q1], [R, Q1], [L, Q2], [R, Q2], [C, 50], [L, Q3], [R, Q3], [L, Q4], [R, Q4]],
  "10": [[L, Q1], [R, Q1], [C, 22], [L, Q2], [R, Q2], [L, Q3], [R, Q3], [C, 78], [L, Q4], [R, Q4]],
};

function CardFace({ card }: { card: Card }) {
  const symbol = SUIT_SYMBOL[card.suit];
  const pips = PIP_LAYOUTS[card.rank];
  const isFace = card.rank === "J" || card.rank === "Q" || card.rank === "K";

  const rankClass = card.rank === "10" ? "corner-rank is-ten" : "corner-rank";

  return (
    <>
      <div className="card-corner top" aria-hidden="true">
        <span className={rankClass}>{card.rank}</span>
        <span className="corner-suit">{symbol}</span>
      </div>
      <div className="card-center" aria-hidden="true">
        {pips ? (
          pips.map(([x, y], i) => (
            <span
              key={i}
              className={`pip${y > 50 ? " is-flipped" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {symbol}
            </span>
          ))
        ) : isFace ? (
          <div className="face-art">
            <span className="face-letter">{card.rank}</span>
            <span className="face-suit">{symbol}</span>
          </div>
        ) : (
          <span className="ace-pip">{symbol}</span>
        )}
      </div>
      {/* Small cards (split hands on phones) show one large suit instead of pips. */}
      <span className="mini-suit" aria-hidden="true">
        {symbol}
      </span>
      <div className="card-corner bottom" aria-hidden="true">
        <span className={rankClass}>{card.rank}</span>
        <span className="corner-suit">{symbol}</span>
      </div>
    </>
  );
}

/**
 * A card animates in when dealt, flips when revealed, then stays still. "still" switches the
 * animation off: otherwise removing `is-flipping` would put the deal animation back, and the
 * browser would replay it (with its opening-deal delay) on a card already on the table.
 */
type Motion = "dealing" | "flipping" | "still";

export function PlayingCard({ card, hidden = false, dealDelayMs = 0 }: PlayingCardProps) {
  const faceDown = hidden || !card;
  const wasFaceDown = useRef(faceDown);
  const [motion, setMotion] = useState<Motion>("dealing");

  useEffect(() => {
    if (wasFaceDown.current && !faceDown) setMotion("flipping");
    wasFaceDown.current = faceDown;
  }, [faceDown]);

  const tone = card && (card.suit === "hearts" || card.suit === "diamonds") ? "is-red" : "is-black";
  const motionClass = motion === "flipping" ? "is-flipping" : motion === "still" ? "is-still" : "";
  const classes = ["playing-card", faceDown ? "is-hidden" : tone, motionClass]
    .filter(Boolean)
    .join(" ");
  const style: CSSProperties | undefined =
    dealDelayMs > 0 && motion === "dealing" ? { animationDelay: `${dealDelayMs}ms` } : undefined;

  return (
    <div
      className={classes}
      style={style}
      role="img"
      aria-label={faceDown ? "Face-down card" : `${card.rank} of ${card.suit}`}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setMotion("still");
      }}
    >
      {faceDown ? (
        <div className="card-back-pattern" aria-hidden="true" />
      ) : (
        <CardFace card={card} />
      )}
    </div>
  );
}
