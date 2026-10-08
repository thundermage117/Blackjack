import { useEffect, useRef } from "react";

/** Maps a lowercase `KeyboardEvent.key` (e.g. "h", " ", "enter") to a handler. */
export type ShortcutMap = Record<string, () => void>;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}

/**
 * Registers single-key shortcuts on the window.
 *
 * Handlers are read through a ref so callers can pass a fresh object each
 * render without re-subscribing. Handlers are expected to guard their own
 * preconditions (e.g. "can the player hit right now?").
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      const handler = shortcutsRef.current[event.key.toLowerCase()];
      if (!handler) return;
      // Let Space/Enter keep activating a focused button instead of firing a shortcut too.
      if (
        (event.key === " " || event.key === "Enter") &&
        event.target instanceof HTMLButtonElement
      ) {
        return;
      }

      event.preventDefault();
      handler();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
