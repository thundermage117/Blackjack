import { useState } from "react";
import { useKeyboardShortcuts, type ShortcutMap } from "../hooks/useKeyboardShortcuts";
import { useBlackjackGame } from "../state/useBlackjackGame";
import { ActionBar } from "./ActionBar";
import { CoachPanel, FeedbackCard } from "./CoachPanel";
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

  return (
    <>
      <nav className="toolbar" aria-label="Game menu">
        <div className="toolbar-bankroll">
          <span className="toolbar-label">Bankroll</span>
          <span className="bankroll">${game.bankroll.toLocaleString()}</span>
        </div>
        <div className="toolbar-buttons">
          <button
            type="button"
            className="tool-btn"
            onClick={() => setDialog("chart")}
            disabled={!chartAvailable}
            aria-keyshortcuts="C"
            title={chartAvailable ? "Strategy chart (C)" : "Available after your first hand"}
          >
            Chart
          </button>
          <button type="button" className="tool-btn" onClick={() => setDialog("stats")}>
            Stats
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
            {game.settings.muted ? "🔇" : "🔊"}
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => setDialog("settings")}
            aria-label={`Settings, level ${level.id}`}
          >
            ⚙ Level {level.id}
          </button>
        </div>
      </nav>

      <div className="game-layout">
        <section className="table-column" aria-label="Blackjack table">
          <TableFelt game={game} rules={game.rules} />
          <ActionBar game={game} />
          <FeedbackCard game={game} className="feedback-inline" />
        </section>
        <CoachPanel game={game} />
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
