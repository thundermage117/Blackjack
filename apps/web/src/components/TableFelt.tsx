import type { GameRules } from "@blackjack/game-core";
import type { GameViewModel } from "../state/useBlackjackGame";
import { DealerHand, PlayerHand } from "./Hand";

function payoutLabel(payout: number): string {
  return payout === 1.5 ? "3 TO 2" : payout === 1.2 ? "6 TO 5" : `${payout} TO 1`;
}

/** The rules printed on the felt, as on a real table. */
function FeltArc({ rules }: { rules: GameRules }) {
  const line1 = `BLACKJACK PAYS ${payoutLabel(rules.blackjackPayout)}`;
  const line2 = `DEALER ${rules.dealerSoft17 === "hit" ? "HITS" : "MUST STAND ON"} SOFT 17${rules.allowInsurance ? " · INSURANCE PAYS 2 TO 1" : ""}`;
  return (
    <svg className="felt-arc" viewBox="0 0 600 130" aria-hidden="true">
      <defs>
        <path id="arc-main" d="M 70 18 Q 300 118 530 18" />
        <path id="arc-sub" d="M 16 48 Q 300 168 584 48" />
      </defs>
      <text className="felt-arc-main">
        <textPath href="#arc-main" startOffset="50%" textAnchor="middle">
          {line1}
        </textPath>
      </text>
      <text className="felt-arc-sub">
        <textPath href="#arc-sub" startOffset="50%" textAnchor="middle">
          {line2}
        </textPath>
      </text>
    </svg>
  );
}

export function TableFelt({ game, rules }: { game: GameViewModel; rules: GameRules }) {
  const { table } = game;
  const hideTotals = game.level.assists.counting && game.settings.hideTotals;

  return (
    <div className={`felt tone-${game.tone}`}>
      <div className="felt-top">
        <DealerHand
          cards={table.dealerCards}
          holeHidden={table.dealerHoleHidden}
          handNumber={table.handNumber}
          isTurn={table.phase === "dealer-turn"}
          hideTotal={hideTotals}
        />
        <div className="shoe" title={`${table.shoeCardsRemaining} cards left in the shoe`}>
          <div className="shoe-cards" aria-hidden="true" />
          <span>{table.shoeCardsRemaining}</span>
        </div>
      </div>

      <FeltArc rules={rules} />

      <div className="status-strip" aria-live="polite">
        <p className="status-message">{game.statusMessage}</p>
        {game.lastNet !== null ? (
          <span className={`net-pill tone-${game.tone}`}>
            {game.lastNet > 0 ? "+" : game.lastNet < 0 ? "−" : "±"}${Math.abs(game.lastNet)}
          </span>
        ) : null}
      </div>

      <div
        className={`player-row hands-${table.playerHands.length || 1}${table.phase === "player-turn" ? " has-active" : ""}`}
      >
        {table.playerHands.length > 0 ? (
          table.playerHands.map((hand, index) => (
            <PlayerHand
              key={index}
              hand={hand}
              index={index}
              handCount={table.playerHands.length}
              handNumber={table.handNumber}
              bet={game.bet}
              hideTotal={hideTotals}
            />
          ))
        ) : (
          <section className="seat player-seat is-empty" aria-label="Player hand">
            <div className="card-placeholder" aria-hidden="true" />
            <div className="seat-label">You</div>
          </section>
        )}
      </div>
    </div>
  );
}
