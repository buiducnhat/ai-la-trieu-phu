"use client";

import { bedFor, finalAnswerFor, hasReadyCue, lifelineCue, rightFor, wrongFor } from "./audio-cues";
import type { AudioKey } from "./audio-manifest";
import type { LifelineId } from "./game/rules";

/**
 * Âm thanh ván chơi: phát tệp thật của chương trình (`public/audio`, tải bằng
 * `bun scripts/fetch-audio.ts`); tệp nào thiếu thì dùng tiếng chiptune tổng hợp bằng WebAudio.
 */

export type SoundEvent =
  | { type: "select" }
  | { type: "start" }
  | { type: "question"; n: number }
  | { type: "lock"; n: number }
  | { type: "result"; n: number; correct: boolean }
  | { type: "lifeline"; id: LifelineId }
  | { type: "lifelineClosed" }
  | { type: "walkAway" }
  | { type: "stop" };

// ---- Chiptune dự phòng ----------------------------------------------------

type SynthName = "select" | "lock" | "correct" | "wrong" | "win" | "lifeline" | "start";

type Note = [freq: number, ms: number];

const SYNTH: Record<SynthName, { wave: OscillatorType; notes: Note[]; gain?: number }> = {
  select: { wave: "square", notes: [[660, 50]] },
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
  // Safari cũ chỉ có tiền tố webkit; lib.dom không khai báo nên ép kiểu có chủ đích.
  const legacy =
    "webkitAudioContext" in window ? (window.webkitAudioContext as typeof AudioContext) : undefined;
  const Ctor = window.AudioContext ?? legacy;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function synth(name: SynthName): void {
  const ac = context();
  if (!ac) return;
  const { wave, notes, gain = 0.08 } = SYNTH[name];
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

// ---- Tệp âm thanh thật ----------------------------------------------------

const VOLUME = 0.8;

interface Step {
  key: AudioKey;
  loop?: boolean;
  /** Giây bắt đầu phát (mặc định từ đầu). */
  from?: number;
}

/** Hàng đợi đang phát. `el` null khi bước hiện tại không có tệp (đã chuyển sang chiptune). */
interface Active {
  tag: string;
  el: HTMLAudioElement | null;
}

const elements = new Map<AudioKey, HTMLAudioElement>();
/** Tệp không tải/giải mã được (chưa chạy fetch-audio): không thử lại, dùng chiptune. */
const missing = new Set<AudioKey>();
let active: Active | null = null;
/** Mỗi lần dừng hoặc phát hàng đợi mới tăng một nấc để vô hiệu hóa hàng đợi cũ. */
let generation = 0;
/** Đã có ít nhất một tệp thật phát được: lúc đó mới đáng tải trước các tệp kế tiếp. */
let filesWork = false;
/** Nhạc nền của câu hiện tại và vị trí đang phát, để quay lại đúng chỗ sau quyền trợ giúp. */
let bed: { key: AudioKey; tag: string; position: number } | null = null;
let lifelineEarlyEnd: AudioKey | null = null;

function audioFor(key: AudioKey): HTMLAudioElement {
  let el = elements.get(key);
  if (!el) {
    el = new Audio(`/audio/${key}.mp3`);
    el.preload = "auto";
    el.volume = VOLUME;
    elements.set(key, el);
  }
  return el;
}

function preload(keys: AudioKey[]): void {
  if (!filesWork || typeof Audio === "undefined") return;
  for (const key of keys) if (!missing.has(key)) audioFor(key);
}

function halt(): void {
  generation++;
  if (active?.el) {
    active.el.onended = null;
    active.el.pause();
    active.el.currentTime = 0;
    active.el.loop = false;
  }
  active = null;
}

function playQueue(steps: Step[], tag: string, fallback?: SynthName): void {
  if (typeof Audio === "undefined") {
    if (fallback) synth(fallback);
    return;
  }
  halt();
  const id = generation;
  const current: Active = { tag, el: null };
  active = current;

  const run = (i: number): void => {
    const step = steps[i];
    if (id !== generation || !step) return;
    if (missing.has(step.key)) {
      if (i === 0 && fallback) synth(fallback);
      run(i + 1);
      return;
    }
    const el = audioFor(step.key);
    current.el = el;
    el.loop = step.loop === true;
    el.currentTime = step.from ?? 0;
    el.onended = () => run(i + 1);
    el.play().then(
      () => {
        filesWork = true;
      },
      (err: unknown) => {
        if (id !== generation) return;
        const name = err instanceof DOMException ? err.name : "";
        // Trình duyệt chặn phát tự động hoặc phát bị ngắt: giữ im lặng, không đánh dấu hỏng.
        if (name === "NotAllowedError" || name === "AbortError") return;
        missing.add(step.key);
        if (i === 0 && fallback) synth(fallback);
        run(i + 1);
      },
    );
  };
  run(0);
}

export function stopSound(): void {
  halt();
  bed = null;
}

/** Nhạc nền câu n; câu 1 chờ nhạc "Lên ghế nóng" phát xong rồi mới vào. */
function startQuestion(n: number): void {
  const tag = `q${n}`;
  if (active?.tag === tag) return;
  const key = bedFor(n);
  bed = { key, tag, position: 0 };
  const steps: Step[] = [{ key, loop: true }];
  if (hasReadyCue(n)) steps.unshift({ key: "ready" });

  const intro = active?.tag === "start" ? active.el : null;
  if (intro && !intro.ended && !intro.paused) {
    active = { tag, el: intro };
    const handoff = generation;
    intro.onended = () => {
      if (handoff === generation) playQueue(steps, tag);
    };
  } else {
    playQueue(steps, tag);
  }
  if (n < 15) preload([bedFor(n + 1)]);
  const final = finalAnswerFor(n);
  preload([...(final ? [final] : []), ...rightFor(n), wrongFor(n)]);
}

function closeLifeline(): void {
  // Đang ở nhạc nền (hết đồng hồ hoặc chưa có trợ giúp nào): không làm gì.
  if (active?.tag !== "life" || active.el?.loop) return;
  const steps: Step[] = [];
  if (lifelineEarlyEnd) steps.push({ key: lifelineEarlyEnd });
  if (bed) steps.push({ key: bed.key, loop: true, from: bed.position });
  playQueue(steps, bed?.tag ?? "life-end");
}

export function playSound(event: SoundEvent, enabled: boolean): void {
  if (!enabled) return;
  switch (event.type) {
    case "select":
      synth("select");
      return;
    case "start":
      bed = null;
      playQueue([{ key: "intro" }], "start", "start");
      preload(["ready", "bed-1-5", "right-1-4", "wrong-1-5"]);
      return;
    case "question":
      startQuestion(event.n);
      return;
    case "lock": {
      const key = finalAnswerFor(event.n);
      // Câu 1–5 không có nhạc riêng khi khóa đáp án: nhạc nền chạy tiếp.
      if (!key) {
        if (missing.has(bedFor(event.n))) synth("lock");
        return;
      }
      bed = null;
      playQueue([{ key }], `lock${event.n}`, "lock");
      return;
    }
    case "result": {
      bed = null;
      const steps = event.correct ? rightFor(event.n) : [wrongFor(event.n)];
      const fallback = event.correct ? (event.n === 15 ? "win" : "correct") : "wrong";
      playQueue(
        steps.map((key) => ({ key })),
        `r${event.n}`,
        fallback,
      );
      return;
    }
    case "lifeline": {
      const cue = lifelineCue(event.id);
      lifelineEarlyEnd = cue.earlyEnd;
      const steps: Step[] = cue.steps.map((key) => ({ key }));
      if (bed) {
        // Đang nghe nhạc nền thì nhớ vị trí; đang ở giữa một trợ giúp khác thì giữ vị trí cũ.
        if (active?.el && active.el === elements.get(bed.key)) bed.position = active.el.currentTime;
        steps.push({ key: bed.key, loop: true, from: bed.position });
      }
      playQueue(steps, "life", "lifeline");
      return;
    }
    case "lifelineClosed":
      closeLifeline();
      return;
    case "walkAway":
      bed = null;
      playQueue([{ key: "turn-over" }], "end");
      return;
    case "stop":
      stopSound();
      return;
  }
}
