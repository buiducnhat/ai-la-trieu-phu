import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  type BankQuestion,
  loadBank,
  normalizeExternal,
  pickFromBank,
  remoteBankUrls,
  toIssued,
} from "./bank";

function bq(id: string, level: number, extra: Partial<BankQuestion> = {}): BankQuestion {
  return {
    id,
    question: `Câu ${id}?`,
    options: ["a", "b", "c", "d"],
    answer: 2,
    level,
    source: "t",
    ...extra,
  };
}

describe("normalizeExternal", () => {
  it("đọc dạng {question, options[], answer: chữ cái}", () => {
    const [q] = normalizeExternal(
      [
        {
          id: 1,
          question: " Thủ đô của Pháp? ",
          options: ["Paris", "Lyon", "Nice", "Lille"],
          answer: "A",
          level: 2,
        },
      ],
      "src",
    );
    expect(q).toMatchObject({ question: "Thủ đô của Pháp?", answer: 0, level: 2, source: "src" });
  });

  it("đọc dạng Hugging Face {Question, Options:[{key,answer}], Answer}", () => {
    const [q] = normalizeExternal(
      [
        {
          Question: "Albicelestes là biệt danh của đội nào?",
          Options: [
            { key: "A", answer: "Tây Ban Nha" },
            { key: "B", answer: "Bồ Đào Nha" },
            { key: "C", answer: "Séc" },
            { key: "D", answer: "Argentina" },
          ],
          Answer: "D",
        },
      ],
      "hf",
    );
    expect(q?.answer).toBe(3);
    expect(q?.options[3]).toBe("Argentina");
  });

  it("nhận đáp án là nội dung của phương án, và độ khó dạng chữ", () => {
    const [q] = normalizeExternal(
      {
        questions: [
          { question: "1+1?", options: ["1", "2", "3", "4"], answer: "2", difficulty: "hard" },
        ],
      },
      "x",
    );
    expect(q).toMatchObject({ answer: 1, level: 13 });
  });

  it("bỏ qua dòng hỏng: thiếu đáp án, trùng phương án, không đủ 4 lựa chọn, trùng câu hỏi", () => {
    const rows = [
      { question: "ok", options: ["1", "2", "3", "4"], answer: 0 },
      { question: "ok", options: ["1", "2", "3", "4"], answer: 1 },
      { question: "trùng phương án", options: ["1", "1", "3", "4"], answer: 0 },
      { question: "thiếu", options: ["1", "2", "3"], answer: 0 },
      { question: "không khớp", options: ["1", "2", "3", "4"], answer: "9" },
    ];
    expect(normalizeExternal(rows, "x")).toHaveLength(1);
  });

  it("gán độ khó ổn định khi nguồn không có độ khó", () => {
    const row = { id: "z", question: "q", options: ["1", "2", "3", "4"], answer: 0 };
    const a = normalizeExternal([row], "x")[0]!.level;
    const b = normalizeExternal([row], "x")[0]!.level;
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(1);
    expect(a).toBeLessThanOrEqual(15);
  });
});

describe("pickFromBank", () => {
  const bank = [bq("a", 1), bq("b", 1), bq("c", 5), bq("d", 9, { category: "Lịch sử" })];

  it("ưu tiên đúng độ khó", () => {
    for (let i = 0; i < 20; i++)
      expect(["a", "b"]).toContain(pickFromBank(bank, { number: 1 })?.id);
  });

  it("không lặp câu đã dùng và mở rộng sang mức gần nhất khi hết", () => {
    expect(pickFromBank(bank, { number: 1, exclude: ["a", "b"] })?.id).toBe("c");
    expect(pickFromBank(bank, { number: 15, exclude: [] })?.id).toBe("d");
  });

  it("trả null khi kho đã cạn", () => {
    expect(pickFromBank(bank, { number: 3, exclude: ["a", "b", "c", "d"] })).toBeNull();
  });

  it("lọc theo chủ đề không dấu khi đủ câu, nếu không thì bỏ qua chủ đề", () => {
    const many = [1, 2, 3, 4].map((i) => bq(`h${i}`, 3, { category: "Lịch sử" }));
    const mixed = [...many, bq("o", 3, { category: "Địa lý" })];
    for (let i = 0; i < 20; i++)
      expect(pickFromBank(mixed, { number: 3, topic: "lich su" })?.id).toMatch(/^h/);
    // chỉ có 1 câu địa lý -> dưới ngưỡng, quay về toàn bộ kho
    const picked = new Set<string>();
    for (let i = 0; i < 60; i++)
      picked.add(pickFromBank(mixed, { number: 3, topic: "địa lý" })!.id);
    expect(picked.size).toBeGreaterThan(1);
  });
});

describe("toIssued", () => {
  it("xáo trộn phương án nhưng đáp án đúng vẫn trỏ đúng nội dung", () => {
    const q = bq("a", 1, { options: ["Huế", "Hà Nội", "Đà Nẵng", "Cần Thơ"], answer: 1 });
    for (let i = 0; i < 50; i++) {
      const out = toIssued(q);
      expect(out.options[out.answer]).toBe("Hà Nội");
      expect([...out.options].sort()).toEqual([...q.options].sort());
    }
  });
});

describe("bộ câu hỏi từ URL công khai", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("tách danh sách URL, bỏ giá trị không phải http(s)", () => {
    expect(
      remoteBankUrls({
        QUESTION_BANK_URLS: "https://a.test/x.json, ftp://b  http://c.test/y.json\nrác",
      }),
    ).toEqual(["https://a.test/x.json", "http://c.test/y.json"]);
  });

  it("gộp câu hỏi tải từ URL vào kho có sẵn; URL lỗi thì bỏ qua", async () => {
    vi.stubEnv("QUESTION_BANK_URLS", "https://ok.test/bank.json https://down.test/bank.json");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.startsWith("https://ok.test")
          ? Response.json([
              {
                id: "r1",
                question: "Câu từ xa?",
                options: ["a", "b", "c", "d"],
                answer: "C",
                level: 6,
              },
            ])
          : new Response("nope", { status: 503 }),
      ),
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const bank = await loadBank();
    const remote = bank.find((q) => q.question === "Câu từ xa?");
    expect(remote).toMatchObject({ answer: 2, level: 6, source: "ok.test/bank.json" });
    expect(bank.length).toBeGreaterThan(1000);
  });
});
