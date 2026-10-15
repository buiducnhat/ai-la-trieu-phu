import "@tanstack/react-start/server-only";

import { createHash } from "node:crypto";

import type { LifelineId } from "@/lib/game/rules";
import type {
  AnswerResult,
  ClientLlmConfig,
  IssuedQuestion,
  LifelineResult,
  PublicConfig,
  PublicQuestion,
  QuestionSourceMode,
} from "@/lib/game/types";

import { type BankQuestion, loadBank, pickFromBank, toIssued } from "./bank";
import { useLifeline } from "./lifelines";
import { generateQuestion, resolveClientLlm, resolveEnvLlm } from "./llm";
import { RateLimiter } from "./rate-limit";
import { shuffleOptions, type Rng } from "./random";
import { openQuestion, sealQuestion } from "./token";

export interface IssueInput {
  number: number;
  /** id các câu đã ra trong ván (tránh lặp). */
  exclude: string[];
  /** nội dung các câu đã ra (cho AI tránh lặp). */
  avoid: string[];
  source: QuestionSourceMode;
  topic: string;
  llm: ClientLlmConfig;
  /** Khóa để giới hạn tần suất khi dùng AI của máy chủ (IP). */
  clientKey: string;
}

type GlobalWithLimiter = typeof globalThis & { __altpLimiter?: RateLimiter };

function limiter(): RateLimiter {
  const g = globalThis as GlobalWithLimiter;
  g.__altpLimiter ??= new RateLimiter(
    Number(process.env.LLM_RATE_LIMIT_PER_10_MIN) || 120,
    10 * 60 * 1000,
  );
  return g.__altpLimiter;
}

export async function getPublicConfig(): Promise<PublicConfig> {
  const env = resolveEnvLlm();
  const bank = await loadBank();
  const configured = process.env.QUESTION_SOURCE;
  const defaultSource: QuestionSourceMode =
    configured === "bank" || configured === "llm" || configured === "mixed"
      ? configured
      : env
        ? "mixed"
        : "bank";
  return {
    llm: { configured: env !== null, label: env?.label ?? null },
    defaultSource,
    bankSize: bank.length,
  };
}

function publicOf(q: PublicQuestion): PublicQuestion {
  return q;
}

function seal(
  number: number,
  q: {
    id: string;
    text: string;
    options: [string, string, string, string];
    answer: number;
    explanation?: string;
    category?: string;
    source: string;
    origin: "bank" | "llm";
  },
  notice?: string,
): IssuedQuestion {
  const token = sealQuestion({ ...q, number });
  return {
    question: publicOf({
      id: q.id,
      number,
      text: q.text,
      options: q.options,
      category: q.category,
      source: q.source,
      origin: q.origin,
    }),
    token,
    notice,
  };
}

function fromBank(number: number, q: BankQuestion, rng: Rng, notice?: string): IssuedQuestion {
  const issued = toIssued(q, rng);
  return seal(
    number,
    {
      id: issued.id,
      text: issued.question,
      options: issued.options,
      answer: issued.answer,
      explanation: issued.explanation,
      category: issued.category,
      source: issued.source,
      origin: "bank",
    },
    notice,
  );
}

function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/\s+/g, " ").slice(0, 120);
}

export async function issueQuestion(
  input: IssueInput,
  rng: Rng = Math.random,
): Promise<IssuedQuestion> {
  const bankFallback = async (notice?: string): Promise<IssuedQuestion> => {
    const q = pickFromBank(await loadBank(), {
      number: input.number,
      exclude: input.exclude,
      topic: input.topic,
      rng,
    });
    if (!q) {
      // Đã cạn kho: cho phép lặp lại thay vì kẹt ván chơi.
      const again = pickFromBank(await loadBank(), {
        number: input.number,
        topic: input.topic,
        rng,
      });
      if (!again) throw new Error("Kho câu hỏi trống");
      return fromBank(
        input.number,
        again,
        rng,
        notice ?? "Đã dùng hết câu hỏi phù hợp, câu có thể lặp lại.",
      );
    }
    return fromBank(input.number, q, rng, notice);
  };

  if (input.source === "bank") return bankFallback();

  const cfg = resolveClientLlm(input.llm);
  if (!cfg) return bankFallback("Chưa cấu hình AI nên đã dùng bộ câu hỏi có sẵn.");
  if (input.source === "mixed" && rng() >= 0.5) return bankFallback();

  const usingServerKey = input.llm.provider === "server" || !input.llm.apiKey.trim();
  if (usingServerKey && !limiter().take(input.clientKey)) {
    return bankFallback("Đã quá giới hạn lượt gọi AI của máy chủ, dùng bộ câu hỏi có sẵn.");
  }

  try {
    const g = await generateQuestion(cfg, {
      number: input.number,
      topic: input.topic,
      avoid: input.avoid,
    });
    const { options, answer } = shuffleOptions(g.options, g.answer, rng);
    const id = `llm-${createHash("sha1").update(g.question).digest("hex").slice(0, 10)}`;
    return seal(input.number, {
      id,
      text: g.question,
      options,
      answer,
      explanation: g.explanation,
      category: g.category,
      source: `AI · ${cfg.model}`,
      origin: "llm",
    });
  } catch (e) {
    console.warn("[llm] sinh câu hỏi thất bại:", errorText(e));
    return bankFallback(`AI không tạo được câu hỏi (${errorText(e)}), đã dùng bộ câu hỏi có sẵn.`);
  }
}

export function checkAnswer(token: string, choice: number): AnswerResult {
  const q = openQuestion(token);
  return { correct: choice === q.answer, correctIndex: q.answer, explanation: q.explanation };
}

export function runLifeline(token: string, id: LifelineId, removed: number[]): LifelineResult {
  const q = openQuestion(token);
  return useLifeline(id, { number: q.number, options: q.options, answer: q.answer, removed });
}
