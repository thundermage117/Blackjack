import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { outcomeNote } from "../learning/trainer";
import type { GameViewModel } from "../state/useBlackjackGame";
import { CountCheckForm } from "./CoachPanel";
import { capitalize, percent } from "./format";

type Tone = "correct" | "mistake" | "advice" | "gold" | "plain";

interface MessageProps {
  tone: Tone;
  eyebrow: string;
  title: string;
  detail?: string;
  id?: string;
  live?: boolean;
  actions?: ReactNode;
}

/**
 * One coach message in two lines: a heading and a one-line detail that expands on tap.
 * The detail collapses again whenever the message changes.
 */
function StripMessage({ tone, eyebrow, title, detail, id, live, actions }: MessageProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const detailRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    setExpanded(false);
  }, [title, detail]);

  useLayoutEffect(() => {
    const el = detailRef.current;
    setOverflows(!!el && !expanded && el.scrollHeight > el.clientHeight + 1);
  }, [detail, expanded]);

  return (
    <div className={`strip-message tone-${tone}`} id={id} role={live ? "status" : undefined}>
      <p className="strip-eyebrow">{eyebrow}</p>
      <p className="strip-title">{title}</p>
      {detail ? (
        <div className="strip-detail-row">
          <p ref={detailRef} className={`strip-detail${expanded ? " is-expanded" : ""}`}>
            {detail}
          </p>
          {overflows || expanded ? (
            <button
              type="button"
              className="strip-more"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Less" : "More"}
            </button>
          ) : null}
        </div>
      ) : null}
      {actions ? <div className="strip-actions">{actions}</div> : null}
    </div>
  );
}

/** What the coach has to say right now, most urgent first. */
function stripContent(game: GameViewModel): ReactNode {
  if (game.countCheck) return <CountCheckForm game={game} />;

  if (game.promotionReady && game.nextLevel) {
    const next = game.nextLevel;
    return (
      <StripMessage
        tone="gold"
        eyebrow="Level up available"
        title={`Ready for Level ${next.id} · ${next.name}`}
        live
        actions={
          <>
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => game.actions.setLevel(next.id)}
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
          </>
        }
      />
    );
  }

  const { feedback } = game;
  if (feedback) {
    const note = outcomeNote(feedback, game.lastNet);
    return (
      <StripMessage
        tone={feedback.correct ? "correct" : "mistake"}
        eyebrow={capitalize(feedback.situation)}
        title={
          feedback.correct
            ? `✓ ${feedback.chosen} is right`
            : `✗ Basic strategy says ${feedback.action}`
        }
        detail={note ? `${feedback.explanation} ${note}` : feedback.explanation}
        live
      />
    );
  }

  const advice = game.autoRecommendation;
  if (advice) {
    return (
      <StripMessage
        tone="advice"
        id="auto-hint"
        eyebrow={`Suggested · ${capitalize(advice.situation)}`}
        title={advice.action}
        detail={advice.explanation}
      />
    );
  }

  if (game.hint) {
    return (
      <StripMessage
        tone="advice"
        eyebrow={game.hint.kind === "advice" ? `Hint · ${capitalize(game.hint.situation)}` : "Hint"}
        title={game.hint.kind === "advice" ? game.hint.action : game.hint.detail}
        detail={game.hint.kind === "advice" ? game.hint.detail : undefined}
        live
      />
    );
  }

  if (game.trainer.decisions === 0 && game.isBetweenHands) {
    return (
      <StripMessage
        tone="gold"
        eyebrow="Welcome"
        title="Learn blackjack one decision at a time"
        detail="Pick a chip and press Deal. The coach checks every move against basic strategy; doubling, splitting and counting unlock as you improve."
      />
    );
  }

  const { promotion } = game.level;
  const { levelDecisions, levelAccuracy, accuracy } = game.trainer;
  return (
    <StripMessage
      tone="plain"
      eyebrow={`Level ${game.level.id} · ${game.level.name}`}
      title={
        promotion
          ? `${Math.min(levelDecisions, promotion.minDecisions)}/${promotion.minDecisions} decisions · ${
              levelAccuracy === null ? "" : `${percent(levelAccuracy)} of `
            }${percent(promotion.minAccuracy)} needed`
          : `${percent(accuracy)} strategy accuracy`
      }
    />
  );
}

/**
 * The phone coach: one short message between the table and the moves, so feedback is
 * always on screen without scrolling. Wider screens use the full CoachPanel instead.
 */
export function CoachStrip({ game }: { game: GameViewModel }) {
  const showHint = !game.level.assists.autoHint && game.can.hint && !game.hint && !game.countCheck;

  return (
    <section className="coach-strip" aria-label="Coach">
      <div className="strip-body">{stripContent(game)}</div>
      {showHint ? (
        <button
          type="button"
          className="btn btn-accent btn-small strip-hint"
          onClick={game.actions.requestHint}
          aria-keyshortcuts="G"
          aria-label="Get a hint"
        >
          Hint
        </button>
      ) : null}
    </section>
  );
}
