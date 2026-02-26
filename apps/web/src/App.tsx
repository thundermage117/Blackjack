import { BlackjackTable } from "./components/BlackjackTable";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Blackjack MVP</p>
        <h1>Blackjack</h1>
        <p className="subtitle">
          UI scaffold wired for a frontend-first game engine + hint engine.
        </p>
      </header>
      <BlackjackTable />
    </main>
  );
}
