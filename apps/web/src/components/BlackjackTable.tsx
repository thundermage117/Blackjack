import { useState } from "react";
import { useKeyboardShortcuts, type ShortcutMap } from "../hooks/useKeyboardShortcuts";
import { useBlackjackGame } from "../state/useBlackjackGame";
import { ActionBar } from "./ActionBar";
import { COMPACT_LAYOUT_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import { CoachPanel, FeedbackCard } from "./CoachPanel";
import { CoachStrip } from "./CoachStrip";
import { ChartIcon, SettingsIcon, SoundOffIcon, SoundOnIcon, StatsIcon } from "./icons";
import { Modal } from "./Modal";
import { SettingsDialogContent } from "./SettingsDialog";
import { StatsDialogContent } from "./StatsDialog";
import { StrategyChart } from "./StrategyChart";
import { TableFelt } from "./TableFelt";

type DialogId = "chart" | "stats" | "settings" | null;

export function BlackjackTable() {
  const game = useBlackjackGame();
  const [dialog, setDialog] = useState<DialogId>(null);
  const { can, actions, level } = game;

  const shortcuts: ShortcutMap = {};
  if (dialog === null) {
    if (can.deal) shortcuts.n = shortcuts[" "] = shortcuts.enter = actions.deal;
    if (can.hit) shortcuts.h = actions.hit;
    if (can.stand) shortcuts.s = actions.stand;
    if (can.double && level.actions.double) shortcuts.d = actions.double;
    if (can.split && level.actions.split) shortcuts.p = actions.split;
    if (can.surrender) shortcuts.r = actions.surrender;
    if (can.takeInsurance) shortcuts.i = () => actions.insurance(true);
    if (can.declineInsurance) shortcuts.o = () => actions.insurance(false);
    if (can.hint && !level.assists.autoHint) shortcuts.g = actions.requestHint;
    if (can.changeBet) {
      game.betOptions.forEach((option, i) => {
        shortcuts[String(i + 1)] = () => actions.setBet(option);
      });
    }
    shortcuts.c = () => setDialog("chart");
  }
  shortcuts.m = () => actions.updateSettings({ muted: !game.settings.muted });
  useKeyboardShortcuts(shortcuts);

  const chartAvailable = level.id >= 2 || game.trainer.decisions > 0;
  const compact = useMediaQuery(COMPACT_LAYOUT_QUERY);
  const { promotion } = level;

  return (
    <>
      <header className={`app-header${compact ? " is-compact" : ""}`}>
        <h1 className={compact ? "visually-hidden" : undefined}>
          Blackjack <span className="app-header-sub">Trainer</span>
        </h1>
        <div className="toolbar-bankroll">
          <span className="toolbar-label">Bankroll</span>
          <span className="bankroll">${game.bankroll.toLocaleString()}</span>
        </div>
        <nav className="toolbar-buttons" aria-label="Game menu">
          <button
            type="button"
            className="tool-btn"
            onClick={() => setDialog("chart")}
            disabled={!chartAvailable}
            aria-keyshortcuts="C"
            title={chartAvailable ? "Strategy chart (C)" : "Available after your first hand"}
            aria-label={compact ? "Chart" : undefined}
          >
            {compact ? <ChartIcon /> : "Chart"}
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => setDialog("stats")}
            aria-label={compact ? "Stats" : undefined}
            title="Stats"
          >
            {compact ? <StatsIcon /> : "Stats"}
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => actions.updateSettings({ muted: !game.settings.muted })}
            aria-pressed={!game.settings.muted}
            aria-label={game.settings.muted ? "Sound off" : "Sound on"}
            aria-keyshortcuts="M"
            title="Sound (M)"
          >
            {game.settings.muted ? <SoundOffIcon /> : <SoundOnIcon />}
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => setDialog("settings")}
            aria-label={`Settings, level ${level.id}`}
          >
            <SettingsIcon /> {compact ? `Lv ${level.id}` : `Level ${level.id}`}
          </button>
        </nav>
        {compact && promotion ? (
          <div
            className="header-progress"
            role="progressbar"
            aria-label="Decisions toward next level"
            aria-valuemin={0}
            aria-valuemax={promotion.minDecisions}
            aria-valuenow={Math.min(game.trainer.levelDecisions, promotion.minDecisions)}
          >
            <div
              className="header-progress-fill"
              style={{
                width: `${Math.min(1, game.trainer.levelDecisions / promotion.minDecisions) * 100}%`,
              }}
            />
          </div>
        ) : null}
      </header>

      <div className="game-layout">
        <section className="table-column" aria-label="Blackjack table">
          <div className="felt-wrap">
            <TableFelt game={game} rules={game.rules} showCount={compact} />
          </div>
          {compact ? <CoachStrip game={game} /> : null}
          <ActionBar game={game} />
          {compact ? null : <FeedbackCard game={game} className="feedback-inline" />}
        </section>
        {compact ? null : <CoachPanel game={game} />}
      </div>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {game.announcement}
      </p>

      <Modal open={dialog === "chart"} title="Basic strategy" onClose={() => setDialog(null)} wide>
        <StrategyChart
          table={game.strategy}
          highlight={game.chartCell}
          showPairs={level.actions.split}
        />
      </Modal>
      <Modal open={dialog === "stats"} title="Your stats" onClose={() => setDialog(null)}>
        <StatsDialogContent game={game} />
      </Modal>
      <Modal open={dialog === "settings"} title="Settings" onClose={() => setDialog(null)} wide>
        <SettingsDialogContent game={game} />
      </Modal>
    </>
  );
}
