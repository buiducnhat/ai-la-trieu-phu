"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  canUseLifeline,
  canWalkAway,
  createInitialState,
  type GameState,
  reduce,
} from "@/lib/game/engine";
import type { LifelineId } from "@/lib/game/rules";
import type { GameSettings, LifelineResult } from "@/lib/game/types";
import type { SoundEvent } from "@/lib/sound";
import {
  type ActionResult,
  fetchQuestionFn,
  requestLifelineFn,
  submitAnswerFn,
} from "@/server/game.functions";
import type { IssuedQuestion } from "@/lib/game/types";

/** Thời gian "hồi hộp" giữa lúc khóa đáp án và lúc mở kết quả. */
const SUSPENSE_MS = 1600;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type QuestionResult = ActionResult<IssuedQuestion>;

const NETWORK_ERROR = "Mất kết nối tới máy chủ, hãy thử lại.";

/** Gọi server function; lỗi mạng/validate được quy về kết quả `ok: false`. */
async function call<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export interface GameApi {
  state: GameState;
  /** Kết quả quyền trợ giúp vừa dùng (để hiển thị hộp thoại). */
  pendingLifeline: LifelineResult | null;
  /** Đang chờ máy chủ xử lý quyền trợ giúp. */
  lifelineBusy: boolean;
  dismissLifeline: () => void;
  start: () => void;
  select: (index: number) => void;
  lock: () => void;
  next: () => void;
  walkAway: () => Promise<void>;
  useLifeline: (id: LifelineId) => Promise<void>;
  retryLoad: () => void;
  reset: () => void;
}

export function useGame(
  settings: GameSettings,
  play: (event: SoundEvent) => void,
  onError: (message: string) => void,
): GameApi {
  const [state, dispatch] = useReducer(reduce, undefined, createInitialState);
  const [pendingLifeline, setPendingLifeline] = useState<LifelineResult | null>(null);
  const [lifelineBusy, setLifelineBusy] = useState(false);

  // Giữ giá trị mới nhất cho các callback async mà không buộc chúng phải tạo lại.
  const settingsRef = useRef(settings);
  const playRef = useRef(play);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    settingsRef.current = settings;
    playRef.current = play;
    onErrorRef.current = onError;
  });

  /**
   * Một lời gọi máy chủ cho mỗi (số câu, lần thử). Cùng bộ nhớ đệm này phục vụ
   * cả việc nạp trước câu kế tiếp lẫn việc chống gọi đôi của React StrictMode.
   */
  const requests = useRef(new Map<string, Promise<QuestionResult>>());

  const request = useCallback(
    (number: number, attempt: number, seen: GameState["seen"]): Promise<QuestionResult> => {
      const key = `${number}:${attempt}`;
      const cached = requests.current.get(key);
      if (cached) return cached;
      const s = settingsRef.current;
      const promise = call(() =>
        fetchQuestionFn({
          data: {
            number,
            exclude: seen.map((q) => q.id),
            avoid: seen.map((q) => q.text),
            source: s.source,
            topic: s.topic,
            llm: s.llm,
          },
        }),
      );
      requests.current.set(key, promise);
      return promise;
    },
    [],
  );

  const loading = state.phase === "loading";
  const { number, loadAttempt, seen } = state;
  useEffect(() => {
    if (!loading) return;
    let cancelled = false;
    void request(number, loadAttempt, seen).then((result) => {
      if (cancelled) return;
      requests.current.delete(`${number}:${loadAttempt}`);
      dispatch(
        result.ok
          ? {
              type: "questionLoaded",
              question: result.data.question,
              token: result.data.token,
              notice: result.data.notice,
            }
          : { type: "loadFailed", message: result.error },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [loading, number, loadAttempt, seen, request]);

  // Có câu mới và dùng AI: nạp trước câu kế tiếp để đỡ phải chờ.
  const choosing = state.phase === "choosing";
  const prefetchSource = settings.source;
  useEffect(() => {
    if (!choosing || prefetchSource === "bank" || number >= 15) return;
    void request(number + 1, 0, seen);
  }, [choosing, prefetchSource, number, seen, request]);

  // Mỗi câu hỏi mới hiện ra: nhạc "Sẵn sàng" và nhạc nền câu đó.
  useEffect(() => {
    if (choosing) playRef.current({ type: "question", n: number });
  }, [choosing, number]);

  const reportedError = useRef<string | null>(null);
  useEffect(() => {
    if (state.phase === "choosing" && state.error && state.error !== reportedError.current) {
      onErrorRef.current(state.error);
    }
    reportedError.current = state.error;
  }, [state.phase, state.error]);

  const busy = useRef(false);

  const start = useCallback(() => {
    requests.current.clear();
    playRef.current({ type: "start" });
    setPendingLifeline(null);
    dispatch({ type: "start" });
  }, []);

  const select = useCallback((index: number) => {
    playRef.current({ type: "select" });
    dispatch({ type: "select", index });
  }, []);

  const lock = useCallback(() => {
    if (busy.current || state.phase !== "choosing" || state.selected === null || !state.token)
      return;
    busy.current = true;
    const { token, selected, number: n } = state;
    playRef.current({ type: "lock", n });
    dispatch({ type: "lock" });
    void (async () => {
      const [result] = await Promise.all([
        call(() => submitAnswerFn({ data: { token, choice: selected } })),
        sleep(SUSPENSE_MS),
      ]);
      busy.current = false;
      if (!result.ok) {
        dispatch({ type: "lockFailed", message: result.error });
        return;
      }
      playRef.current({ type: "result", n, correct: result.data.correct });
      dispatch({ type: "answerRevealed", result: result.data });
    })();
  }, [state]);

  const next = useCallback(() => {
    setPendingLifeline(null);
    dispatch({ type: "next" });
  }, []);

  const walkAway = useCallback(async () => {
    if (!canWalkAway(state) || !state.token) return;
    const { token, selected } = state;
    playRef.current({ type: "walkAway" });
    dispatch({ type: "walkAway" });
    // Sau khi dừng, người chơi được xem đáp án đúng như trong chương trình.
    // Không lấy được đáp án cũng không ảnh hưởng tiền thưởng.
    const result = await call(() => submitAnswerFn({ data: { token, choice: selected ?? 0 } }));
    if (result.ok) dispatch({ type: "walkAwayReveal", result: { ...result.data, correct: false } });
  }, [state]);

  const useLifeline = useCallback(
    async (id: LifelineId) => {
      if (busy.current || !canUseLifeline(state, id) || !state.token) return;
      busy.current = true;
      setLifelineBusy(true);
      const { token, removed } = state;
      const result = await call(() => requestLifelineFn({ data: { token, id, removed } }));
      busy.current = false;
      setLifelineBusy(false);
      if (!result.ok) {
        onErrorRef.current(result.error);
        return;
      }
      playRef.current({ type: "lifeline", id });
      dispatch({ type: "lifelineUsed", id, result: result.data });
      if (result.data.kind !== "fiftyFifty") setPendingLifeline(result.data);
    },
    [state],
  );

  return {
    state,
    pendingLifeline,
    lifelineBusy,
    dismissLifeline: () => {
      playRef.current({ type: "lifelineClosed" });
      setPendingLifeline(null);
    },
    start,
    select,
    lock,
    next,
    walkAway,
    useLifeline,
    retryLoad: () => dispatch({ type: "retry" }),
    reset: () => {
      playRef.current({ type: "stop" });
      setPendingLifeline(null);
      dispatch({ type: "reset" });
    },
  };
}
