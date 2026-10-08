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

  return (
    <div className="update-prompt" role="status">
      <p className="update-prompt-text">A new version of the trainer is ready.</p>
      <div className="update-prompt-actions">
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={() => void updateServiceWorker(true)}
        >
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
