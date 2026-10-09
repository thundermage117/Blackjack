import { useSyncExternalStore } from "react";

/** Whether a CSS media query matches, updated as the window resizes or rotates. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Phones, upright or sideways: the whole game fits one screen with a coach strip instead
 * of the side panel. `styles.css` uses the same query for the compact layout; keep the
 * two in step.
 */
export const COMPACT_LAYOUT_QUERY =
  "(max-width: 640px), (max-height: 520px) and (orientation: landscape)";
