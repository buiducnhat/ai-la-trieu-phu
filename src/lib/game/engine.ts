import {
  isLifelineAvailableAt,
  LIFELINE_IDS,
  type LifelineId,
  prizeForQuestion,
  prizeOnWrongAnswer,
  TOTAL_QUESTIONS,
  walkAwayPrize,
} from "./rules";
import type { AnswerResult, LifelineResult, PublicQuestion } from "./types";

/**
 * Máy trạng thái thuần (pure reducer) của một ván chơi. Không gọi mạng: các
 * thao tác cần đáp án đúng (khóa đáp án, trợ giúp) đi qua server action rồi
 * mới được đưa vào reducer dưới dạng sự kiện.
 */

export type Phase =
  | "idle" // chưa bắt đầu
  | "loading" // đang lấy câu hỏi
  | "choosing" // đang chọn đáp án
  | "locking" // đã khóa, chờ máy chủ chấm
  | "revealed" // đã biết đúng/sai
  | "ended";

export type EndReason = "walkAway" | "wrong" | "won";

export interface Outcome {
  reason: EndReason;
  /** Số tiền người chơi mang về. */
  prize: number;
  /** Số câu đã trả lời đúng. */
  answered: number;
  /** Câu đang chơi khi kết thúc. */
  atQuestion: number;
}

export interface GameState {
  phase: Phase;
  /** Câu hiện tại (1..15). */
  number: number;
  question: PublicQuestion | null;
  token: string | null;
  selected: number | null;
  answer: AnswerResult | null;
  /** Các phương án bị loại bởi 50:50 ở câu hiện tại. */
  removed: number[];
  lifelinesUsed: Record<LifelineId, boolean>;
  /** Kết quả trợ giúp đã dùng ở câu hiện tại (để xem lại). */
  lifelineLog: LifelineResult[];
  /** Các câu đã ra trong ván (tránh lặp lại). */
  seen: { id: string; text: string }[];
  /** Tăng mỗi lần người chơi bấm "thử lại" khi tải câu hỏi lỗi. */
  loadAttempt: number;
  outcome: Outcome | null;
  error: string | null;
  notice: string | null;
}

export type GameEvent =
  | { type: "start" }
  | { type: "questionLoaded"; question: PublicQuestion; token: string; notice?: string }
  | { type: "loadFailed"; message: string }
  | { type: "retry" }
  | { type: "select"; index: number }
  | { type: "lock" }
  | { type: "lockFailed"; message: string }
  | { type: "answerRevealed"; result: AnswerResult }
  | { type: "walkAwayReveal"; result: AnswerResult }
  | { type: "next" }
  | { type: "walkAway" }
  | { type: "lifelineUsed"; id: LifelineId; result: LifelineResult }
  | { type: "reset" };

function emptyUsed(): Record<LifelineId, boolean> {
  return Object.fromEntries(LIFELINE_IDS.map((id) => [id, false])) as Record<LifelineId, boolean>;
}

export function createInitialState(): GameState {
  return {
    phase: "idle",
    number: 1,
    question: null,
    token: null,
    selected: null,
    answer: null,
    removed: [],
    lifelinesUsed: emptyUsed(),
    lifelineLog: [],
    seen: [],
    loadAttempt: 0,
    outcome: null,
    error: null,
    notice: null,
  };
}

export function canUseLifeline(state: GameState, id: LifelineId): boolean {
  return (
    state.phase === "choosing" &&
    !state.lifelinesUsed[id] &&
    isLifelineAvailableAt(id, state.number)
  );
}

export function canWalkAway(state: GameState): boolean {
  return state.phase === "choosing";
}

/** Số câu đã trả lời đúng tại thời điểm hiện tại. */
export function answeredCount(state: GameState): number {
  if (state.outcome) return state.outcome.answered;
  if (state.phase === "revealed" && state.answer?.correct) return state.number;
  return state.number - 1;
}

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "start":
      return { ...createInitialState(), phase: "loading" };

    case "reset":
      return createInitialState();

    case "questionLoaded": {
      if (state.phase !== "loading") return state;
      return {
        ...state,
        phase: "choosing",
        question: event.question,
        token: event.token,
        selected: null,
        answer: null,
        removed: [],
        lifelineLog: [],
        seen: [...state.seen, { id: event.question.id, text: event.question.text }],
        error: null,
        notice: event.notice ?? null,
      };
    }

    case "loadFailed":
      if (state.phase !== "loading") return state;
      return { ...state, error: event.message };

    case "retry":
      if (state.phase !== "loading") return state;
      return { ...state, error: null, loadAttempt: state.loadAttempt + 1 };

    case "select": {
      if (state.phase !== "choosing") return state;
      if (event.index < 0 || event.index > 3 || state.removed.includes(event.index)) return state;
      return { ...state, selected: event.index };
    }

    case "lock":
      if (state.phase !== "choosing" || state.selected === null) return state;
      return { ...state, phase: "locking" };

    case "lockFailed":
      if (state.phase !== "locking") return state;
      return { ...state, phase: "choosing", error: event.message };

    case "walkAwayReveal":
      if (state.phase !== "ended" || state.outcome?.reason !== "walkAway") return state;
      return { ...state, answer: event.result };

    case "answerRevealed": {
      if (state.phase !== "locking") return state;
      const next: GameState = { ...state, phase: "revealed", answer: event.result };
      if (!event.result.correct) {
        return {
          ...next,
          phase: "ended",
          outcome: {
            reason: "wrong",
            prize: prizeOnWrongAnswer(state.number),
            answered: state.number - 1,
            atQuestion: state.number,
          },
        };
      }
      if (state.number === TOTAL_QUESTIONS) {
        return {
          ...next,
          phase: "ended",
          outcome: {
            reason: "won",
            prize: prizeForQuestion(TOTAL_QUESTIONS),
            answered: TOTAL_QUESTIONS,
            atQuestion: state.number,
          },
        };
      }
      return next;
    }

    case "next": {
      if (state.phase !== "revealed" || !state.answer?.correct) return state;
      return {
        ...state,
        phase: "loading",
        number: state.number + 1,
        question: null,
        token: null,
        selected: null,
        answer: null,
        removed: [],
        lifelineLog: [],
        error: null,
        notice: null,
      };
    }

    case "walkAway": {
      if (state.phase !== "choosing") return state;
      const answered = state.number - 1;
      return {
        ...state,
        phase: "ended",
        outcome: {
          reason: "walkAway",
          prize: walkAwayPrize(answered),
          answered,
          atQuestion: state.number,
        },
      };
    }

    case "lifelineUsed": {
      if (!canUseLifeline(state, event.id)) return state;
      const used = { ...state.lifelinesUsed, [event.id]: true };
      const log = [...state.lifelineLog, event.result];
      if (event.result.kind === "fiftyFifty") {
        const removed = [...new Set([...state.removed, ...event.result.removed])];
        // Nếu người chơi đang chọn đúng phương án bị loại thì bỏ chọn.
        const selected =
          state.selected !== null && removed.includes(state.selected) ? null : state.selected;
        return { ...state, lifelinesUsed: used, lifelineLog: log, removed, selected };
      }
      return { ...state, lifelinesUsed: used, lifelineLog: log };
    }
  }
}
