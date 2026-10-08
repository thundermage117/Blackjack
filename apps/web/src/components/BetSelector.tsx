interface BetSelectorProps {
  options: readonly number[];
  value: number;
  bankroll: number;
  disabled: boolean;
  onChange: (bet: number) => void;
}

export function BetSelector({ options, value, bankroll, disabled, onChange }: BetSelectorProps) {
  return (
    <div className="bet-selector" role="radiogroup" aria-label="Bet size">
      <span className="bet-label">Bet</span>
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          aria-keyshortcuts={String(index + 1)}
          className={`chip${option === value ? " is-selected" : ""}`}
          disabled={disabled || option > bankroll}
          onClick={() => onChange(option)}
          title={`Bet $${option} (key ${index + 1})`}
        >
          ${option}
        </button>
      ))}
    </div>
  );
}
