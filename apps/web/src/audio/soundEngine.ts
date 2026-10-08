import type { SoundCue } from "./cues";

/** Gap between consecutive cues in a sequence, so a four-card deal reads as four snaps. */
const CUE_SPACING_SECONDS: Record<SoundCue, number> = {
  deal: 0.11,
  flip: 0.16,
  shuffle: 0.65,
  chip: 0.08,
  hint: 0.1,
  correct: 0.1,
  mistake: 0.1,
  win: 0.1,
  blackjack: 0.1,
  lose: 0.1,
  push: 0.1,
};

const MASTER_VOLUME = 0.45;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

/**
 * Synthesizes all game sounds with the Web Audio API (see ADR-0004).
 *
 * No audio files are shipped. The AudioContext is created lazily on first use,
 * which always happens inside a user gesture, so browser autoplay policies are satisfied.
 */
export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  /** Plays cues back to back, starting now. */
  playSequence(cues: readonly SoundCue[]): void {
    if (this.muted || cues.length === 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    let at = ctx.currentTime + 0.01;
    for (const cue of cues) {
      this.schedule(cue, at);
      at += CUE_SPACING_SECONDS[cue];
    }
  }

  play(cue: SoundCue): void {
    this.playSequence([cue]);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      if (this.context.state === "suspended") void this.context.resume();
      return this.context;
    }

    const Ctor = getAudioContextConstructor();
    if (!Ctor) return null;

    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(ctx.destination);
      this.context = ctx;
      this.master = master;
      this.noise = createNoiseBuffer(ctx);
      return ctx;
    } catch {
      // Audio is a nice-to-have; never let it break the game.
      return null;
    }
  }

  private schedule(cue: SoundCue, at: number): void {
    switch (cue) {
      case "deal":
        this.noiseBurst(at, { duration: 0.07, frequency: 2600, q: 0.9, gain: 0.55 });
        break;
      case "flip":
        this.noiseBurst(at, { duration: 0.05, frequency: 1800, q: 1.2, gain: 0.45 });
        this.noiseBurst(at + 0.06, { duration: 0.06, frequency: 3200, q: 1, gain: 0.4 });
        break;
      case "shuffle":
        for (let i = 0; i < 14; i += 1) {
          this.noiseBurst(at + i * 0.04, {
            duration: 0.035,
            frequency: 2000 + (i % 3) * 600,
            q: 0.8,
            gain: 0.25,
          });
        }
        break;
      case "chip":
        this.tone(at, { frequency: 2400, duration: 0.05, type: "triangle", gain: 0.25 });
        this.tone(at + 0.045, { frequency: 3100, duration: 0.06, type: "triangle", gain: 0.2 });
        break;
      case "hint":
        this.tone(at, { frequency: 880, duration: 0.25, type: "sine", gain: 0.2 });
        this.tone(at + 0.09, { frequency: 1320, duration: 0.3, type: "sine", gain: 0.14 });
        break;
      case "correct":
        this.tone(at, { frequency: 1046.5, duration: 0.12, type: "sine", gain: 0.12 });
        break;
      case "mistake":
        this.tone(at, { frequency: 220, duration: 0.14, type: "triangle", gain: 0.16 });
        this.tone(at + 0.11, { frequency: 196, duration: 0.18, type: "triangle", gain: 0.14 });
        break;
      case "win":
        this.arpeggio(at, [523.25, 659.25, 783.99], 0.09, "triangle", 0.28);
        break;
      case "blackjack":
        this.arpeggio(at, [523.25, 659.25, 783.99, 1046.5, 1318.5], 0.075, "triangle", 0.3);
        this.tone(at + 0.4, { frequency: 2093, duration: 0.5, type: "sine", gain: 0.08 });
        break;
      case "lose":
        this.arpeggio(at, [392, 311.13], 0.16, "sine", 0.26);
        break;
      case "push":
        this.arpeggio(at, [587.33, 587.33], 0.12, "sine", 0.18);
        break;
    }
  }

  private tone(
    at: number,
    opts: { frequency: number; duration: number; type: OscillatorType; gain: number },
  ): void {
    const { context: ctx, master } = this;
    if (!ctx || !master) return;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.frequency, at);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(opts.gain, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + opts.duration);
    osc.connect(env).connect(master);
    osc.start(at);
    osc.stop(at + opts.duration + 0.02);
  }

  private arpeggio(
    at: number,
    frequencies: number[],
    step: number,
    type: OscillatorType,
    gain: number,
  ): void {
    frequencies.forEach((frequency, i) => {
      this.tone(at + i * step, { frequency, duration: step * 2.5, type, gain });
    });
  }

  private noiseBurst(
    at: number,
    opts: { duration: number; frequency: number; q: number; gain: number },
  ): void {
    const { context: ctx, master, noise } = this;
    if (!ctx || !master || !noise) return;

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    source.buffer = noise;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(opts.frequency, at);
    filter.Q.setValueAtTime(opts.q, at);
    env.gain.setValueAtTime(opts.gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + opts.duration);
    source.connect(filter).connect(env).connect(master);
    source.start(at);
    source.stop(at + opts.duration + 0.02);
  }
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}
