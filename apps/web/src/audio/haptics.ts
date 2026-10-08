import type { SoundCue } from "./cues";

/** Vibration patterns (ms) for cues worth feeling. Most cues are sound-only. */
const PATTERNS: Partial<Record<SoundCue, number | number[]>> = {
  deal: 8,
  flip: 12,
  chip: 6,
  mistake: [30, 40, 30],
  win: [20, 30, 40],
  blackjack: [25, 30, 25, 30, 60],
  lose: 60,
};

/**
 * Vibrates for the strongest cue in a batch. Uses the Vibration API, which most
 * mobile browsers support (not iOS Safari); elsewhere this silently does nothing.
 */
export function vibrateFor(cues: readonly SoundCue[]): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const strongest = [...cues].reverse().find((cue) => PATTERNS[cue] !== undefined);
  if (!strongest) return;
  try {
    navigator.vibrate(PATTERNS[strongest] as number | number[]);
  } catch {
    // Some browsers throw without a user gesture; haptics are optional.
  }
}
