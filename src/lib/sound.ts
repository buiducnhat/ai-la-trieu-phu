"use client";

/** Âm thanh chiptune tổng hợp bằng WebAudio, không cần file âm thanh. */

export type SoundName =
  | "select"
  | "lock"
  | "correct"
  | "wrong"
  | "win"
  | "lifeline"
  | "start"
  | "tick";

type Note = [freq: number, ms: number];

const SOUNDS: Record<SoundName, { wave: OscillatorType; notes: Note[]; gain?: number }> = {
  select: { wave: "square", notes: [[660, 50]] },
  tick: { wave: "square", notes: [[440, 30]], gain: 0.04 },
  start: {
    wave: "square",
    notes: [
      [392, 100],
      [523, 100],
      [659, 100],
      [784, 220],
    ],
  },
  lock: {
    wave: "triangle",
    notes: [
      [330, 120],
      [330, 120],
      [392, 240],
    ],
  },
  lifeline: {
    wave: "square",
    notes: [
      [523, 70],
      [659, 70],
      [784, 70],
      [1047, 140],
    ],
  },
  correct: {
    wave: "square",
    notes: [
      [523, 90],
      [659, 90],
      [784, 90],
      [1047, 260],
    ],
  },
  wrong: {
    wave: "sawtooth",
    notes: [
      [220, 200],
      [196, 200],
      [165, 200],
      [131, 520],
    ],
  },
  win: {
    wave: "square",
    notes: [
      [523, 120],
      [523, 120],
      [523, 120],
      [698, 360],
      [587, 120],
      [659, 120],
      [784, 480],
      [1047, 700],
    ],
  },
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  const ac = context();
  if (!ac) return;
  const { wave, notes, gain = 0.08 } = SOUNDS[name];
  let t = ac.currentTime;
  for (const [freq, ms] of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + ms / 1000);
    t += ms / 1000;
  }
}
