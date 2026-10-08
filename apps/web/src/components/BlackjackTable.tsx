import type { Card } from "@blackjack/game-core";
import { useKeyboardShortcuts, type ShortcutMap } from "../hooks/useKeyboardShortcuts";
import { useBlackjackGame } from "../state/useBlackjackGame";
import { BetSelector } from "./BetSelector";
import { PlayingCard } from "./PlayingCard";

/** Stagger between cards of the opening deal, which alternates player/dealer. */
const DEAL_STAGGER_MS = 110;

function formatChips(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

function formatNet(net: number): string {
  if (net === 0) return "±$0";
  return `${net > 0 ? "+" : "−"}${formatChips(Math.abs(net))}`;
}

function HandCards({
  cards,
  handNumber,
  seat,
  hideSecond,
  isActive,
}: {
  cards: Card[];
  handNumber: number;
  seat: "player" | "dealer";
  hideSecond?: boolean;
  isActive?: boolean;
}) {
  if (cards.length === 0) {
    return <div className="empty-hand">No cards dealt yet</div>;
  }

  return (
    <div className={`card-row${isActive ? " is-active" : ""}`}>
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

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="kbd" aria-hidden="true">
      {children}
    </kbd>
  );
}

export function BlackjackTable() {
  const game = useBlackjackGame();

  const shortcuts: ShortcutMap = {};
  if (game.canDeal) shortcuts.n = shortcuts[" "] = shortcuts.enter = game.dealRound;
  if (game.canHit) shortcuts.h = game.hit;
  if (game.canStand) shortcuts.s = game.stand;
  if (game.canDouble) shortcuts.d = game.double;
  if (game.canRequestHint) shortcuts.g = game.requestHint;
  if (game.canChangeBet) {
    game.betOptions.forEach((option, i) => {
      shortcuts[String(i + 1)] = () => game.setBet(option);
    });
  }
  shortcuts.m = game.toggleMuted;
  useKeyboardShortcuts(shortcuts);

  const { stats } = game;

  return (
    <section className={`table-card phase-${game.phase}`} aria-label="Blackjack table">
      <div className={`status-banner tone-${game.resultTone}`}>
        <div className="banner-main">
          <span className="phase-pill">{game.phase.replace("-", " ")}</span>
          {game.resultLabel ? (
            <span className="result-pill">
              {game.resultLabel}
              {game.lastNet !== null ? ` · ${formatNet(game.lastNet)}` : ""}
            </span>
          ) : null}
          {game.isDealerRevealing ? <span className="spinner-dot" aria-hidden="true" /> : null}
        </div>
        <p className="banner-message" aria-live="polite">
          {game.statusMessage}
        </p>
        <dl className="banner-meta">
          <div>
            <dt>Bankroll</dt>
            <dd className="bankroll">{formatChips(game.bankroll)}</dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd>
              {stats.wins}W / {stats.losses}L / {stats.pushes}P
              {stats.blackjacks > 0 ? ` · ${stats.blackjacks} BJ` : ""}
            </dd>
          </div>
          <div>
            <dt>Shoe</dt>
            <dd>
              {game.shoeCardsRemaining} cards
              {game.reshufflePending ? " · reshuffle next" : ""}
            </dd>
          </div>
        </dl>
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
            handNumber={game.handNumber}
            seat="dealer"
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
              <p className="hand-label">Player · bet {formatChips(game.bet)}</p>
              <h2>{game.playerSummary.totalLabel}</h2>
            </div>
            <p className="hand-detail">{game.playerSummary.detailLabel}</p>
          </div>
          <HandCards
            cards={game.playerCards}
            handNumber={game.handNumber}
            seat="player"
            isActive={game.phase === "player-turn"}
          />
        </section>
      </div>

      {game.hint ? (
        <div className={`hint-panel hint-${game.hint.kind}`} role="status">
          {game.hint.kind === "advice" ? (
            <p className="hint-action">
              Hint: <strong>{game.hint.action}</strong>
            </p>
          ) : null}
          <p className="hint-detail">{game.hint.detail}</p>
        </div>
      ) : null}

      <div className="controls-shell">
        <BetSelector
          options={game.betOptions}
          value={game.bet}
          bankroll={game.bankroll}
          disabled={!game.canChangeBet}
          onChange={game.setBet}
        />

        <div className="controls primary-controls" role="group" aria-label="Round controls">
          <button
            type="button"
            className="btn btn-primary"
            onClick={game.dealRound}
            disabled={!game.canDeal}
            aria-keyshortcuts="N"
          >
            {game.dealLabel} <Kbd>N</Kbd>
          </button>
          <button
            type="button"
            className="btn"
            onClick={game.hit}
            disabled={!game.canHit}
            aria-keyshortcuts="H"
          >
            Hit <Kbd>H</Kbd>
          </button>
          <button
            type="button"
            className="btn"
            onClick={game.stand}
            disabled={!game.canStand}
            aria-keyshortcuts="S"
          >
            Stand <Kbd>S</Kbd>
          </button>
          <button
            type="button"
            className="btn"
            onClick={game.double}
            disabled={!game.canDouble}
            aria-keyshortcuts="D"
          >
            Double <Kbd>D</Kbd>
          </button>
        </div>

        <div className="controls utility-controls" role="group" aria-label="Utility controls">
          <button
            type="button"
            className="btn btn-accent"
            onClick={game.requestHint}
            disabled={!game.canRequestHint}
            aria-keyshortcuts="G"
          >
            Get Hint <Kbd>G</Kbd>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={game.toggleMuted}
            aria-pressed={!game.muted}
            aria-keyshortcuts="M"
          >
            Sound {game.muted ? "Off" : "On"} <Kbd>M</Kbd>
          </button>
          <button
            type="button"
            className={`btn btn-ghost${game.isOutOfChips ? " btn-attention" : ""}`}
            onClick={game.resetSession}
          >
            Reset Session
          </button>
        </div>
      </div>
    </section>
  );
}
