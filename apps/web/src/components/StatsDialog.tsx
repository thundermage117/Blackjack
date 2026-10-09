import type { GameViewModel } from "../state/useBlackjackGame";

function percent(value: number | null): string {
  return value === null ? "–" : `${Math.round(value * 100)}%`;
}

export function StatsDialogContent({ game }: { game: GameViewModel }) {
  const { stats, trainer } = game;
  const hands = stats.wins + stats.losses + stats.pushes;
  const countAccuracy =
    trainer.countChecks === 0 ? null : trainer.countChecksCorrect / trainer.countChecks;

  return (
    <div className="stats">
      <dl className="stat-grid">
        <div>
          <dt>Bankroll</dt>
          <dd>${game.bankroll.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Hands</dt>
          <dd>{hands}</dd>
        </div>
        <div>
          <dt>Won / lost / push</dt>
          <dd>
            {stats.wins} / {stats.losses} / {stats.pushes}
          </dd>
        </div>
        <div>
          <dt>Blackjacks</dt>
          <dd>{stats.blackjacks}</dd>
        </div>
        <div>
          <dt>Strategy accuracy</dt>
          <dd>{percent(trainer.accuracy)}</dd>
        </div>
        <div>
          <dt>Decisions graded</dt>
          <dd>{trainer.decisions}</dd>
        </div>
        {trainer.countChecks > 0 ? (
          <div>
            <dt>Count checks</dt>
            <dd>
              {trainer.countChecksCorrect}/{trainer.countChecks} ({percent(countAccuracy)})
            </dd>
          </div>
        ) : null}
      </dl>

      <h3>Most common mistakes</h3>
      {trainer.mistakes.length === 0 ? (
        <p className="settings-note">
          {trainer.decisions === 0
            ? "Play a few hands and your mistakes will show up here."
            : "No mistakes yet. Nice."}
        </p>
      ) : (
        <ol className="mistake-list">
          {trainer.mistakes.map((mistake) => (
            <li key={mistake.situation}>
              <span className="mistake-situation">
                {mistake.situation.charAt(0).toUpperCase() + mistake.situation.slice(1)}
              </span>
              <span className="mistake-fix">→ {mistake.recommended}</span>
              <span className="mistake-count">×{mistake.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
