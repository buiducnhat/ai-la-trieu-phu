import { describe, expect, it } from "vite-plus/test";

import { InvalidTokenError, openQuestion, sealQuestion } from "./token";

const payload = {
  id: "bank-abc",
  number: 7,
  text: "Thủ đô của Việt Nam là gì?",
  options: ["Huế", "Hà Nội", "Đà Nẵng", "Cần Thơ"] as [string, string, string, string],
  answer: 1,
  source: "test",
  origin: "bank" as const,
};

describe("token câu hỏi", () => {
  it("mã hóa rồi giải mã lại đúng nội dung", () => {
    const token = sealQuestion(payload);
    expect(openQuestion(token)).toMatchObject(payload);
  });

  it("token không để lộ đáp án hay nội dung dạng chữ thường", () => {
    const token = sealQuestion(payload);
    expect(token).not.toContain("Hà Nội");
    expect(Buffer.from(token.split(".")[2]!, "base64url").toString("utf8")).not.toContain("answer");
  });

  it("từ chối token bị sửa", () => {
    const [iv, tag, data] = sealQuestion(payload).split(".") as [string, string, string];
    const flipped = Buffer.from(data, "base64url");
    flipped[0] = (flipped[0]! ^ 1) & 0xff;
    expect(() => openQuestion([iv, tag, flipped.toString("base64url")].join("."))).toThrow(
      InvalidTokenError,
    );
    expect(() => openQuestion("rác")).toThrow(InvalidTokenError);
  });

  it("từ chối token hết hạn", () => {
    const token = sealQuestion(payload, Date.now() - 7 * 60 * 60 * 1000);
    expect(() => openQuestion(token)).toThrow(/hết hạn/);
  });
});
