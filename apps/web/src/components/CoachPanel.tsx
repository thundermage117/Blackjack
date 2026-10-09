import { useState, type FormEvent } from "react";
import type { GameViewModel } from "../state/useBlackjackGame";

function percent(value: number | null): string {
  return value === null ? "–" : `${Math.round(value * 100)}%`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function LevelProgress({ game }: { game: GameViewModel }) {
  const { promotion } = game.level;
  const { levelDecisions, levelAccuracy } = game.trainer;

  if (game.promotionReady && game.nextLevel) {
    return (
      <div className="coach-card promotion" role="status">
        <p className="coach-eyebrow">Level up available</p>
        <p className="coach-title">
          Ready for {game.nextLevel.id} · {game.nextLevel.name}
        </p>
        <p className="coach-text">{game.nextLevel.tagline}</p>
        <div className="coach-actions">
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => game.actions.setLevel(game.nextLevel!.id)}
            disabled={!game.isBetweenHands}
          >
            Level up
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={game.actions.snoozePromotion}
          >
            Not yet
          </button>
        </div>
      </div>
    );
  }

  if (!promotion) return null;
  const progress = Math.min(1, levelDecisions / promotion.minDecisions);
  return (
    <div className="coach-card">
      <p className="coach-eyebrow">Level progress</p>
      <div
        className="progress"
        role="progressbar"
        aria-label="Decisions toward next level"
        aria-valuemin={0}
        aria-valuemax={promotion.minDecisions}
        aria-valuenow={Math.min(levelDecisions, promotion.minDecisions)}
      >
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="coach-text">
        {Math.min(levelDecisions, promotion.minDecisions)}/{promotion.minDecisions} decisions ·{" "}
        {levelAccuracy === null
          ? `need ${percent(promotion.minAccuracy)} correct`
          : `${percent(levelAccuracy)} correct (need ${percent(promotion.minAccuracy)})`}
      </p>
    </div>
  );
}

function CountCheckForm({ game }: { game: GameViewModel }) {
  const [value, setValue] = useState("");
  const check = game.countCheck;
  if (!check) return null;

  if (check.answer !== undefined) {
    const skipped = check.answer === null;
    const correct = check.answer === check.expected;
    return (
      <div
        className={`coach-card ${skipped ? "" : correct ? "is-correct" : "is-mistake"}`}
        role="status"
      >
        <p className="coach-eyebrow">Count check</p>
        <p className="coach-title">
          {skipped ? "Skipped" : correct ? "✓ Spot on" : "✗ Not quite"}: the running count was{" "}
          {signed(check.expected)}
        </p>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    game.actions.answerCountCheck(parsed);
    setValue("");
  };

  return (
    <form className="coach-card count-check" onSubmit={submit}>
      <label className="coach-eyebrow" htmlFor="count-answer">
        Count check
      </label>
      <p className="coach-text">What is the running count right now?</p>
      <div className="count-input-row">
        <input
          id="count-answer"
          inputMode="numeric"
          pattern="-?[0-9]*"
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. -3"
        />
        <button type="submit" className="btn btn-primary btn-small">
          Check
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => game.actions.answerCountCheck(null)}
        >
          Skip
        </button>
      </div>
    </form>
  );
}

/** Hints, trainer feedback, progress and counting, beside (or below) the table. */
export function CoachPanel({ game }: { game: GameViewModel }) {
  const advice = game.autoRecommendation;

  return (
    <aside className="coach" aria-label="Coach">
      <div className="coach-header">
        <span className="level-badge">Level {game.level.id}</span>
        <span className="coach-level-name">{game.level.name}</span>
        {game.trainer.accuracy === null ? null : (
          <span className="coach-accuracy" title="Basic-strategy accuracy, all levels">
            {percent(game.trainer.accuracy)} accuracy
          </span>
        )}
      </div>

      {game.trainer.decisions === 0 && game.isBetweenHands ? (
        <div className="coach-card welcome">
          <p className="coach-eyebrow">Welcome</p>
          <p className="coach-title">Learn blackjack one decision at a time</p>
          <p className="coach-text">
            Play hands and the coach checks every move against basic strategy, the mathematically
            best play. You start with hit or stand; doubling, splitting and card counting unlock as
            you improve.
          </p>
          <p className="coach-text">Pick a chip and press Deal to start.</p>
        </div>
      ) : null}

      {game.feedback ? (
        <div
          className={`coach-card ${game.feedback.correct ? "is-correct" : "is-mistake"}`}
          role="status"
        >
          <p className="coach-eyebrow coach-situation">{capitalize(game.feedback.situation)}</p>
          <p className="coach-title">
            {game.feedback.correct
              ? `✓ ${game.feedback.chosen} is right`
              : `✗ Basic strategy says ${game.feedback.action}`}
          </p>
          <p className="coach-text">{game.feedback.explanation}</p>
        </div>
      ) : null}

      {advice ? (
        <div className="coach-card is-advice" id="auto-hint">
          <p className="coach-eyebrow coach-situation">
            Suggested · {capitalize(advice.situation)}
          </p>
          <p className="coach-title">{advice.action}</p>
          <p className="coach-text">{advice.explanation}</p>
        </div>
      ) : game.hint ? (
        <div className="coach-card is-advice" role="status">
          {game.hint.kind === "advice" ? (
            <>
              <p className="coach-eyebrow coach-situation">
                Hint · {capitalize(game.hint.situation)}
              </p>
              <p className="coach-title">{game.hint.action}</p>
            </>
          ) : null}
          <p className="coach-text">{game.hint.detail}</p>
        </div>
      ) : !game.level.assists.autoHint ? (
        <button
          type="button"
          className="btn btn-accent btn-block"
          onClick={game.actions.requestHint}
          disabled={!game.can.hint}
          aria-keyshortcuts="G"
        >
          Get a hint <kbd className="kbd">G</kbd>
        </button>
      ) : null}

      {game.count ? (
        <div className="coach-card count-card">
          <div>
            <p className="coach-eyebrow">Running</p>
            <p className="count-value">{signed(game.count.running)}</p>
          </div>
          <div>
            <p className="coach-eyebrow">True</p>
            <p className="count-value">{signed(game.count.true)}</p>
          </div>
          <div>
            <p className="coach-eyebrow">Decks left</p>
            <p className="count-value">{game.count.decksRemaining}</p>
          </div>
        </div>
      ) : null}

      <CountCheckForm game={game} />
      <LevelProgress game={game} />
    </aside>
  );
}
