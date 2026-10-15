import { describe, expect, it } from "vite-plus/test";

import { bedFor, finalAnswerFor, hasReadyCue, rightFor, wrongFor } from "./audio-cues";
import { AUDIO_FILES } from "./audio-manifest";

const QUESTIONS = Array.from({ length: 15 }, (_, i) => i + 1);

describe("audio-cues", () => {
  it("mọi câu 1–15 đều trỏ tới tệp có trong danh mục", () => {
    for (const n of QUESTIONS) {
      const keys = [bedFor(n), ...rightFor(n), wrongFor(n), finalAnswerFor(n) ?? bedFor(n)];
      for (const key of keys) expect(AUDIO_FILES, `câu ${n}: ${key}`).toHaveProperty(key);
    }
  });

  it("nhạc nền: câu 1–5 chung một bản, từ câu 6 mỗi câu một bản", () => {
    expect(new Set([1, 2, 3, 4, 5].map(bedFor))).toEqual(new Set(["bed-1-5"]));
    expect(new Set(QUESTIONS.slice(5).map(bedFor)).size).toBe(10);
  });

  it("nhạc 'Sẵn sàng' chỉ ở câu 1 và từ câu 6", () => {
    expect(QUESTIONS.filter(hasReadyCue)).toEqual([1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("câu trả lời cuối cùng chỉ từ câu 6, câu n và n+5 dùng chung bản", () => {
    expect([1, 5].map(finalAnswerFor)).toEqual([null, null]);
    for (const n of [6, 7, 8, 9, 10]) expect(finalAnswerFor(n)).toBe(finalAnswerFor(n + 5));
    expect(new Set([6, 7, 8, 9, 10].map(finalAnswerFor)).size).toBe(5);
  });

  it("câu 11–14 sai dùng lại nhạc câu 6–9; câu 10 và 15 có nhạc riêng", () => {
    for (const n of [6, 7, 8, 9]) expect(wrongFor(n + 5)).toBe(wrongFor(n));
    expect(wrongFor(10)).toBe("wrong-10");
    expect(wrongFor(15)).toBe("wrong-15");
  });

  it("chỉ câu 15 đúng mới nối nhạc Triệu phú", () => {
    expect(rightFor(15)).toEqual(["right-15", "millionaire"]);
    expect(rightFor(14)).toEqual(["right-14"]);
    expect(rightFor(2)).toEqual(rightFor(4));
  });
});
