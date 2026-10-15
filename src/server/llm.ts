import "@tanstack/react-start/server-only";

import { z } from "zod";

import { getPreset, type LlmKind } from "@/lib/llm-presets";
import { tierOf } from "@/lib/game/rules";

export interface LlmConfig {
  kind: LlmKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Để hiển thị (không chứa khóa). */
  label: string;
}

export interface ClientLlmInput {
  provider: string;
  model: string;
  apiKey: string;
}

type Env = Record<string, string | undefined>;

/** Cấu hình AI mặc định của máy chủ (biến môi trường). */
export function resolveEnvLlm(env: Env = process.env): LlmConfig | null {
  const explicit = env.LLM_PROVIDER?.trim().toLowerCase();
  const provider =
    explicit ||
    (env.LLM_BASE_URL
      ? "custom"
      : env.ANTHROPIC_API_KEY
        ? "anthropic"
        : env.OPENAI_API_KEY
          ? "openai"
          : "");
  if (!provider) return null;

  if (provider === "custom") {
    // Máy chủ tương thích OpenAI bất kỳ (Ollama, LM Studio, vLLM, LiteLLM...).
    const baseUrl = env.LLM_BASE_URL?.trim().replace(/\/+$/, "");
    const model = env.LLM_MODEL?.trim();
    if (!baseUrl || !model) return null;
    return {
      kind: "openai",
      baseUrl,
      apiKey: env.LLM_API_KEY ?? "",
      model,
      label: `${model} @ ${new URL(baseUrl).host}`,
    };
  }

  const preset = getPreset(provider);
  if (!preset) return null;
  const apiKey =
    env.LLM_API_KEY ||
    (provider === "anthropic"
      ? env.ANTHROPIC_API_KEY
      : provider === "openai"
        ? env.OPENAI_API_KEY
        : "") ||
    "";
  if (!apiKey) return null;
  const model = env.LLM_MODEL?.trim() || preset.defaultModel;
  return {
    kind: preset.kind,
    baseUrl: (env.LLM_BASE_URL?.trim() || preset.baseUrl).replace(/\/+$/, ""),
    apiKey,
    model,
    label: `${preset.label} · ${model}`,
  };
}

/**
 * Cấu hình AI do người chơi nhập trong trình duyệt. Chỉ cho phép các nhà cung
 * cấp có sẵn trong danh sách (không nhận URL tùy ý để tránh SSRF).
 */
export function resolveClientLlm(
  input: ClientLlmInput | undefined,
  env: Env = process.env,
): LlmConfig | null {
  if (!input || input.provider === "server") return resolveEnvLlm(env);
  const preset = getPreset(input.provider);
  const apiKey = input.apiKey.trim();
  if (!preset || !apiKey) return null;
  const model = input.model.trim() || preset.defaultModel;
  return {
    kind: preset.kind,
    baseUrl: preset.baseUrl,
    apiKey,
    model,
    label: `${preset.label} · ${model}`,
  };
}

// ---------- prompt ----------

const DIFFICULTY: Record<ReturnType<typeof tierOf>, string> = {
  easy: "DỄ: kiến thức phổ thông mà hầu hết người Việt trưởng thành đều biết, đáp án nhiễu rõ ràng là sai với người có hiểu biết cơ bản.",
  medium:
    "TRUNG BÌNH: cần vốn kiến thức nền tốt, các phương án nhiễu hợp lý khiến người chơi phải suy nghĩ hoặc loại trừ.",
  hard: "KHÓ: kiến thức chuyên sâu hoặc chi tiết ít người biết; mọi phương án đều nghe có vẻ hợp lý, người chơi cần hiểu biết thật sự mới chắc chắn.",
};

/**
 * Lĩnh vực ra đề. Không có chủ đề do người chơi chọn thì mỗi câu bốc ngẫu nhiên một lĩnh vực;
 * để mặc định "kiến thức chung" thì model lặp lại đúng vài câu quen thuộc.
 */
export const FIELDS = [
  "Lịch sử Việt Nam",
  "Lịch sử thế giới",
  "Địa lý Việt Nam",
  "Địa lý thế giới",
  "Văn học Việt Nam",
  "Văn học thế giới",
  "Vật lý và Thiên văn",
  "Hóa học",
  "Sinh học, động vật và thực vật",
  "Cơ thể người và Y học",
  "Toán học và Logic",
  "Công nghệ và Máy tính",
  "Âm nhạc",
  "Điện ảnh và Truyền hình",
  "Hội họa và Kiến trúc",
  "Thể thao",
  "Ẩm thực",
  "Phong tục và Lễ hội",
  "Ngôn ngữ, thành ngữ, tục ngữ",
  "Kinh tế và Tiền tệ",
  "Chính trị và Pháp luật",
  "Tôn giáo và Triết học",
  "Đời sống và Xã hội",
  "Phát minh và Nhân vật nổi tiếng",
] as const;

export interface GenerateInput {
  number: number;
  topic?: string;
  /** Nội dung các câu đã ra trong ván để tránh lặp. */
  avoid?: readonly string[];
  /** Lĩnh vực ra đề khi người chơi không chọn chủ đề (xem FIELDS). */
  field?: string;
}

export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  const tier = tierOf(input.number);
  const extra =
    input.number === 15
      ? " Đây là câu hỏi cuối cùng ('câu triệu phú') — phải thật hóc búa nhưng vẫn có đúng một đáp án có thể kiểm chứng."
      : "";
  const system = [
    "Bạn là biên tập viên ra đề cho chương trình truyền hình 'Ai là triệu phú' của Việt Nam.",
    "Bạn viết câu hỏi trắc nghiệm tiếng Việt chính xác về mặt sự kiện, không mơ hồ, không phụ thuộc thông tin thay đổi theo thời gian.",
    "Chỉ trả lời bằng MỘT đối tượng JSON hợp lệ, không thêm chữ nào khác, không dùng markdown.",
  ].join(" ");
  const lines = [
    `Hãy tạo 1 câu hỏi cho CÂU SỐ ${input.number}/15. Mức độ ${DIFFICULTY[tier]}${extra}`,
    input.topic?.trim()
      ? `Chủ đề: ${input.topic.trim()}.`
      : input.field
        ? `Lĩnh vực bắt buộc: ${input.field}. Chọn một khía cạnh cụ thể, ít bị hỏi đi hỏi lại thay vì ví dụ quen thuộc nhất.`
        : "Chủ đề: kiến thức chung (lịch sử, địa lý, văn học, khoa học, văn hóa, thể thao, đời sống...).",
    "Yêu cầu:",
    "- Đúng 4 phương án, chỉ 1 phương án đúng, các phương án không trùng nhau và có độ dài tương đương.",
    "- Không dùng 'tất cả các đáp án trên', 'không có đáp án nào đúng'.",
    "- Không đánh số/chữ cái ở đầu phương án. Không tham chiếu hình ảnh hay video.",
    "- Chỉ dùng sự kiện bạn chắc chắn đúng.",
    "- Giải thích ngắn (1 câu) vì sao đáp án đúng.",
  ];
  if (input.avoid && input.avoid.length > 0) {
    lines.push(
      "Tránh lặp lại hoặc gần giống các câu đã ra:",
      ...input.avoid.slice(-15).map((q) => `- ${q}`),
    );
  }
  lines.push(
    'Định dạng JSON: {"question": string, "options": [string, string, string, string], "answerIndex": 0|1|2|3, "category": string, "explanation": string}',
  );
  return { system, user: lines.join("\n") };
}

// ---------- parse ----------

const generatedSchema = z.object({
  question: z.string().min(8).max(500),
  options: z.array(z.string().min(1).max(200)).length(4),
  answerIndex: z.number().int().min(0).max(3).optional(),
  answer: z.union([z.string(), z.number()]).optional(),
  category: z.string().max(60).optional(),
  explanation: z.string().max(600).optional(),
});

export interface GeneratedQuestion {
  question: string;
  options: [string, string, string, string];
  answer: number;
  category?: string;
  explanation?: string;
}

export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Phản hồi AI không chứa JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const PREFIX = /^\s*(?:[A-Da-d][.):]|\d[.)])\s+/;

export function parseGeneratedQuestion(text: string): GeneratedQuestion {
  const g = generatedSchema.parse(extractJson(text));
  const options = g.options.map((o) => o.replace(PREFIX, "").trim());
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4)
    throw new Error("Các phương án bị trùng nhau");
  let answer = g.answerIndex;
  if (answer === undefined && g.answer !== undefined) {
    if (typeof g.answer === "number") answer = g.answer;
    else if (/^[A-Da-d]$/.test(g.answer.trim()))
      answer = g.answer.trim().toUpperCase().charCodeAt(0) - 65;
    else {
      const i = options.findIndex(
        (o) => o.toLowerCase() === (g.answer as string).trim().toLowerCase(),
      );
      if (i >= 0) answer = i;
    }
  }
  if (answer === undefined || answer < 0 || answer > 3)
    throw new Error("Không xác định được đáp án đúng");
  if (/tất cả các đáp án|không có đáp án nào/i.test(options.join(" ")))
    throw new Error("Phương án loại 'tất cả/không có'");
  return {
    question: g.question.trim(),
    options: options as [string, string, string, string],
    answer,
    category: g.category?.trim() || undefined,
    explanation: g.explanation?.trim() || undefined,
  };
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

/** Hai câu hỏi cùng ý: Jaccard theo từ >= 0,5 (model hay diễn đạt lại đúng một câu). */
export function isNearDuplicate(text: string, previous: readonly string[]): boolean {
  const a = words(text);
  return previous.some((p) => {
    const b = words(p);
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    return shared / (a.size + b.size - shared) >= 0.5;
  });
}

// ---------- gọi API ----------

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmError";
  }
}

const REQUEST_TIMEOUT_MS = 45_000;

async function readError(res: Response): Promise<string> {
  const body = (await res.text().catch(() => "")).slice(0, 300);
  return `HTTP ${res.status}${body ? `: ${body}` : ""}`;
}

async function chat(cfg: LlmConfig, system: string, user: string): Promise<string> {
  if (cfg.kind === "anthropic") {
    const res = await fetch(`${cfg.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 1024,
        temperature: 1,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new LlmError(await readError(res));
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === "text")?.text;
    if (!text) throw new LlmError("Phản hồi Anthropic rỗng");
    return text;
  }

  const send = (jsonMode: boolean) =>
    fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  let res = await send(true);
  // Một số máy chủ tương thích OpenAI không hỗ trợ response_format.
  if (res.status === 400 || res.status === 422) res = await send(false);
  if (!res.ok) throw new LlmError(await readError(res));
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new LlmError("Phản hồi AI rỗng");
  return text;
}

const MAX_ATTEMPTS = 3;

/** Sinh một câu hỏi; thử lại khi AI trả về dữ liệu không hợp lệ hoặc câu trùng câu đã ra. */
export async function generateQuestion(
  cfg: LlmConfig,
  input: GenerateInput,
): Promise<GeneratedQuestion> {
  const { system, user } = buildPrompt(input);
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const q = parseGeneratedQuestion(await chat(cfg, system, user));
      if (isNearDuplicate(q.question, input.avoid ?? []))
        throw new Error("Câu hỏi trùng câu đã ra");
      return q;
    } catch (e) {
      lastError = e;
      // Lỗi mạng / HTTP không đáng thử lại ngay; chỉ thử lại khi nội dung sai định dạng hoặc trùng.
      if (e instanceof LlmError || (e instanceof DOMException && e.name === "TimeoutError")) break;
    }
  }
  throw lastError instanceof Error ? lastError : new LlmError(String(lastError));
}
