/**
 * Luật chơi "Ai Là Triệu Phú" — phiên bản 15 (phát sóng từ 31/03/2026, VTV3,
 * MC Nguyễn Quốc Khánh). Nguồn: Ai là triệu phú Wiki (Phiên bản 15), Who Wants
 * To Be A Millionaire Wiki (Ai Là Triệu Phú 2026), VTV/Tuổi Trẻ 31/03–01/04/2026.
 *
 * Toàn bộ hằng số luật nằm ở đây; UI và engine chỉ đọc từ module này.
 */

export const RULES_EDITION = "Phiên bản 15 (từ 31/03/2026)";
export const TOTAL_QUESTIONS = 15;

/** Tiền thưởng (đồng) khi trả lời đúng câu thứ n (n = 1..15). */
export const PRIZE_LADDER = [
  1_000_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 8_000_000, 10_000_000,
  14_000_000, 22_000_000, 30_000_000, 60_000_000, 120_000_000, 250_000_000, 500_000_000,
] as const;

/** Câu hỏi mốc quan trọng (số thứ tự câu). Qua mốc là chắc chắn giữ được tiền mốc. */
export const MILESTONES = [5, 10] as const;

export type LifelineId = "fiftyFifty" | "phoneFriend" | "plusOne" | "wiseMen";

export interface LifelineDef {
  id: LifelineId;
  name: string;
  short: string;
  description: string;
  /** Câu đầu tiên được dùng (1-based). */
  fromQuestion: number;
  /** Thời gian trợ giúp (giây), nếu có. */
  seconds?: number;
}

export const LIFELINES: readonly LifelineDef[] = [
  {
    id: "fiftyFifty",
    name: "Năm mươi – Năm mươi",
    short: "50:50",
    description: "Máy tính loại bỏ 2 phương án sai, chỉ còn lại 1 đáp án đúng và 1 đáp án sai.",
    fromQuestion: 1,
  },
  {
    id: "phoneFriend",
    name: "Gọi điện thoại cho người thân",
    short: "Gọi điện",
    description:
      "Gọi cho một người thân đã đăng ký trước. Người thân nghe câu hỏi và có 30 giây để đưa ra đáp án hoặc gợi ý.",
    fromQuestion: 1,
    seconds: 30,
  },
  {
    id: "plusOne",
    name: "Sự trợ giúp của người đồng hành",
    short: "Đồng hành",
    description:
      "Người đồng hành đứng cạnh bạn trong suốt câu hỏi để cùng thảo luận về đáp án. Dùng được ở mọi câu hỏi.",
    fromQuestion: 1,
  },
  {
    id: "wiseMen",
    name: "Sự trợ giúp của hai nhà thông thái",
    short: "Thông thái",
    description:
      "Hai nhà thông thái ở phòng riêng, không tra cứu, có 30 giây để đưa ra đáp án. Chỉ dùng được từ câu 6 đến câu 15.",
    fromQuestion: 6,
    seconds: 30,
  },
] as const;

export const LIFELINE_IDS: readonly LifelineId[] = LIFELINES.map((l) => l.id);

export function getLifeline(id: LifelineId): LifelineDef {
  const def = LIFELINES.find((l) => l.id === id);
  if (!def) throw new Error(`Unknown lifeline: ${id}`);
  return def;
}

/** Quyền trợ giúp có được phép dùng ở câu số n không (chưa tính việc đã dùng hay chưa). */
export function isLifelineAvailableAt(id: LifelineId, questionNumber: number): boolean {
  return questionNumber >= getLifeline(id).fromQuestion;
}

function assertQuestionNumber(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_QUESTIONS) {
    throw new RangeError(`Question number must be an integer in 1..${TOTAL_QUESTIONS}, got ${n}`);
  }
}

/** Tiền thưởng khi trả lời đúng câu n. */
export function prizeForQuestion(n: number): number {
  assertQuestionNumber(n);
  return PRIZE_LADDER[n - 1] as number;
}

/** Tiền đang giữ khi đã trả lời đúng `answered` câu (0..15) và chọn dừng cuộc chơi. */
export function walkAwayPrize(answered: number): number {
  if (!Number.isInteger(answered) || answered < 0 || answered > TOTAL_QUESTIONS) {
    throw new RangeError(`answered must be an integer in 0..${TOTAL_QUESTIONS}, got ${answered}`);
  }
  return answered === 0 ? 0 : (PRIZE_LADDER[answered - 1] as number);
}

/** Tiền mốc chắc chắn nhận được khi trả lời SAI ở câu n. */
export function prizeOnWrongAnswer(n: number): number {
  assertQuestionNumber(n);
  const passed = MILESTONES.filter((m) => m < n);
  const last = passed[passed.length - 1];
  return last === undefined ? 0 : prizeForQuestion(last);
}

export function isMilestone(n: number): boolean {
  return (MILESTONES as readonly number[]).includes(n);
}

/** Định dạng tiền Việt: 1.000.000 đ */
export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} đ`;
}

/** Định dạng rút gọn cho thang tiền hẹp: 500 triệu, 1 triệu. */
export function formatVndShort(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${new Intl.NumberFormat("vi-VN").format(m)} triệu`;
  }
  return formatVnd(amount);
}

/** Nhóm độ khó theo số thứ tự câu hỏi. */
export type Tier = "easy" | "medium" | "hard";

export function tierOf(n: number): Tier {
  assertQuestionNumber(n);
  if (n <= 5) return "easy";
  if (n <= 10) return "medium";
  return "hard";
}
