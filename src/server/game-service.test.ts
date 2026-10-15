import { describe, expect, it } from "vite-plus/test";

import { checkAnswer, getPublicConfig, issueQuestion, runLifeline } from "./game-service";

const base = {
  exclude: [] as string[],
  avoid: [] as string[],
  topic: "",
  llm: { provider: "server", model: "", apiKey: "" },
  clientKey: "test",
};

describe("phát câu hỏi từ bộ có sẵn (dữ liệu thật đóng gói trong repo)", () => {
  it("mỗi câu 1..15 đều có kèm token chấm được và đúng một đáp án đúng", async () => {
    for (let number = 1; number <= 15; number++) {
      const { question, token, notice } = await issueQuestion({ ...base, number, source: "bank" });
      expect(notice).toBeUndefined();
      expect(question.number).toBe(number);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      const verdicts = [0, 1, 2, 3].map((i) => checkAnswer(token, i).correct);
      expect(verdicts.filter(Boolean)).toHaveLength(1);
    }
  });

  it("dữ liệu gửi xuống trình duyệt không chứa đáp án", async () => {
    const issued = await issueQuestion({ ...base, number: 4, source: "bank" });
    const json = JSON.stringify(issued);
    expect(json).not.toMatch(/"answer"|"correct|explanation/);
  });

  it("không lặp câu đã ra trong cùng ván", async () => {
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      const { question } = await issueQuestion({
        ...base,
        number: 1,
        exclude: seen,
        source: "bank",
      });
      expect(seen).not.toContain(question.id);
      seen.push(question.id);
    }
  });

  it("50:50 qua token loại đúng 2 phương án sai; nhà thông thái bị từ chối ở câu 3", async () => {
    const { token, question } = await issueQuestion({ ...base, number: 3, source: "bank" });
    const r = runLifeline(token, "fiftyFifty", []);
    if (r.kind !== "fiftyFifty") throw new Error("kind");
    for (const i of r.removed) expect(checkAnswer(token, i).correct).toBe(false);
    expect(question.options).toHaveLength(4);
    expect(() => runLifeline(token, "wiseMen", [])).toThrow();
  });
});

describe("chế độ AI khi chưa cấu hình", () => {
  it("quay về bộ có sẵn và báo cho người chơi", async () => {
    const issued = await issueQuestion({ ...base, number: 2, source: "llm" });
    expect(issued.question.origin).toBe("bank");
    expect(issued.notice).toMatch(/Chưa cấu hình AI/);
  });

  it("cấu hình công khai không lộ khóa", async () => {
    const config = await getPublicConfig();
    expect(config.bankSize).toBeGreaterThan(1000);
    expect(JSON.stringify(config)).not.toMatch(/key/i);
  });
});
