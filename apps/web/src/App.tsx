import { BlackjackTable } from "./components/BlackjackTable";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Blackjack MVP</p>
        <h1>Blackjack</h1>
        <p className="subtitle">
          Six-deck shoe, dealer stands on soft 17, blackjack pays 3:2. Ask for a hint any time.
        </p>
      </header>
      <BlackjackTable />
    </main>
  );
}
