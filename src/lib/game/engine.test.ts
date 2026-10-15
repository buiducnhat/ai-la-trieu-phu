import { describe, expect, it } from "vite-plus/test";

import {
  answeredCount,
  canUseLifeline,
  canWalkAway,
  createInitialState,
  type GameEvent,
  type GameState,
  reduce,
} from "./engine";
import type { AnswerResult, LifelineResult, PublicQuestion } from "./types";

function q(number: number): PublicQuestion {
  return {
    id: `q${number}`,
    number,
    text: `Câu ${number}?`,
    options: ["A", "B", "C", "D"],
  };
}

function run(events: GameEvent[], from: GameState = createInitialState()): GameState {
  return events.reduce(reduce, from);
}

const ok: AnswerResult = { correct: true, correctIndex: 1 };
const bad: AnswerResult = { correct: false, correctIndex: 2 };

/** Chơi đúng từ câu 1 tới hết câu `upTo`, dừng ở trạng thái đã mở đáp án. */
function playCorrectThrough(upTo: number): GameState {
  let s = run([{ type: "start" }]);
  for (let n = 1; n <= upTo; n++) {
    s = run(
      [
        { type: "questionLoaded", question: q(n), token: `t${n}` },
        { type: "select", index: 1 },
        { type: "lock" },
        { type: "answerRevealed", result: ok },
      ],
      s,
    );
    if (n < upTo) s = reduce(s, { type: "next" });
  }
  return s;
}

describe("vòng đời một câu hỏi", () => {
  it("chọn -> khóa -> mở đáp án đúng -> sang câu sau", () => {
    let s = run([
      { type: "start" },
      { type: "questionLoaded", question: q(1), token: "t" },
      { type: "select", index: 3 },
    ]);
    expect(s.phase).toBe("choosing");
    expect(s.selected).toBe(3);
    s = run([{ type: "lock" }, { type: "answerRevealed", result: ok }], s);
    expect(s.phase).toBe("revealed");
    s = reduce(s, { type: "next" });
    expect(s.phase).toBe("loading");
    expect(s.number).toBe(2);
    expect(s.selected).toBeNull();
  });

  it("không khóa được khi chưa chọn đáp án", () => {
    const s = run([
      { type: "start" },
      { type: "questionLoaded", question: q(1), token: "t" },
      { type: "lock" },
    ]);
    expect(s.phase).toBe("choosing");
  });

  it("không đổi đáp án sau khi đã khóa", () => {
    const s = run([
      { type: "start" },
      { type: "questionLoaded", question: q(1), token: "t" },
      { type: "select", index: 0 },
      { type: "lock" },
      { type: "select", index: 2 },
    ]);
    expect(s.selected).toBe(0);
  });

  it("câu tải lỗi giữ nguyên câu số hiện tại để thử lại", () => {
    const s = run([{ type: "start" }, { type: "loadFailed", message: "mạng lỗi" }]);
    expect(s.phase).toBe("loading");
    expect(s.error).toBe("mạng lỗi");
    expect(s.number).toBe(1);
  });
});

describe("kết thúc ván", () => {
  it("sai ở câu 3 -> 0 đồng", () => {
    const s = run([
      { type: "start" },
      { type: "questionLoaded", question: q(1), token: "t" },
      { type: "select", index: 0 },
      { type: "lock" },
      { type: "answerRevealed", result: bad },
    ]);
    expect(s.phase).toBe("ended");
    expect(s.outcome).toMatchObject({ reason: "wrong", prize: 0, answered: 0 });
  });

  it("sai ở câu 8 -> giữ mốc 5 triệu; sai ở câu 12 -> giữ mốc 22 triệu", () => {
    for (const [n, prize] of [
      [8, 5_000_000],
      [12, 22_000_000],
    ] as const) {
      let s = playCorrectThrough(n - 1);
      s = run(
        [
          { type: "next" },
          { type: "questionLoaded", question: q(n), token: "t" },
          { type: "select", index: 0 },
          { type: "lock" },
          { type: "answerRevealed", result: bad },
        ],
        s,
      );
      expect(s.outcome).toMatchObject({ reason: "wrong", prize, atQuestion: n });
    }
  });

  it("dừng cuộc chơi ở câu 11 -> nhận 22 triệu (tiền câu 10)", () => {
    let s = playCorrectThrough(10);
    s = run([{ type: "next" }, { type: "questionLoaded", question: q(11), token: "t" }], s);
    expect(canWalkAway(s)).toBe(true);
    s = reduce(s, { type: "walkAway" });
    expect(s.outcome).toEqual({
      reason: "walkAway",
      prize: 22_000_000,
      answered: 10,
      atQuestion: 11,
    });
  });

  it("dừng ngay câu 1 -> 0 đồng", () => {
    const s = run([
      { type: "start" },
      { type: "questionLoaded", question: q(1), token: "t" },
      { type: "walkAway" },
    ]);
    expect(s.outcome?.prize).toBe(0);
  });

  it("đúng cả 15 câu -> 500 triệu", () => {
    const s = playCorrectThrough(15);
    expect(s.phase).toBe("ended");
    expect(s.outcome).toEqual({ reason: "won", prize: 500_000_000, answered: 15, atQuestion: 15 });
    expect(answeredCount(s)).toBe(15);
  });
});

describe("quyền trợ giúp", () => {
  const base = () =>
    run([{ type: "start" }, { type: "questionLoaded", question: q(1), token: "t" }]);

  it("50:50 loại 2 phương án và bỏ chọn nếu đang chọn phương án bị loại", () => {
    let s = run([{ type: "select", index: 0 }], base());
    s = reduce(s, {
      type: "lifelineUsed",
      id: "fiftyFifty",
      result: { kind: "fiftyFifty", removed: [0, 3] },
    });
    expect(s.removed).toEqual([0, 3]);
    expect(s.selected).toBeNull();
    expect(s.lifelinesUsed.fiftyFifty).toBe(true);
    // không chọn được phương án đã bị loại
    expect(reduce(s, { type: "select", index: 3 }).selected).toBeNull();
    expect(reduce(s, { type: "select", index: 1 }).selected).toBe(1);
  });

  it("mỗi quyền chỉ dùng một lần trong ván", () => {
    let s = base();
    const res: LifelineResult = {
      kind: "plusOne",
      advisors: [{ name: "x", suggested: 1, confidence: 0.5, message: "m" }],
    };
    s = reduce(s, { type: "lifelineUsed", id: "plusOne", result: res });
    expect(canUseLifeline(s, "plusOne")).toBe(false);
    const again = reduce(s, { type: "lifelineUsed", id: "plusOne", result: res });
    expect(again.lifelineLog).toHaveLength(1);
  });

  it("nhà thông thái bị khóa trước câu 6", () => {
    expect(canUseLifeline(base(), "wiseMen")).toBe(false);
    const s6 = run(
      [{ type: "next" }, { type: "questionLoaded", question: q(6), token: "t" }],
      playCorrectThrough(5),
    );
    expect(s6.number).toBe(6);
    expect(canUseLifeline(s6, "wiseMen")).toBe(true);
  });

  it("quyền đã dùng được giữ qua các câu, nhưng kết quả của câu cũ bị xóa", () => {
    let s = base();
    s = reduce(s, {
      type: "lifelineUsed",
      id: "fiftyFifty",
      result: { kind: "fiftyFifty", removed: [0, 1] },
    });
    s = run(
      [
        { type: "select", index: 3 },
        { type: "lock" },
        { type: "answerRevealed", result: { correct: true, correctIndex: 3 } },
        { type: "next" },
        { type: "questionLoaded", question: q(2), token: "t2" },
      ],
      s,
    );
    expect(s.lifelinesUsed.fiftyFifty).toBe(true);
    expect(s.removed).toEqual([]);
    expect(s.lifelineLog).toEqual([]);
  });
});
