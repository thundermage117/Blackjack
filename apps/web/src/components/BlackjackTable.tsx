import { useBlackjackGame } from "../state/useBlackjackGame";
import { PlayingCard } from "./PlayingCard";

function HandCards({
  cards,
  hideSecond,
  isActive,
}: {
  cards: ReturnType<typeof useBlackjackGame>["playerCards"];
  hideSecond?: boolean;
  isActive?: boolean;
}) {
  if (cards.length === 0) {
    return (
      <div className="empty-hand" aria-live="polite">
        No cards dealt yet
      </div>
    );
  }

  return (
    <div className={`card-row${isActive ? " is-active" : ""}`}>
      {cards.map((card, index) => (
        <PlayingCard
          key={`${card.rank}-${card.suit}-${index}`}
          card={card}
          hidden={hideSecond && index === 1}
        />
      ))}
    </div>
  );
}

export function BlackjackTable() {
  const game = useBlackjackGame();

  return (
    <section className={`table-card phase-${game.phase}`} aria-label="Blackjack table">
      <div className={`status-banner tone-${game.resultTone}`} aria-live="polite">
        <div className="banner-main">
          <span className="phase-pill">{game.phase.replace("-", " ")}</span>
          {game.resultLabel ? <span className="result-pill">{game.resultLabel}</span> : null}
          {game.isDealerResolving ? <span className="spinner-dot" aria-hidden="true" /> : null}
        </div>
        <p className="banner-message">{game.statusMessage}</p>
        <div className="banner-meta">
          <span>
            Stats: {game.stats.wins}W / {game.stats.losses}L / {game.stats.pushes}P
          </span>
          <span>
            Shoe: {game.shoeCardsRemaining} cards remaining
            {game.reshufflePending ? " · Reshuffle next round" : ""}
          </span>
          <span>Hint: {game.hint ?? "No hint requested"}</span>
        </div>
      </div>

      <div className="hand-grid">
        <section
          className={`hand-panel${game.phase === "dealer-turn" ? " is-turn" : ""}`}
          aria-label="Dealer hand"
        >
          <div className="hand-panel-header">
            <div>
              <p className="hand-label">Dealer</p>
              <h2>{game.dealerSummary.totalLabel}</h2>
            </div>
            <p className="hand-detail">{game.dealerSummary.detailLabel}</p>
          </div>
          <HandCards
            cards={game.dealerCards}
            hideSecond={game.dealerHoleHidden}
            isActive={game.phase === "dealer-turn"}
          />
        </section>

        <section
          className={`hand-panel${game.phase === "player-turn" ? " is-turn" : ""}`}
          aria-label="Player hand"
        >
          <div className="hand-panel-header">
            <div>
              <p className="hand-label">Player</p>
              <h2>{game.playerSummary.totalLabel}</h2>
            </div>
            <p className="hand-detail">{game.playerSummary.detailLabel}</p>
          </div>
          <HandCards cards={game.playerCards} isActive={game.phase === "player-turn"} />
        </section>
      </div>

      <div className="controls-shell">
        <div className="controls primary-controls" role="group" aria-label="Round controls">
          <button
            type="button"
            className="btn btn-primary"
            onClick={game.dealRound}
            disabled={!game.canDeal}
          >
            {game.dealLabel}
          </button>
          <button type="button" className="btn" onClick={game.hit} disabled={!game.canHit}>
            Hit
          </button>
          <button type="button" className="btn" onClick={game.stand} disabled={!game.canStand}>
            Stand
          </button>
          <button type="button" className="btn" onClick={game.double} disabled={!game.canDouble}>
            Double
          </button>
        </div>

        <div className="controls utility-controls" role="group" aria-label="Utility controls">
          <button
            type="button"
            className="btn btn-accent"
            onClick={game.requestHint}
            disabled={!game.canRequestHint}
          >
            Get Hint
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={game.resetSession}
            disabled={!game.canResetSession}
          >
            Reset Session
          </button>
        </div>
      </div>
    </section>
  );
}
