"use client";

import { z } from "zod";

import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/game/types";

const SETTINGS_KEY = "altp:settings:v1";
const STATS_KEY = "altp:stats:v1";

const settingsSchema = z.object({
  source: z.enum(["bank", "llm", "mixed"]).catch(DEFAULT_SETTINGS.source),
  topic: z.string().max(80).catch(""),
  sound: z.boolean().catch(true),
  llm: z
    .object({
      provider: z.string().max(40).catch("server"),
      model: z.string().max(120).catch(""),
      apiKey: z.string().max(400).catch(""),
    })
    .catch(DEFAULT_SETTINGS.llm),
});

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Trình duyệt chặn localStorage (chế độ riêng tư...): bỏ qua, vẫn chơi được.
  }
}

export function loadSettings(defaultSource: GameSettings["source"]): GameSettings {
  const stored = read(SETTINGS_KEY);
  if (stored === undefined) return { ...DEFAULT_SETTINGS, source: defaultSource };
  return settingsSchema.parse(stored);
}

export function saveSettings(s: GameSettings): void {
  write(SETTINGS_KEY, s);
}

// ---------- thành tích ----------

export interface GameRecord {
  at: number;
  prize: number;
  answered: number;
  reason: "walkAway" | "wrong" | "won";
}

export interface Stats {
  games: number;
  best: number;
  history: GameRecord[];
}

const statsSchema = z.object({
  games: z.number().int().min(0).catch(0),
  best: z.number().min(0).catch(0),
  history: z
    .array(
      z.object({
        at: z.number(),
        prize: z.number(),
        answered: z.number(),
        reason: z.enum(["walkAway", "wrong", "won"]),
      }),
    )
    .catch([]),
});

export function loadStats(): Stats {
  return statsSchema.parse(read(STATS_KEY) ?? {});
}

export function recordGame(record: GameRecord): Stats {
  const prev = loadStats();
  const next: Stats = {
    games: prev.games + 1,
    best: Math.max(prev.best, record.prize),
    history: [record, ...prev.history].slice(0, 10),
  };
  write(STATS_KEY, next);
  return next;
}

// ---------- câu hỏi đã ra (qua nhiều ván) ----------

const RECENT_KEY = "altp:recent:v1";
const RECENT_MAX = 60;

/** Nội dung các câu đã ra ở những ván gần đây, cũ nhất trước; để AI không ra lại câu của ván trước. */
export function loadRecentQuestions(): string[] {
  return z.array(z.string()).catch([]).parse(read(RECENT_KEY));
}

export function rememberQuestion(text: string): void {
  const rest = loadRecentQuestions().filter((t) => t !== text);
  write(RECENT_KEY, [...rest, text].slice(-RECENT_MAX));
}
