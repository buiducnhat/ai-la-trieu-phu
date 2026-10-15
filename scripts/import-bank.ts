/**
 * Nhập ngân hàng câu hỏi từ nguồn công khai -> src/data/bank/{questions,sources}.json
 *
 * Chạy: bun scripts/import-bank.ts
 * Xác định (deterministic): cùng dữ liệu gốc + data/bank-ratings.json => cùng kết quả.
 * Không cần LLM: mức độ/thể loại/ok lấy từ data/bank-ratings.json (xem README).
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface Candidate {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  source: string;
  /** Tier gốc của nguồn: 0 = dễ, 1 = thường, 2 = khó; null nếu nguồn không có tier. */
  tier: 0 | 1 | 2 | null;
}

export interface Rating {
  level: number;
  ok: boolean;
  category?: string;
  score?: number;
}

export interface BankQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  level: number;
  category?: string;
  explanation?: string;
  source: string;
}

const ROOT = resolve(import.meta.dir, "..");
const OUT_Q = join(ROOT, "src/data/bank/questions.json");
const OUT_S = join(ROOT, "src/data/bank/sources.json");
const RATINGS = join(ROOT, "data/bank-ratings.json");

export const CATEGORIES = [
  "Lịch sử",
  "Địa lý",
  "Văn học",
  "Khoa học",
  "Thể thao",
  "Âm nhạc",
  "Điện ảnh",
  "Đời sống",
  "Văn hóa",
  "Công nghệ",
  "Toán học",
  "Ngôn ngữ",
  "Kiến thức chung",
];

const HF_ID = "hf-thaotac870";
const GH_ID = "gh-zero4897hn";
const HF_DATASET = "nlplabtdtu/general-multi-choices-ailatrieuphu-870";
const GH_BASE =
  "https://raw.githubusercontent.com/zero4897hn/AiLaTrieuPhu/master/app/src/main/assets/";
const GH_FILES = ["Milionare1806.sqlite", "Milionare1805.sqlite", "Milionare1804.sqlite"];
const GH_TABLES: [string, 0 | 1 | 2][] = [
  ["CauHoiDe", 0],
  ["CauHoiThuong", 1],
  ["CauHoiKho", 2],
];

// ---------- chuẩn hóa ----------
function clean(s: unknown): string {
  return (typeof s === "string" ? s : s == null ? "" : JSON.stringify(s))
    .normalize("NFC")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanQuestion(s: unknown): string {
  let t = clean(s);
  for (let i = 0; i < 3; i++) {
    t = t
      .replace(/^(câu\s*(hỏi\s*)?\d+\s*[:.)-]?\s*)/i, "")
      .replace(/^\d{1,3}\s*[.)]\s+/, "")
      .replace(/^[\s.\-–—:)]+/, "");
  }
  t = t.replace(/([“‘(])\s+/g, "$1").replace(/\s+([”’)?!,;:])/g, "$1");
  return t.trim();
}

function cleanOption(s: unknown): string {
  let t = clean(s);
  t = t.replace(/^[A-Da-d]\s*[.):]\s+/, "").replace(/^[\s.\-–—:)]+/, "");
  return t.trim();
}

export function foldKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeId(source: string, question: string): string {
  return `${source}-${createHash("sha1").update(foldKey(question)).digest("hex").slice(0, 10)}`;
}

const MEDIA_RE =
  /hình\s*(bên|dưới|sau|trên|vẽ|ảnh)|trong\s*(hình|ảnh|video|clip)|bức\s*(hình|ảnh|tranh)\s*(bên|dưới|sau|trên)|ảnh\s*(bên|dưới|sau|trên)|đoạn\s*(video|clip|phim|âm thanh|nhạc)|xem\s*(hình|ảnh|video|clip)|nghe\s*(đoạn|bài|clip)|video|logo\s*(bên|dưới|sau)|biểu\s*tượng\s*(bên|dưới|sau)/i;
const META_OPTION_RE =
  /(cả|tất cả|các)\s*(đáp án|câu|ý|phương án)?\s*(a|b|c|d|trên|đều)\b|không\s*có\s*đáp\s*án|đáp\s*án\s*[a-d]\b/i;

/** Trả về [options, answerIndex] sạch hoặc null nếu phải loại. */
function finalize(
  source: string,
  rawQ: unknown,
  rawOpts: unknown[],
  pickAnswer: (opts: string[]) => number,
  tier: Candidate["tier"],
): Candidate | null {
  const question = cleanQuestion(rawQ);
  const options = rawOpts.map(cleanOption);
  if (question.length < 12 || question.length > 400) return null;
  if (MEDIA_RE.test(question)) return null;
  if (options.length !== 4 || options.some((o) => !o || o.length > 160)) return null;
  if (new Set(options.map(foldKey)).size !== 4) return null;
  if (options.some((o) => META_OPTION_RE.test(o) && o.length < 40)) return null;
  const a = pickAnswer(options);
  if (!(a >= 0 && a <= 3)) return null;
  return {
    id: makeId(source, question),
    question,
    options: options as Candidate["options"],
    answer: a as 0 | 1 | 2 | 3,
    source,
    tier,
  };
}

// ---------- tải nguồn ----------
interface HFPage {
  num_rows_total?: number;
  rows?: {
    row: { Question: string; Options?: { key: string; answer: string }[]; Answer: string };
  }[];
}
interface GHRow {
  cauHoi: string;
  dapAnA: string;
  dapAnB: string;
  dapAnC: string;
  dapAnD: string;
  cauTraLoi: string;
}

async function fetchRetry(url: string): Promise<Response> {
  let err: unknown;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
      err = new Error(`${r.status} ${url}`);
    } catch (e) {
      err = e;
    }
    await Bun.sleep(1000 * (i + 1));
  }
  throw err;
}

async function loadHF(): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (let offset = 0; ; offset += 100) {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${HF_DATASET}&config=default&split=train&offset=${offset}&length=100`;
    const j = (await (await fetchRetry(url)).json()) as HFPage;
    const rows = j.rows ?? [];
    for (const { row } of rows) {
      const opts = row.Options ?? [];
      const keys = opts.map((o) => clean(o.key).toUpperCase());
      const c = finalize(
        HF_ID,
        row.Question,
        opts.map((o) => o.answer),
        () => keys.indexOf(clean(row.Answer).toUpperCase()),
        null,
      );
      if (c) out.push(c);
    }
    if (offset + 100 >= (j.num_rows_total ?? 0) || rows.length === 0) break;
  }
  return out;
}

async function loadGH(): Promise<Candidate[]> {
  const dir = mkdtempSync(join(tmpdir(), "bank-"));
  const out: Candidate[] = [];
  for (const f of GH_FILES) {
    const path = join(dir, f);
    writeFileSync(path, new Uint8Array(await (await fetchRetry(GH_BASE + f)).arrayBuffer()));
    const db = new Database(path, { readonly: true });
    // khó -> thường -> dễ để câu trùng giữ tier cao hơn... xác định theo thứ tự cố định
    for (const [table, tier] of [...GH_TABLES].reverse()) {
      const rows = db
        .query(`select cauHoi, dapAnA, dapAnB, dapAnC, dapAnD, cauTraLoi from ${table} order by id`)
        .all() as GHRow[];
      for (const r of rows) {
        const opts = [r.dapAnA, r.dapAnB, r.dapAnC, r.dapAnD];
        const c = finalize(
          GH_ID,
          r.cauHoi,
          opts,
          (clean_opts) => {
            const want = foldKey(cleanOption(r.cauTraLoi));
            const hits = clean_opts.flatMap((o, i) => (foldKey(o) === want ? [i] : []));
            return hits.length === 1 ? (hits[0] as number) : -1;
          },
          tier,
        );
        if (c) out.push(c);
      }
    }
    db.close();
  }
  return out;
}

/** Tải + chuẩn hóa + khử trùng. Thứ tự ưu tiên: sqlite (có tier) rồi HF. */
export async function buildCandidates(): Promise<{ candidates: Candidate[]; dropped: number }> {
  const [gh, hf] = await Promise.all([loadGH(), loadHF()]);
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  let total = 0;
  for (const c of [...gh, ...hf]) {
    total++;
    const k = foldKey(c.question);
    if (seen.has(k)) continue;
    seen.add(k);
    candidates.push(c);
  }
  return { candidates, dropped: total - candidates.length };
}

// ---------- mức độ mặc định khi chưa có rating ----------
function defaultLevel(c: Candidate): number {
  if (c.tier !== null) return [3, 8, 13][c.tier] as number;
  const len = c.question.length + c.options.reduce((n, o) => n + o.length, 0);
  return Math.max(4, Math.min(12, Math.round(4 + len / 25)));
}

function sha(s: string): string {
  return createHash("sha1").update(s).digest("hex");
}

async function main() {
  const { candidates, dropped } = await buildCandidates();
  const ratings: Record<string, Rating> = existsSync(RATINGS)
    ? JSON.parse(readFileSync(RATINGS, "utf8"))
    : {};
  const bank: BankQuestion[] = [];
  let unrated = 0,
    rejected = 0;
  for (const c of candidates) {
    const r = ratings[c.id];
    if (!r) unrated++;
    else if (!r.ok) {
      rejected++;
      continue;
    }
    const level = r ? r.level : defaultLevel(c);
    const q: BankQuestion = {
      id: c.id,
      question: c.question,
      options: c.options,
      answer: c.answer,
      level,
      source: c.source,
    };
    if (r?.category && CATEGORIES.includes(r.category)) q.category = r.category;
    bank.push(q);
  }
  bank.sort((a, b) => a.level - b.level || (a.id < b.id ? -1 : 1));

  const counts = (s: string) => bank.filter((q) => q.source === s).length;
  const sources = [
    {
      id: HF_ID,
      name: "HuggingFace · ailatrieuphu-870 (thaotac.com)",
      url: `https://huggingface.co/datasets/${HF_DATASET}`,
      license: "unspecified",
      notes:
        "870 câu trắc nghiệm kiểu Ai là triệu phú; dataset không ghi giấy phép. Mức độ do LLM đánh giá.",
      count: counts(HF_ID),
    },
    {
      id: GH_ID,
      name: "GitHub · zero4897hn/AiLaTrieuPhu",
      url: "https://github.com/zero4897hn/AiLaTrieuPhu",
      license: "unspecified",
      notes:
        "Ba file sqlite của app Android, bảng CauHoiDe/CauHoiThuong/CauHoiKho (dễ/thường/khó) làm tiền đề mức độ; repo không có LICENSE.",
      count: counts(GH_ID),
    },
  ];

  mkdirSync(join(ROOT, "src/data/bank"), { recursive: true });
  const qJson = JSON.stringify(bank, null, 2) + "\n";
  writeFileSync(OUT_Q, qJson);
  writeFileSync(OUT_S, JSON.stringify(sources, null, 2) + "\n");

  const perLevel = Array.from(
    { length: 15 },
    (_, i) => bank.filter((q) => q.level === i + 1).length,
  );
  console.log(
    `candidates=${candidates.length} (duplicates removed: ${dropped}) rejected_by_rating=${rejected} kept=${bank.length}`,
  );
  console.log("per level:", perLevel.join(" "));
  console.log("per source:", sources.map((s) => `${s.id}=${s.count}`).join(" "));
  if (unrated)
    console.warn(`WARNING: ${unrated} câu chưa có rating -> dùng mức mặc định theo tier/độ dài`);
  console.log("questions.json sha1:", sha(qJson));
}

if (import.meta.main) await main();
