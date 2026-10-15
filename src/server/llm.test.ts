import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  buildPrompt,
  generateQuestion,
  isNearDuplicate,
  type LlmConfig,
  parseGeneratedQuestion,
  resolveClientLlm,
  resolveEnvLlm,
} from "./llm";

const good = {
  question: "Sông nào dài nhất Việt Nam?",
  options: ["A. Sông Hồng", "Sông Mê Kông", "Sông Đà", "Sông Cầu"],
  answerIndex: 1,
  category: "Địa lý",
  explanation: "Mê Kông dài nhất chảy qua Việt Nam.",
};

describe("parseGeneratedQuestion", () => {
  it("đọc JSON trong khối markdown và bỏ tiền tố A./B.", () => {
    const q = parseGeneratedQuestion("Đây là kết quả:\n```json\n" + JSON.stringify(good) + "\n```");
    expect(q.options[0]).toBe("Sông Hồng");
    expect(q.answer).toBe(1);
    expect(q.category).toBe("Địa lý");
  });

  it("nhận đáp án dạng chữ cái hoặc nội dung", () => {
    const { answerIndex: _drop, ...rest } = good;
    expect(parseGeneratedQuestion(JSON.stringify({ ...rest, answer: "C" })).answer).toBe(2);
    expect(parseGeneratedQuestion(JSON.stringify({ ...rest, answer: "Sông Đà" })).answer).toBe(2);
  });

  it("từ chối phương án trùng, thiếu đáp án, hoặc 'tất cả các đáp án'", () => {
    expect(() =>
      parseGeneratedQuestion(JSON.stringify({ ...good, options: ["a", "a", "b", "c"] })),
    ).toThrow();
    expect(() =>
      parseGeneratedQuestion(JSON.stringify({ ...good, answerIndex: undefined })),
    ).toThrow();
    expect(() =>
      parseGeneratedQuestion(
        JSON.stringify({ ...good, options: ["a", "b", "c", "Tất cả các đáp án trên"] }),
      ),
    ).toThrow();
    expect(() => parseGeneratedQuestion("không có json")).toThrow();
  });
});

describe("buildPrompt", () => {
  it("mô tả đúng độ khó theo số câu và truyền chủ đề + câu cần tránh", () => {
    expect(buildPrompt({ number: 2 }).user).toContain("DỄ");
    expect(buildPrompt({ number: 8 }).user).toContain("TRUNG BÌNH");
    const hard = buildPrompt({ number: 15, topic: "Lịch sử Việt Nam", avoid: ["Câu cũ?"] }).user;
    expect(hard).toContain("KHÓ");
    expect(hard).toContain("câu triệu phú");
    expect(hard).toContain("Lịch sử Việt Nam");
    expect(hard).toContain("- Câu cũ?");
  });
});

describe("cấu hình AI", () => {
  it("không có khóa thì không bật AI của máy chủ", () => {
    expect(resolveEnvLlm({})).toBeNull();
    expect(resolveEnvLlm({ LLM_PROVIDER: "openai" })).toBeNull();
  });

  it("đọc cấu hình preset và máy chủ tùy chỉnh (Ollama không cần khóa)", () => {
    const o = resolveEnvLlm({ LLM_PROVIDER: "openai", LLM_API_KEY: "k", LLM_MODEL: "m" });
    expect(o).toMatchObject({ kind: "openai", baseUrl: "https://api.openai.com/v1", model: "m" });
    const a = resolveEnvLlm({ ANTHROPIC_API_KEY: "k" });
    expect(a?.kind).toBe("anthropic");
    const c = resolveEnvLlm({
      LLM_PROVIDER: "custom",
      LLM_BASE_URL: "http://localhost:11434/v1/",
      LLM_MODEL: "qwen",
    });
    expect(c).toMatchObject({ kind: "openai", baseUrl: "http://localhost:11434/v1", apiKey: "" });
  });

  it("cấu hình của người chơi chỉ nhận nhà cung cấp trong danh sách, không nhận URL tùy ý", () => {
    expect(
      resolveClientLlm({ provider: "http://evil.local", model: "x", apiKey: "k" }, {}),
    ).toBeNull();
    expect(resolveClientLlm({ provider: "groq", model: "", apiKey: "" }, {})).toBeNull();
    expect(resolveClientLlm({ provider: "groq", model: "", apiKey: "k" }, {})?.baseUrl).toBe(
      "https://api.groq.com/openai/v1",
    );
    expect(
      resolveClientLlm({ provider: "server", model: "", apiKey: "" }, { ANTHROPIC_API_KEY: "z" })
        ?.kind,
    ).toBe("anthropic");
  });
});

describe("generateQuestion qua HTTP giả lập", () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  function start(
    handler: (req: IncomingMessage, body: string) => { status: number; json: unknown },
  ): Promise<{
    url: string;
    requests: { url: string; headers: IncomingMessage["headers"]; body: Record<string, unknown> }[];
  }> {
    const requests: {
      url: string;
      headers: IncomingMessage["headers"];
      body: Record<string, unknown>;
    }[] = [];
    return new Promise((resolve) => {
      server = createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          requests.push({
            url: req.url ?? "",
            headers: req.headers,
            body: JSON.parse(body || "{}"),
          });
          const out = handler(req, body);
          res.writeHead(out.status, { "content-type": "application/json" });
          res.end(JSON.stringify(out.json));
        });
      }).listen(0, "127.0.0.1", () => {
        resolve({ url: `http://127.0.0.1:${(server!.address() as AddressInfo).port}`, requests });
      });
    });
  }

  const cfg = (kind: "openai" | "anthropic", baseUrl: string): LlmConfig => ({
    kind,
    baseUrl,
    apiKey: "secret",
    model: "m",
    label: "test",
  });

  it("OpenAI-compatible: gửi Bearer + response_format, đọc choices[0].message.content", async () => {
    const s = await start(() => ({
      status: 200,
      json: { choices: [{ message: { content: JSON.stringify(good) } }] },
    }));
    const q = await generateQuestion(cfg("openai", s.url), { number: 3 });
    expect(q.answer).toBe(1);
    expect(s.requests[0]?.url).toBe("/chat/completions");
    expect(s.requests[0]?.headers.authorization).toBe("Bearer secret");
    expect(s.requests[0]?.body.response_format).toEqual({ type: "json_object" });
  });

  it("OpenAI-compatible: thử lại không có response_format khi máy chủ trả 400", async () => {
    let n = 0;
    const s = await start(() =>
      ++n === 1
        ? { status: 400, json: { error: "unsupported" } }
        : { status: 200, json: { choices: [{ message: { content: JSON.stringify(good) } }] } },
    );
    await generateQuestion(cfg("openai", s.url), { number: 3 });
    expect(s.requests).toHaveLength(2);
    expect(s.requests[1]?.body.response_format).toBeUndefined();
  });

  it("Anthropic: dùng x-api-key và /v1/messages", async () => {
    const s = await start(() => ({
      status: 200,
      json: { content: [{ type: "text", text: JSON.stringify(good) }] },
    }));
    const q = await generateQuestion(cfg("anthropic", s.url), { number: 12 });
    expect(q.question).toContain("Sông");
    expect(s.requests[0]?.url).toBe("/v1/messages");
    expect(s.requests[0]?.headers["x-api-key"]).toBe("secret");
    expect(s.requests[0]?.headers["anthropic-version"]).toBe("2023-06-01");
  });

  it("thử lại 1 lần khi AI trả JSON hỏng, rồi thành công", async () => {
    let n = 0;
    const s = await start(() => ({
      status: 200,
      json: {
        choices: [
          { message: { content: ++n === 1 ? "xin lỗi không làm được" : JSON.stringify(good) } },
        ],
      },
    }));
    await generateQuestion(cfg("openai", s.url), { number: 1 });
    expect(s.requests).toHaveLength(2);
  });

  it("lỗi HTTP không thử lại và ném lỗi", async () => {
    const s = await start(() => ({ status: 401, json: { error: "bad key" } }));
    await expect(generateQuestion(cfg("openai", s.url), { number: 1 })).rejects.toThrow(/401/);
    expect(s.requests).toHaveLength(1);
  });

  it("câu trùng câu đã ra thì xin lại, câu khác thì nhận", async () => {
    const other = { ...good, question: "Thủ đô của nước Pháp là thành phố nào?" };
    let n = 0;
    const s = await start(() => ({
      status: 200,
      json: { choices: [{ message: { content: JSON.stringify(++n === 1 ? good : other) } }] },
    }));
    const q = await generateQuestion(cfg("openai", s.url), {
      number: 1,
      avoid: ["Con sông nào dài nhất Việt Nam?"],
    });
    expect(q.question).toBe(other.question);
    expect(s.requests).toHaveLength(2);
  });

  it("hết lượt thử mà vẫn trùng thì ném lỗi để quay về bộ có sẵn", async () => {
    const s = await start(() => ({
      status: 200,
      json: { choices: [{ message: { content: JSON.stringify(good) } }] },
    }));
    await expect(
      generateQuestion(cfg("openai", s.url), { number: 1, avoid: [good.question] }),
    ).rejects.toThrow(/trùng/);
    expect(s.requests).toHaveLength(3);
  });
});

describe("isNearDuplicate", () => {
  it("bắt câu diễn đạt lại cùng ý, không bắt câu cùng chủ đề nhưng khác nội dung", () => {
    const a =
      "Trong Hệ Mặt Trời, hành tinh nào có chu kỳ tự quay quanh trục dài hơn chu kỳ quay quanh Mặt Trời?";
    const b =
      "Trong Hệ Mặt Trời, hành tinh nào có thời gian tự quay một vòng quanh trục dài hơn thời gian quay một vòng quanh Mặt Trời?";
    expect(isNearDuplicate(b, [a])).toBe(true);
    expect(isNearDuplicate("Hành tinh nào trong Hệ Mặt Trời có nhiều vệ tinh nhất?", [a])).toBe(
      false,
    );
    expect(isNearDuplicate("Thủ đô của nước Pháp là thành phố nào?", [a])).toBe(false);
    expect(isNearDuplicate(a, [])).toBe(false);
  });
});
