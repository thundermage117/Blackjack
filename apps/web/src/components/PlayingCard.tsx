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

/** Pip positions as [x%, y%] on the card face, laid out like a real deck. */
const L = 28;
const C = 50;
const R = 72;
// prettier-ignore
const PIP_LAYOUTS: Record<string, Array<[number, number]>> = {
  "2": [[C, 18], [C, 82]],
  "3": [[C, 18], [C, 50], [C, 82]],
  "4": [[L, 18], [R, 18], [L, 82], [R, 82]],
  "5": [[L, 18], [R, 18], [C, 50], [L, 82], [R, 82]],
  "6": [[L, 18], [R, 18], [L, 50], [R, 50], [L, 82], [R, 82]],
  "7": [[L, 18], [R, 18], [C, 34], [L, 50], [R, 50], [L, 82], [R, 82]],
  "8": [[L, 18], [R, 18], [C, 34], [L, 50], [R, 50], [C, 66], [L, 82], [R, 82]],
  "9": [[L, 18], [R, 18], [L, 39], [R, 39], [C, 50], [L, 61], [R, 61], [L, 82], [R, 82]],
  "10": [[L, 18], [R, 18], [C, 29], [L, 40], [R, 40], [L, 60], [R, 60], [C, 71], [L, 82], [R, 82]],
};

function CardFace({ card }: { card: Card }) {
  const symbol = SUIT_SYMBOL[card.suit];
  const pips = PIP_LAYOUTS[card.rank];
  const isFace = card.rank === "J" || card.rank === "Q" || card.rank === "K";

  return (
    <>
      <div className="card-corner top" aria-hidden="true">
        <span className="corner-rank">{card.rank}</span>
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
      <div className="card-corner bottom" aria-hidden="true">
        <span className="corner-rank">{card.rank}</span>
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
