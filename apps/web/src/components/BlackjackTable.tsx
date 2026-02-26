import { useBlackjackGame } from "../state/useBlackjackGame";

export function BlackjackTable() {
  const game = useBlackjackGame();

  return (
    <section className="table-card" aria-label="Blackjack table">
      <div className="hand-row">
        <h2>Dealer</h2>
        <p className="cards">{game.dealerDisplay}</p>
      </div>

      <div className="hand-row">
        <h2>Player</h2>
        <p className="cards">{game.playerDisplay}</p>
      </div>

      <div className="status-panel">
        <p>
          <strong>Phase:</strong> {game.phase}
        </p>
        <p>
          <strong>Status:</strong> {game.statusMessage}
        </p>
        <p>
          <strong>Hint:</strong> {game.hint ?? "No hint requested"}
        </p>
        <p>
          <strong>Stats:</strong> {game.stats.wins}W / {game.stats.losses}L / {game.stats.pushes}P
        </p>
      </div>

      <div className="controls" role="group" aria-label="Game controls">
        <button type="button" onClick={game.dealRound}>
          Deal
        </button>
        <button type="button" onClick={game.hit} disabled={!game.canHit}>
          Hit
        </button>
        <button type="button" onClick={game.stand} disabled={!game.canStand}>
          Stand
        </button>
        <button type="button" onClick={game.double} disabled={!game.canDouble}>
          Double
        </button>
        <button type="button" onClick={game.requestHint} disabled={!game.canRequestHint}>
          Hint
        </button>
      </div>

      <p className="todo-note">
        Shared engine/hint wiring is active. Next: add real card rendering, reducer tests, and dealer turn animation.
      </p>
    </section>
  );
}
