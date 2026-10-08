import type { Card } from "@blackjack/game-core";
import type { PlayerHandView } from "../state/tableView";
import { resultLabel, resultTone, summarizeDealerHand, summarizeHand } from "../state/tableView";
import { ChipStack } from "./ChipStack";
import { PlayingCard } from "./PlayingCard";

/** Stagger between cards of the opening deal, which alternates player/dealer. */
const DEAL_STAGGER_MS = 110;

function CardFan({
  cards,
  handNumber,
  seat,
  hideSecond = false,
}: {
  cards: Card[];
  handNumber: number;
  seat: "player" | "dealer";
  hideSecond?: boolean;
}) {
  return (
    <div className="card-fan" data-count={cards.length}>
      {cards.map((card, index) => {
        // Opening cards alternate player, dealer, player, dealer; later draws land immediately.
        const dealOrder = index < 2 ? index * 2 + (seat === "dealer" ? 1 : 0) : 0;
        return (
          <PlayingCard
            // Keyed by hand so a new hand remounts (and re-animates) every card.
            key={`${handNumber}-${index}`}
            card={card}
            hidden={hideSecond && index === 1}
            dealDelayMs={dealOrder * DEAL_STAGGER_MS}
          />
        );
      })}
    </div>
  );
}

function TotalBadge({ label, detail, hidden }: { label: string; detail: string; hidden: boolean }) {
  if (hidden)
    return (
      <span className="total-badge is-masked" aria-label="Total hidden">
        ?
      </span>
    );
  return (
    <span className="total-badge" title={detail}>
      {label}
      {detail && detail !== "Hard" ? <small>{detail.replace("Hard · ", "")}</small> : null}
    </span>
  );
}

export function DealerHand({
  cards,
  holeHidden,
  handNumber,
  isTurn,
  hideTotal,
}: {
  cards: Card[];
  holeHidden: boolean;
  handNumber: number;
  isTurn: boolean;
  hideTotal: boolean;
}) {
  const summary = summarizeDealerHand(cards, holeHidden);
  return (
    <section className={`seat dealer-seat${isTurn ? " is-turn" : ""}`} aria-label="Dealer hand">
      <div className="seat-label">
        Dealer
        {cards.length > 0 ? (
          <TotalBadge label={summary.totalLabel} detail={summary.detailLabel} hidden={hideTotal} />
        ) : null}
      </div>
      {cards.length > 0 ? (
        <CardFan cards={cards} handNumber={handNumber} seat="dealer" hideSecond={holeHidden} />
      ) : (
        <div className="card-placeholder" aria-hidden="true" />
      )}
    </section>
  );
}

export function PlayerHand({
  hand,
  index,
  handCount,
  handNumber,
  bet,
  hideTotal,
}: {
  hand: PlayerHandView;
  index: number;
  handCount: number;
  handNumber: number;
  bet: number;
  hideTotal: boolean;
}) {
  const summary = summarizeHand(hand.cards);
  const label = resultLabel(hand.result);
  const name = handCount > 1 ? `Hand ${index + 1}` : "You";

  return (
    <section
      className={`seat player-seat${hand.isActive ? " is-active" : ""}${hand.result ? ` result-${resultTone(hand.result)}` : ""}`}
      aria-label={handCount > 1 ? `Player hand ${index + 1}` : "Player hand"}
      aria-current={hand.isActive ? "true" : undefined}
    >
      <CardFan cards={hand.cards} handNumber={handNumber} seat="player" />
      <div className="seat-label">
        {name}
        <TotalBadge label={summary.totalLabel} detail={summary.detailLabel} hidden={hideTotal} />
      </div>
      <ChipStack amount={bet} stacks={hand.doubled ? 2 : 1} />
      {label ? (
        <span className={`result-badge tone-${resultTone(hand.result)}`}>{label}</span>
      ) : null}
    </section>
  );
}
