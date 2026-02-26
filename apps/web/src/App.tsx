import { BlackjackTable } from "./components/BlackjackTable";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Blackjack MVP</p>
        <h1>Blackjack</h1>
        <p className="subtitle">
          Frontend-first blackjack MVP with shared game logic and basic-strategy hints.
        </p>
      </header>
      <BlackjackTable />
    </main>
  );
}
