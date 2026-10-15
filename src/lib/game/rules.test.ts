import { describe, expect, it } from "vite-plus/test";

import {
  formatVnd,
  isLifelineAvailableAt,
  isMilestone,
  LIFELINES,
  MILESTONES,
  PRIZE_LADDER,
  prizeForQuestion,
  prizeOnWrongAnswer,
  tierOf,
  TOTAL_QUESTIONS,
  walkAwayPrize,
} from "./rules";

describe("thang tiền thưởng 2026", () => {
  it("có 15 mốc tăng dần, câu 15 là 500 triệu", () => {
    expect(PRIZE_LADDER).toHaveLength(TOTAL_QUESTIONS);
    expect(prizeForQuestion(1)).toBe(1_000_000);
    expect(prizeForQuestion(15)).toBe(500_000_000);
    for (let i = 1; i < PRIZE_LADDER.length; i++) {
      expect(PRIZE_LADDER[i]!).toBeGreaterThan(PRIZE_LADDER[i - 1]!);
    }
  });

  it("mốc quan trọng là câu 5 (5 triệu) và câu 10 (22 triệu)", () => {
    expect(MILESTONES).toEqual([5, 10]);
    expect(prizeForQuestion(5)).toBe(5_000_000);
    expect(prizeForQuestion(10)).toBe(22_000_000);
    expect(isMilestone(5)).toBe(true);
    expect(isMilestone(6)).toBe(false);
  });

  it("từ chối số câu không hợp lệ", () => {
    expect(() => prizeForQuestion(0)).toThrow(RangeError);
    expect(() => prizeForQuestion(16)).toThrow(RangeError);
    expect(() => walkAwayPrize(-1)).toThrow(RangeError);
  });
});

describe("tiền nhận được khi dừng hoặc trả lời sai", () => {
  it("dừng cuộc chơi: nhận tiền của câu vừa trả lời đúng", () => {
    expect(walkAwayPrize(0)).toBe(0);
    expect(walkAwayPrize(4)).toBe(4_000_000);
    expect(walkAwayPrize(14)).toBe(250_000_000);
  });

  it("trả lời sai: về mốc gần nhất đã qua", () => {
    // Câu 1-5: không có mốc nào -> 0 (kể cả sai đúng ở câu 5)
    for (const n of [1, 2, 3, 4, 5]) expect(prizeOnWrongAnswer(n)).toBe(0);
    // Câu 6-10: giữ mốc 5 triệu
    for (const n of [6, 7, 8, 9, 10]) expect(prizeOnWrongAnswer(n)).toBe(5_000_000);
    // Câu 11-15: giữ mốc 22 triệu
    for (const n of [11, 12, 13, 14, 15]) expect(prizeOnWrongAnswer(n)).toBe(22_000_000);
  });
});

describe("quyền trợ giúp 2026", () => {
  it("có đúng 4 quyền, không còn hỏi ý kiến khán giả", () => {
    expect(LIFELINES.map((l) => l.id)).toEqual(["fiftyFifty", "phoneFriend", "plusOne", "wiseMen"]);
  });

  it("hai nhà thông thái chỉ dùng được từ câu 6", () => {
    expect(isLifelineAvailableAt("wiseMen", 5)).toBe(false);
    expect(isLifelineAvailableAt("wiseMen", 6)).toBe(true);
    expect(isLifelineAvailableAt("fiftyFifty", 1)).toBe(true);
  });

  it("gọi điện và nhà thông thái có 30 giây", () => {
    expect(LIFELINES.find((l) => l.id === "phoneFriend")?.seconds).toBe(30);
    expect(LIFELINES.find((l) => l.id === "wiseMen")?.seconds).toBe(30);
  });
});

describe("tiện ích", () => {
  it("chia nhóm độ khó", () => {
    expect(tierOf(5)).toBe("easy");
    expect(tierOf(6)).toBe("medium");
    expect(tierOf(10)).toBe("medium");
    expect(tierOf(11)).toBe("hard");
  });

  it("định dạng tiền Việt", () => {
    expect(formatVnd(500_000_000).replace(/\u00a0/g, " ")).toBe("500.000.000 đ");
  });
});
