import { Capacitor } from "@capacitor/core";
import { BlackjackTable } from "./components/BlackjackTable";
import { UpdatePrompt } from "./components/UpdatePrompt";

// The native app bundles every file and updates through the store, so it skips the service
// worker; a cached worker could otherwise keep serving the previous version's files.
const isNativeApp = Capacitor.isNativePlatform();

export function App() {
  return (
    <main className="app-shell">
      <BlackjackTable />
      {!isNativeApp && <UpdatePrompt />}
    </main>
  );
}
