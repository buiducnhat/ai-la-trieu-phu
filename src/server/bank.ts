import "@tanstack/react-start/server-only";

import { z } from "zod";

import { pick, type Rng, shuffleOptions } from "./random";

/**
 * Kho câu hỏi: bộ dữ liệu công khai đóng gói sẵn (src/data/bank) cộng thêm các
 * bộ tải từ URL trong QUESTION_BANK_URLS (JSON công khai trên internet).
 */

export interface BankQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  /** Chỉ số 0..3 của đáp án đúng. */
  answer: number;
  /** Số thứ tự câu hỏi phù hợp (1..15). */
  level: number;
  category?: string;
  explanation?: string;
  source: string;
}

// ---------- chuẩn hóa dữ liệu ngoài ----------

const LETTER = /^[A-Da-d]$/;

function toText(v: unknown): string | null {
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

function firstDefined(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

function parseOptions(raw: unknown): string[] | null {
  if (Array.isArray(raw)) {
    const out = raw.map((o) => {
      if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        return toText(firstDefined(r, ["answer", "text", "content", "value", "label"]));
      }
      return toText(o);
    });
    return out.every((o): o is string => o !== null) ? out : null;
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const out = ["A", "B", "C", "D"].map((k) => toText(r[k] ?? r[k.toLowerCase()]));
    return out.every((o): o is string => o !== null) ? out : null;
  }
  return null;
}

const TIER_WORDS: Record<string, number> = {
  easy: 3,
  de: 3,
  dễ: 3,
  medium: 8,
  normal: 8,
  "trung bình": 8,
  thuong: 8,
  thường: 8,
  hard: 13,
  kho: 13,
  khó: 13,
};

function parseLevel(raw: unknown, id: string): number {
  if (typeof raw === "number" && Number.isFinite(raw))
    return Math.min(15, Math.max(1, Math.round(raw)));
  if (typeof raw === "string") {
    const n = Number(raw);
    if (Number.isFinite(n) && raw.trim() !== "") return Math.min(15, Math.max(1, Math.round(n)));
    const tier = TIER_WORDS[raw.trim().toLowerCase()];
    if (tier) return tier;
  }
  // Chưa có độ khó: gán ổn định theo id để mỗi lần tải cho cùng kết quả.
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 15) + 1;
}

function parseAnswer(raw: unknown, options: string[]): number | null {
  if (typeof raw === "number" && Number.isInteger(raw)) {
    // Chấp nhận 0-based; 1..4 cũng được hiểu là 1-based nếu 0 không xuất hiện (xử lý ở nơi gọi).
    return raw >= 0 && raw <= 3 ? raw : null;
  }
  const t = toText(raw);
  if (!t) return null;
  if (LETTER.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
  const idx = options.findIndex((o) => o.toLowerCase() === t.toLowerCase());
  return idx >= 0 ? idx : null;
}

/** Chấp nhận nhiều dạng JSON phổ biến; bỏ qua các dòng không hợp lệ. */
export function normalizeExternal(raw: unknown, sourceName: string): BankQuestion[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? ((): unknown[] => {
          const r = raw as Record<string, unknown>;
          const inner = firstDefined(r, ["questions", "data", "items", "allquestion"]);
          return Array.isArray(inner) ? inner : [];
        })()
      : [];

  const out: BankQuestion[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const question = toText(firstDefined(r, ["question", "q", "text", "cauHoi", "Question"]));
    const options = parseOptions(firstDefined(r, ["options", "Options", "choices", "answers"]));
    if (!question || !options || options.length !== 4) continue;
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) continue;
    const answer = parseAnswer(
      firstDefined(r, ["answer", "Answer", "correct", "correctAnswer", "dapAn"]),
      options,
    );
    if (answer === null) continue;
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id = toText(r.id) ?? `ext-${out.length}`;
    out.push({
      id: `${sourceName}:${id}`,
      question,
      options: options as [string, string, string, string],
      answer,
      level: parseLevel(firstDefined(r, ["level", "difficulty", "muc"]), `${sourceName}:${id}`),
      category: toText(firstDefined(r, ["category", "topic", "chuDe"])) ?? undefined,
      explanation: toText(firstDefined(r, ["explanation", "giaithich"])) ?? undefined,
      source: sourceName,
    });
  }
  return out;
}

// ---------- tải kho ----------

const bundledSchema = z.array(
  z.object({
    id: z.string(),
    question: z.string(),
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    answer: z.number().int().min(0).max(3),
    level: z.number().int().min(1).max(15),
    category: z.string().optional(),
    explanation: z.string().optional(),
    source: z.string(),
  }),
);

const sourcesSchema = z.array(z.object({ id: z.string(), name: z.string() }).passthrough());

let bundledCache: Promise<BankQuestion[]> | null = null;

async function loadBundled(): Promise<BankQuestion[]> {
  bundledCache ??= (async () => {
    const [{ default: questions }, { default: sources }] = await Promise.all([
      import("@/data/bank/questions.json"),
      import("@/data/bank/sources.json"),
    ]);
    const names = new Map(sourcesSchema.parse(sources).map((s) => [s.id, s.name]));
    return bundledSchema
      .parse(questions)
      .map((q) => ({ ...q, source: names.get(q.source) ?? q.source }));
  })();
  return bundledCache;
}

interface RemoteCacheEntry {
  at: number;
  data: Promise<BankQuestion[]>;
}
const REMOTE_TTL_MS = 60 * 60 * 1000;
const remoteCache = new Map<string, RemoteCacheEntry>();

function sourceNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

async function fetchRemote(url: string): Promise<BankQuestion[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return normalizeExternal(await res.json(), sourceNameFromUrl(url));
}

export function remoteBankUrls(env: Record<string, string | undefined> = process.env): string[] {
  return (env.QUESTION_BANK_URLS ?? "")
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u));
}

async function loadRemote(url: string): Promise<BankQuestion[]> {
  const cached = remoteCache.get(url);
  if (cached && Date.now() - cached.at < REMOTE_TTL_MS) return cached.data;
  const data = fetchRemote(url).catch((e: unknown) => {
    console.warn(`[bank] không tải được ${url}:`, e instanceof Error ? e.message : e);
    remoteCache.delete(url);
    return [] as BankQuestion[];
  });
  remoteCache.set(url, { at: Date.now(), data });
  return data;
}

export async function loadBank(): Promise<BankQuestion[]> {
  const [bundled, ...remote] = await Promise.all([
    loadBundled(),
    ...remoteBankUrls().map(loadRemote),
  ]);
  return [...bundled, ...remote.flat()];
}

// ---------- chọn câu hỏi ----------

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export interface PickOptions {
  number: number;
  exclude?: readonly string[];
  topic?: string;
  rng?: Rng;
}

/**
 * Chọn câu cho vị trí `number`. Ưu tiên đúng độ khó, nếu hết câu thì mở rộng
 * dần sang độ khó lân cận. Chủ đề chỉ là ưu tiên mềm.
 */
export function pickFromBank(
  bank: readonly BankQuestion[],
  opts: PickOptions,
): BankQuestion | null {
  const rng = opts.rng ?? Math.random;
  const excluded = new Set(opts.exclude ?? []);
  let pool = bank.filter((q) => !excluded.has(q.id));
  const topic = opts.topic?.trim();
  if (topic) {
    const t = fold(topic);
    const byTopic = pool.filter((q) => fold(`${q.category ?? ""} ${q.question}`).includes(t));
    if (byTopic.length >= 3) pool = byTopic;
  }
  if (pool.length === 0) return null;
  const distance = (q: BankQuestion) => Math.abs(q.level - opts.number);
  const best = Math.min(...pool.map(distance));
  return pick(
    pool.filter((q) => distance(q) === best),
    rng,
  );
}

export function toIssued(q: BankQuestion, rng: Rng = Math.random) {
  const { options, answer } = shuffleOptions(q.options, q.answer, rng);
  return { ...q, options, answer };
}
