import { describe, expect, it } from "vite-plus/test";

import { knowledgeProbability, LifelineUnavailableError, useLifeline } from "./lifelines";

const options = ["Huế", "Hà Nội", "Đà Nẵng", "Cần Thơ"] as const;

function ctx(number: number, removed: number[] = []) {
  return { number, options, answer: 1, removed };
}

/** RNG giả lập xác định (LCG) để test lặp lại được. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("50:50", () => {
  it("luôn loại đúng 2 phương án sai và giữ lại đáp án đúng", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const r = useLifeline("fiftyFifty", ctx(5), seeded(seed));
      if (r.kind !== "fiftyFifty") throw new Error("kind");
      expect(new Set(r.removed).size).toBe(2);
      expect(r.removed).not.toContain(1);
    }
  });
});

describe("gọi điện, đồng hành, nhà thông thái", () => {
  it("nhà thông thái bị từ chối trước câu 6", () => {
    expect(() => useLifeline("wiseMen", ctx(5))).toThrow(LifelineUnavailableError);
    expect(useLifeline("wiseMen", ctx(6)).kind).toBe("wiseMen");
  });

  it("nhà thông thái đưa 2 ý kiến, người thân/đồng hành đưa 1", () => {
    const w = useLifeline("wiseMen", ctx(8));
    const p = useLifeline("phoneFriend", ctx(8));
    const o = useLifeline("plusOne", ctx(8));
    if (w.kind !== "wiseMen" || p.kind !== "phoneFriend" || o.kind !== "plusOne") throw new Error();
    expect(w.advisors).toHaveLength(2);
    expect(p.advisors).toHaveLength(1);
    expect(o.advisors).toHaveLength(1);
  });

  it("không bao giờ gợi ý phương án đã bị 50:50 loại", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const removed = [0, 3];
      for (const id of ["phoneFriend", "plusOne", "wiseMen"] as const) {
        const r = useLifeline(id, ctx(12, removed), seeded(seed));
        if (r.kind === "fiftyFifty") throw new Error();
        for (const a of r.advisors) expect(removed).not.toContain(a.suggested);
      }
    }
  });

  it("độ chính xác giảm khi câu hỏi khó hơn (thống kê)", () => {
    const rate = (n: number) => {
      let right = 0;
      const trials = 4000;
      for (let seed = 1; seed <= trials; seed++) {
        const r = useLifeline("phoneFriend", ctx(n), seeded(seed * 7919));
        if (r.kind === "phoneFriend" && r.advisors[0].suggested === 1) right++;
      }
      return right / trials;
    };
    const easy = rate(1);
    const hard = rate(15);
    expect(easy).toBeGreaterThan(0.9);
    expect(hard).toBeLessThan(0.7);
    expect(hard).toBeGreaterThan(0.4);
  });

  it("đường cong kiến thức nội suy tuyến tính", () => {
    expect(knowledgeProbability({ start: 0.9, end: 0.4 }, 1)).toBeCloseTo(0.9);
    expect(knowledgeProbability({ start: 0.9, end: 0.4 }, 15)).toBeCloseTo(0.4);
    expect(knowledgeProbability({ start: 0.9, end: 0.4 }, 8)).toBeCloseTo(0.65);
  });
});
