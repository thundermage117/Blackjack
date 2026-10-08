import type { Decision } from "../learning/trainer";
import type { GameViewModel } from "../state/useBlackjackGame";
import { BetSelector } from "./BetSelector";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="kbd" aria-hidden="true">
      {children}
    </kbd>
  );
}

interface ActionButtonProps {
  label: string;
  shortcut: string;
  onClick: () => void;
  enabled: boolean;
  recommended: boolean;
  variant?: "primary" | "accent" | "ghost";
}

function ActionButton({
  label,
  shortcut,
  onClick,
  enabled,
  recommended,
  variant,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`btn${variant ? ` btn-${variant}` : ""}${recommended ? " is-recommended" : ""}`}
      onClick={onClick}
      disabled={!enabled}
      aria-keyshortcuts={shortcut}
      aria-describedby={recommended ? "auto-hint" : undefined}
    >
      {label} <Kbd>{shortcut}</Kbd>
    </button>
  );
}

/** Bet chips between hands, insurance during the offer, decision buttons during play. */
export function ActionBar({ game }: { game: GameViewModel }) {
  const { can, actions, level, table } = game;
  const recommended: Decision | null = game.autoRecommendation?.action ?? null;
  const is = (decision: Decision) => recommended === decision;

  if (table.phase === "insurance") {
    return (
      <div className="action-bar" role="group" aria-label="Insurance decision">
        <p className="action-prompt">Dealer shows an Ace. Insure for ${game.bet / 2}?</p>
        <div className="action-buttons cols-2">
          <ActionButton
            label="Insure"
            shortcut="I"
            onClick={() => actions.insurance(true)}
            enabled={can.takeInsurance}
            recommended={is("Take insurance")}
          />
          <ActionButton
            label="No insurance"
            shortcut="O"
            onClick={() => actions.insurance(false)}
            enabled={can.declineInsurance}
            recommended={is("No insurance")}
          />
        </div>
      </div>
    );
  }

  if (table.phase === "player-turn" && !game.isRevealing) {
    const buttons: ActionButtonProps[] = [
      {
        label: "Hit",
        shortcut: "H",
        onClick: actions.hit,
        enabled: can.hit,
        recommended: is("Hit"),
      },
      {
        label: "Stand",
        shortcut: "S",
        onClick: actions.stand,
        enabled: can.stand,
        recommended: is("Stand"),
      },
    ];
    if (level.actions.double) {
      buttons.push({
        label: "Double",
        shortcut: "D",
        onClick: actions.double,
        enabled: can.double,
        recommended: is("Double"),
      });
    }
    if (level.actions.split) {
      buttons.push({
        label: "Split",
        shortcut: "P",
        onClick: actions.split,
        enabled: can.split,
        recommended: is("Split"),
      });
    }
    if (level.actions.surrender && game.tableOptions.surrender) {
      buttons.push({
        label: "Surrender",
        shortcut: "R",
        onClick: actions.surrender,
        enabled: can.surrender,
        recommended: is("Surrender"),
        variant: "ghost",
      });
    }

    return (
      <div className="action-bar" role="group" aria-label="Your move">
        <div className={`action-buttons cols-${buttons.length}`}>
          {buttons.map((button) => (
            <ActionButton key={button.label} {...button} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="action-bar" role="group" aria-label="Bet and deal">
      <BetSelector
        options={game.betOptions}
        value={game.bet}
        bankroll={game.bankroll}
        disabled={!can.changeBet}
        onChange={actions.setBet}
      />
      <button
        type="button"
        className="btn btn-primary btn-deal"
        onClick={actions.deal}
        disabled={!can.deal}
        aria-keyshortcuts="N"
      >
        {game.dealLabel} <Kbd>N</Kbd>
      </button>
    </div>
  );
}
