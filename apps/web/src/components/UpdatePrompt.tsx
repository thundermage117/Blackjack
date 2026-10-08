import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registers the service worker and offers a reload when a new version has been downloaded.
 * The new version never takes over on its own, so a hand is never interrupted; the session
 * (including a hand in progress) is saved, so reloading mid-hand is safe.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  // The plugin only reloads tabs that already had a service worker when they opened, so a
  // first-visit tab would never reload. Reloading on any controller change covers both.
  const reload = () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
      once: true,
    });
    void updateServiceWorker(true);
  };

  return (
    <div className="update-prompt" role="status">
      <p className="update-prompt-text">A new version of the trainer is ready.</p>
      <div className="update-prompt-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={reload}>
          Reload
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
      </div>
    </div>
  );
}
