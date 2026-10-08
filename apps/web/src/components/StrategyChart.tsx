import { useState } from "react";
import {
  DEALER_UPCARD_KEYS,
  type StrategyAction,
  type StrategyTable,
} from "@blackjack/hint-engine";
import type { ChartCell, ChartSection } from "../learning/chart";

const SECTIONS: Array<{ id: ChartSection; label: string }> = [
  { id: "hard", label: "Hard totals" },
  { id: "soft", label: "Soft totals" },
  { id: "pair", label: "Pairs" },
];

const ACTION_LABEL: Record<StrategyAction | "P" | "R" | "-", string> = {
  H: "Hit",
  S: "Stand",
  D: "Double",
  P: "Split",
  R: "Surrender",
  "-": "Play the total",
};

function rowLabel(section: ChartSection, row: string): string {
  if (section === "hard") return row;
  if (section === "soft") return `A,${Number(row) - 11}`;
  return row === "A" ? "A,A" : `${row},${row}`;
}

function rowsFor(table: StrategyTable, section: ChartSection): string[] {
  if (section === "pair") return ["A", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  const rows = Object.keys(table[section]).map(Number);
  // Hard 4-8 are all "hit"; show them as one row.
  const visible = section === "hard" ? rows.filter((total) => total >= 8) : rows;
  return visible.sort((a, b) => a - b).map(String);
}

function cellCode(table: StrategyTable, section: ChartSection, row: string, upcard: string) {
  const key = upcard as keyof (typeof table.hard)[string];
  if (section === "pair") return table.pair[row as keyof typeof table.pair][key] ? "P" : "-";
  const surrenderRow = section === "hard" ? table.surrender[`hard:${row}`] : undefined;
  if (surrenderRow?.[key]) return "R";
  return table[section][row][key];
}

interface StrategyChartProps {
  table: StrategyTable;
  highlight: ChartCell | null;
  showPairs: boolean;
}

export function StrategyChart({ table, highlight, showPairs }: StrategyChartProps) {
  const sections = showPairs ? SECTIONS : SECTIONS.filter((s) => s.id !== "pair");
  const [active, setActive] = useState<ChartSection>(highlight?.section ?? "hard");
  const section = sections.some((s) => s.id === active) ? active : "hard";

  return (
    <div className="chart">
      <div className="chart-tabs" role="tablist" aria-label="Chart section">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            className={`chart-tab${section === s.id ? " is-active" : ""}`}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="chart-scroll">
        <table className="chart-grid">
          <caption className="visually-hidden">
            {sections.find((s) => s.id === section)?.label}: your hand down the side, dealer upcard
            across the top
          </caption>
          <thead>
            <tr>
              <th scope="col">You</th>
              {DEALER_UPCARD_KEYS.map((up) => (
                <th key={up} scope="col">
                  {up === "10" ? "T" : up}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsFor(table, section).map((row) => (
              <tr key={row}>
                <th scope="row">
                  {section === "hard" && row === "8" ? "4-8" : rowLabel(section, row)}
                </th>
                {DEALER_UPCARD_KEYS.map((up) => {
                  const code = cellCode(table, section, row, up);
                  const isHighlighted =
                    highlight?.section === section &&
                    highlight.upcard === up &&
                    (highlight.row === row ||
                      (section === "hard" && row === "8" && Number(highlight.row) <= 8));
                  return (
                    <td
                      key={up}
                      className={`cell cell-${code === "-" ? "none" : code}${isHighlighted ? " is-current" : ""}`}
                      title={ACTION_LABEL[code]}
                      aria-current={isHighlighted ? "true" : undefined}
                    >
                      {code === "-" ? "" : code}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="chart-legend">
        <li>
          <span className="cell cell-H">H</span> Hit
        </li>
        <li>
          <span className="cell cell-S">S</span> Stand
        </li>
        <li>
          <span className="cell cell-D">D</span> Double (else hit; soft 18+ else stand)
        </li>
        {showPairs ? (
          <li>
            <span className="cell cell-P">P</span> Split
          </li>
        ) : null}
        {Object.keys(table.surrender).length > 0 ? (
          <li>
            <span className="cell cell-R">R</span> Surrender
          </li>
        ) : null}
      </ul>
      <p className="chart-note">
        {table.metadata.dealerSoft17 === "hit" ? "Dealer hits soft 17" : "Dealer stands on soft 17"}{" "}
        · {table.metadata.doubleAfterSplit ? "double after split" : "no double after split"} · 4–8
        decks
      </p>
    </div>
  );
}
