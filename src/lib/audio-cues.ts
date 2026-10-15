import type { AudioKey } from "./audio-manifest";
import type { LifelineId } from "./game/rules";

/**
 * Chọn âm thanh theo diễn biến ván chơi, bám bảng "Âm thanh" của Ai là triệu phú Wiki
 * (phiên bản 15, từ 31/03/2026). Thuần hàm: không đụng tới trình duyệt.
 */

/** Nhạc nền khi chờ trả lời: câu 1–5 dùng chung một bản, từ câu 6 mỗi câu một bản. */
export function bedFor(n: number): AudioKey {
  return n <= 5 ? "bed-1-5" : (`bed-${n}` as AudioKey);
}

/** Nhạc "Sẵn sàng" mở đầu: câu 1 và câu 6–15 (câu 2–5 vào thẳng nhạc nền). */
export function hasReadyCue(n: number): boolean {
  return n === 1 || n >= 6;
}

/** Nhạc "Câu trả lời cuối cùng": chỉ từ câu 6; câu n và n+5 dùng chung bản. */
export function finalAnswerFor(n: number): AudioKey | null {
  if (n < 6) return null;
  const low = n <= 10 ? n : n - 5;
  return `final-${low}-${low + 5}` as AudioKey;
}

/** Nhạc khi đáp án đúng. Câu cuối nối tiếp nhạc "Triệu phú". */
export function rightFor(n: number): AudioKey[] {
  if (n <= 4) return ["right-1-4"];
  if (n === 15) return ["right-15", "millionaire"];
  return [`right-${n}` as AudioKey];
}

/** Nhạc khi đáp án sai. Câu 11–14 dùng lại nhạc của câu 6–9. */
export function wrongFor(n: number): AudioKey {
  if (n <= 5) return "wrong-1-5";
  if (n === 10 || n === 15) return `wrong-${n}`;
  const low = n < 10 ? n : n - 5;
  return `wrong-${low}-${low + 5}` as AudioKey;
}

/** Âm thanh khi mở quyền trợ giúp, và nhạc kết thúc sớm khi đóng hộp thoại trong lúc đồng hồ chạy. */
export function lifelineCue(id: LifelineId): { steps: AudioKey[]; earlyEnd: AudioKey | null } {
  switch (id) {
    case "fiftyFifty":
      return { steps: ["life-5050"], earlyEnd: null };
    case "phoneFriend":
      return { steps: ["life-ready", "life-phone"], earlyEnd: "life-end" };
    case "plusOne":
      return { steps: ["life-plus-one"], earlyEnd: null };
    case "wiseMen":
      return { steps: ["life-ready", "life-wise"], earlyEnd: "life-end" };
  }
}
