import "@tanstack/react-start/server-only";

import { isLifelineAvailableAt, type LifelineId } from "@/lib/game/rules";
import type { AdvisorOpinion, LifelineResult } from "@/lib/game/types";

import { pick, type Rng, shuffle } from "./random";

/**
 * Giả lập các quyền trợ giúp. Chất lượng của người trợ giúp giảm dần theo số
 * thứ tự câu hỏi (độ khó) thay vì dựa vào mô hình AI "biết hết", để cân bằng
 * trò chơi: câu càng khó, lời khuyên càng dễ sai.
 */

const LETTERS = ["A", "B", "C", "D"] as const;

interface Skill {
  /** Xác suất biết đáp án ở câu 1 và câu 15. */
  start: number;
  end: number;
}

const SKILLS = {
  phoneFriend: { start: 0.95, end: 0.45 },
  plusOne: { start: 0.9, end: 0.4 },
  wiseMen: { start: 0.97, end: 0.72 },
} satisfies Record<string, Skill>;

export function knowledgeProbability(skill: Skill, number: number): number {
  const t = (Math.min(Math.max(number, 1), 15) - 1) / 14;
  return skill.start + (skill.end - skill.start) * t;
}

export interface LifelineContext {
  number: number;
  options: readonly [string, string, string, string];
  answer: number;
  /** Phương án đã bị 50:50 loại (nếu có) để người trợ giúp không chọn lại. */
  removed: readonly number[];
}

function candidatesWrong(ctx: LifelineContext): number[] {
  return [0, 1, 2, 3].filter((i) => i !== ctx.answer && !ctx.removed.includes(i));
}

export function fiftyFifty(ctx: LifelineContext, rng: Rng): LifelineResult {
  const wrong = [0, 1, 2, 3].filter((i) => i !== ctx.answer);
  const [a, b] = shuffle(wrong, rng).slice(0, 2) as [number, number];
  return { kind: "fiftyFifty", removed: a < b ? [a, b] : [b, a] };
}

interface Decision {
  suggested: number;
  knows: boolean;
  confidence: number;
}

function decide(skill: Skill, ctx: LifelineContext, rng: Rng): Decision {
  const knows = rng() < knowledgeProbability(skill, ctx.number);
  const wrong = candidatesWrong(ctx);
  // Nếu không biết thì đoán: cũng có cơ may đoán trúng trong các phương án còn lại.
  const remaining = wrong.length + 1;
  const guessesRight = !knows && rng() < 1 / remaining;
  const suggested = knows || guessesRight ? ctx.answer : pick(wrong, rng);
  const hardness = (ctx.number - 1) / 14;
  const confidence = knows
    ? Math.min(0.98, 0.7 + rng() * 0.28 - hardness * 0.25)
    : 0.35 + rng() * 0.35;
  return { suggested, knows: knows || guessesRight, confidence: Math.max(0.3, confidence) };
}

function optionLabel(ctx: LifelineContext, i: number): string {
  return `${LETTERS[i]}. ${ctx.options[i]}`;
}

type Band = "high" | "mid" | "low";

function band(confidence: number): Band {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.55) return "mid";
  return "low";
}

const PHONE_LINES: Record<Band, string[]> = {
  high: [
    "Câu này mình biết, chắc chắn là {opt}. Cứ yên tâm chọn nhé!",
    "À câu này quen lắm, {opt}! Mình chắc chắn đấy.",
  ],
  mid: [
    "Để mình nghĩ... mình nghiêng về {opt}, khoảng bảy tám phần chắc.",
    "Nghe có vẻ là {opt}. Mình khá tin vào đáp án này.",
  ],
  low: [
    "Câu này khó quá... mình đoán là {opt}, nhưng không chắc đâu nhé.",
    "Hmm, mình chỉ nhớ máng máng thôi, có thể là {opt}. Bạn cân nhắc nhé.",
  ],
};

const PLUS_ONE_LINES: Record<Band, string[]> = {
  high: [
    "Mình nhớ rõ rồi, là {opt}. Mình tin vào đáp án này.",
    "Theo mình thì là {opt}, mình khá chắc.",
  ],
  mid: [
    "Mình thấy {opt} hợp lý nhất. Bạn thấy sao?",
    "Mình nghiêng về {opt}, nhưng cũng còn phân vân chút.",
  ],
  low: [
    "Mình không chắc lắm... nếu phải chọn thì mình chọn {opt}.",
    "Khó thật. Mình tạm nghiêng về {opt} thôi, đừng tin hoàn toàn nhé.",
  ],
};

const WISE_LINES: Record<Band, string[]> = {
  high: [
    "Theo kiến thức của tôi, đáp án là {opt}. Tôi hoàn toàn tự tin.",
    "Đây là {opt}. Tôi đã gặp thông tin này nhiều lần.",
  ],
  mid: ["Tôi nghiêng về {opt}, độ tin cậy khá cao.", "Sau khi loại trừ, tôi chọn {opt}."],
  low: [
    "Tôi không hoàn toàn chắc, nhưng tôi sẽ chọn {opt}.",
    "Câu này nằm ngoài chuyên môn của tôi, tôi đoán là {opt}.",
  ],
};

function line(table: Record<Band, string[]>, d: Decision, ctx: LifelineContext, rng: Rng): string {
  return pick(table[band(d.confidence)], rng).replace("{opt}", optionLabel(ctx, d.suggested));
}

export function phoneFriend(ctx: LifelineContext, rng: Rng): LifelineResult {
  const d = decide(SKILLS.phoneFriend, ctx, rng);
  const name = pick(["Người thân của bạn", "Bạn thân của bạn", "Anh/chị của bạn"], rng);
  return {
    kind: "phoneFriend",
    advisors: [
      {
        name,
        suggested: d.suggested,
        confidence: d.confidence,
        message: line(PHONE_LINES, d, ctx, rng),
      },
    ],
  };
}

export function plusOne(ctx: LifelineContext, rng: Rng): LifelineResult {
  const d = decide(SKILLS.plusOne, ctx, rng);
  let message = line(PLUS_ONE_LINES, d, ctx, rng);
  // Người đồng hành cùng thảo luận nên hay kèm theo một phương án mà họ cho là sai
  // (luôn chọn phương án sai thật sự, không bao giờ loại nhầm đáp án đúng).
  const eliminable = candidatesWrong(ctx).filter((i) => i !== d.suggested);
  if (eliminable.length > 0 && rng() < 0.6) {
    message += ` Còn ${optionLabel(ctx, pick(eliminable, rng))} thì mình thấy khó đúng.`;
  }
  return {
    kind: "plusOne",
    advisors: [
      { name: "Người đồng hành", suggested: d.suggested, confidence: d.confidence, message },
    ],
  };
}

export function wiseMen(ctx: LifelineContext, rng: Rng): LifelineResult {
  const names = ["Nhà thông thái số 1", "Nhà thông thái số 2"] as const;
  const advisors = names.map((name): AdvisorOpinion => {
    const d = decide(SKILLS.wiseMen, ctx, rng);
    return {
      name,
      suggested: d.suggested,
      confidence: d.confidence,
      message: line(WISE_LINES, d, ctx, rng),
    };
  }) as [AdvisorOpinion, AdvisorOpinion];
  return { kind: "wiseMen", advisors };
}

export class LifelineUnavailableError extends Error {
  constructor(id: LifelineId, number: number) {
    super(`Quyền trợ giúp "${id}" không dùng được ở câu ${number}`);
    this.name = "LifelineUnavailableError";
  }
}

export function useLifeline(
  id: LifelineId,
  ctx: LifelineContext,
  rng: Rng = Math.random,
): LifelineResult {
  if (!isLifelineAvailableAt(id, ctx.number)) throw new LifelineUnavailableError(id, ctx.number);
  switch (id) {
    case "fiftyFifty":
      return fiftyFifty(ctx, rng);
    case "phoneFriend":
      return phoneFriend(ctx, rng);
    case "plusOne":
      return plusOne(ctx, rng);
    case "wiseMen":
      return wiseMen(ctx, rng);
  }
}
