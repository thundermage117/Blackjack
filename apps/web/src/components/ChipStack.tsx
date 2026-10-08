import { CHIP_TONES } from "./chipTones";

interface ChipStackProps {
  amount: number;
  /** Number of stacked chips to draw (e.g. 2 after a double). */
  stacks?: number;
}

/** A small chip stack sitting in a betting circle. */
export function ChipStack({ amount, stacks = 1 }: ChipStackProps) {
  return (
    <div className="bet-spot" aria-label={`Bet $${amount * stacks}`}>
      {Array.from({ length: stacks }, (_, i) => (
        <span key={i} className={`mini-chip ${CHIP_TONES[amount] ?? "chip-blue"}`}>
          {amount}
        </span>
      ))}
    </div>
  );
}
