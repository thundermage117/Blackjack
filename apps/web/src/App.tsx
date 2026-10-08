import { BlackjackTable } from "./components/BlackjackTable";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>
          Blackjack <span className="app-header-sub">Trainer</span>
        </h1>
      </header>
      <BlackjackTable />
    </main>
  );
}
