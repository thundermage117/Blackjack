import { BLACKJACK_PAYOUTS, SUPPORTED_DECK_COUNTS, type TableOptions } from "@blackjack/game-core";
import { LEVELS, LEVEL_IDS } from "../learning/levels";
import type { Settings } from "../state/session";
import type { GameViewModel } from "../state/useBlackjackGame";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
      <span className="toggle-text">
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  format,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly T[];
  value: T;
  format: (option: T) => string;
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend>{label}</legend>
      <div className="segmented-options">
        {options.map((option) => (
          <label key={String(option)} className={option === value ? "is-selected" : ""}>
            <input
              type="radio"
              name={label}
              checked={option === value}
              onChange={() => onChange(option)}
            />
            {format(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SettingsDialogContent({ game }: { game: GameViewModel }) {
  const { settings, actions, tableOptions } = game;
  const set = (patch: Partial<Settings>) => actions.updateSettings(patch);
  const setTable = (patch: Partial<TableOptions>) =>
    actions.setTableOptions({ ...tableOptions, ...patch });
  const rulesEditable = game.level.assists.tableRulesEditable;
  const locked = !game.isBetweenHands;

  return (
    <div className="settings">
      <section>
        <h3>Level</h3>
        <p className="settings-note">
          Levels unlock more of the game as you learn. Jump ahead any time.
          {locked ? " You can change level between hands." : ""}
        </p>
        <div className="level-grid">
          {LEVEL_IDS.map((id) => {
            const def = LEVELS[id];
            const current = id === game.level.id;
            return (
              <button
                key={id}
                type="button"
                className={`level-card${current ? " is-current" : ""}`}
                aria-pressed={current}
                disabled={locked}
                onClick={() => actions.setLevel(id)}
              >
                <span className="level-card-head">
                  <span className="level-badge">Level {id}</span>
                  <strong>{def.name}</strong>
                </span>
                <span className="level-card-tagline">{def.tagline}</span>
                <ul>
                  {def.unlocks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3>Table rules</h3>
        {rulesEditable ? (
          <p className="settings-note">
            Changing rules starts a fresh shoe. Hints and the strategy chart follow the table.
          </p>
        ) : (
          <p className="settings-note">
            Unlocks at Level 3. Until then you play the standard table: 6 decks, dealer stands on
            soft 17, double after split, blackjack pays 3:2.
          </p>
        )}
        <div className="rules-grid">
          <Segmented
            label="Decks"
            options={SUPPORTED_DECK_COUNTS}
            value={tableOptions.deckCount}
            format={(n) => String(n)}
            onChange={(deckCount) => setTable({ deckCount })}
            disabled={!rulesEditable || locked}
          />
          <Segmented
            label="Soft 17"
            options={["stand", "hit"] as const}
            value={tableOptions.dealerSoft17}
            format={(rule) => (rule === "stand" ? "Dealer stands" : "Dealer hits")}
            onChange={(dealerSoft17) => setTable({ dealerSoft17 })}
            disabled={!rulesEditable || locked}
          />
          <Segmented
            label="Blackjack pays"
            options={BLACKJACK_PAYOUTS}
            value={tableOptions.blackjackPayout}
            format={(p) => (p === 1.5 ? "3:2" : "6:5")}
            onChange={(blackjackPayout) => setTable({ blackjackPayout })}
            disabled={!rulesEditable || locked}
          />
          <fieldset className="rules-toggles" disabled={!rulesEditable || locked}>
            <legend>Options</legend>
            <Toggle
              label="Double after split"
              checked={tableOptions.doubleAfterSplit}
              onChange={(doubleAfterSplit) => setTable({ doubleAfterSplit })}
            />
            <Toggle
              label="Late surrender"
              checked={tableOptions.surrender}
              onChange={(surrender) => setTable({ surrender })}
            />
          </fieldset>
        </div>
        {rulesEditable && tableOptions.blackjackPayout === 1.2 ? (
          <p className="settings-warning">
            6:5 tables pay $12 instead of $15 on a $10 blackjack. That adds about 1.4% to the house
            edge, more than every other rule here combined. Avoid them in real casinos.
          </p>
        ) : null}
      </section>

      <section>
        <h3>Preferences</h3>
        <div className="toggle-list">
          <Toggle label="Sound" checked={!settings.muted} onChange={(on) => set({ muted: !on })} />
          <Toggle
            label="Vibration"
            hint="On phones that support it"
            checked={settings.haptics}
            onChange={(haptics) => set({ haptics })}
          />
          <Toggle
            label="Coach feedback"
            hint={
              game.level.assists.feedback === "every"
                ? "After every decision"
                : "When a decision differs from basic strategy"
            }
            checked={settings.feedback}
            onChange={(feedback) => set({ feedback })}
          />
          {game.level.assists.counting ? (
            <>
              <Toggle
                label="Show the count"
                checked={settings.showCount}
                onChange={(showCount) => set({ showCount })}
              />
              <Toggle
                label="Count checks"
                hint="Quiz the running count every 5 hands"
                checked={settings.countChecks}
                onChange={(countChecks) => set({ countChecks })}
              />
              <Toggle
                label="Hide hand totals"
                hint="Add up the cards yourself, like in a casino"
                checked={settings.hideTotals}
                onChange={(hideTotals) => set({ hideTotals })}
              />
            </>
          ) : null}
        </div>
      </section>

      <section>
        <h3>Session</h3>
        <p className="settings-note">
          Start over with $1,000 and clear your record and trainer stats. Your level and settings
          are kept.
        </p>
        <button type="button" className="btn btn-danger" onClick={actions.reset}>
          Reset session
        </button>
      </section>
    </div>
  );
}
