import type { LifelineId } from "./rules";

/** Câu hỏi gửi xuống trình duyệt — KHÔNG chứa đáp án đúng. */
export interface PublicQuestion {
  id: string;
  /** Số thứ tự câu trong ván (1..15). */
  number: number;
  text: string;
  options: [string, string, string, string];
  category?: string;
  /** Nguồn câu hỏi để hiển thị: tên bộ dữ liệu hoặc "AI". */
  source: string;
  origin: "bank" | "llm";
}

export interface IssuedQuestion {
  question: PublicQuestion;
  /** Token mã hóa chứa đáp án; chỉ máy chủ giải mã được. */
  token: string;
  /** Thông báo cho người chơi (ví dụ: AI lỗi nên dùng bộ câu hỏi có sẵn). */
  notice?: string;
}

export interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation?: string;
}

export interface FiftyFiftyResult {
  kind: "fiftyFifty";
  /** Hai phương án bị loại. */
  removed: [number, number];
}

export interface AdvisorOpinion {
  /** Tên người trợ giúp để hiển thị. */
  name: string;
  suggested: number;
  /** 0..1 */
  confidence: number;
  message: string;
}

export interface PhoneFriendResult {
  kind: "phoneFriend";
  advisors: [AdvisorOpinion];
}

export interface PlusOneResult {
  kind: "plusOne";
  advisors: [AdvisorOpinion];
}

export interface WiseMenResult {
  kind: "wiseMen";
  advisors: [AdvisorOpinion, AdvisorOpinion];
}

export type LifelineResult = FiftyFiftyResult | PhoneFriendResult | PlusOneResult | WiseMenResult;

export type LifelineResultOf<T extends LifelineId> = Extract<LifelineResult, { kind: T }>;

export type QuestionSourceMode = "bank" | "llm" | "mixed";

export const SOURCE_MODES: readonly QuestionSourceMode[] = ["bank", "llm", "mixed"];

export interface GameSettings {
  source: QuestionSourceMode;
  /** Chủ đề ưu tiên (rỗng = kiến thức chung). Chỉ áp dụng cho AI. */
  topic: string;
  /** Âm thanh 8-bit. */
  sound: boolean;
  /** Cấu hình AI riêng của người chơi (lưu trong trình duyệt). */
  llm: ClientLlmConfig;
}

export interface ClientLlmConfig {
  /** "server" = dùng cấu hình trên máy chủ (biến môi trường). */
  provider: string;
  model: string;
  apiKey: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  source: "mixed",
  topic: "",
  sound: true,
  llm: { provider: "server", model: "", apiKey: "" },
};

/** Cấu hình công khai của máy chủ, gửi xuống trình duyệt (không chứa bí mật). */
export interface PublicConfig {
  llm: { configured: boolean; label: string | null };
  defaultSource: QuestionSourceMode;
  bankSize: number;
}
