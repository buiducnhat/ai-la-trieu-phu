# Âm thanh

Phát tệp thật của chương trình (phiên bản 15) khi có; thiếu tệp thì dùng tiếng chiptune tổng hợp bằng WebAudio, game vẫn chạy bình thường.

| Thành phần                  | Vai trò                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/lib/audio-manifest.ts` | Khóa -> tên tệp trên Ai là triệu phú Wiki (trang "Âm thanh"); `AUDIO_TRIM_SECONDS` cho tệp quá dài                 |
| `src/lib/audio-cues.ts`     | Hàm thuần: câu n + kết quả -> tệp nào (có test)                                                                    |
| `src/lib/sound.ts`          | Bộ phát: hàng đợi tệp, nhạc nền lặp, quay lại nhạc nền sau trợ giúp, dự phòng chiptune                             |
| `scripts/fetch-audio.ts`    | `bun run audio:fetch`: tải qua API wiki, đổi sang MP3 bằng ffmpeg -> `public/audio/<khóa>.mp3` (~26 MB, đã commit) |

## Ánh xạ sự kiện

- Bắt đầu: "Lên ghế nóng". Câu hiện ra: "Sẵn sàng" (câu 1 và 6–15, cắt còn 8 giây) rồi nhạc nền lặp (câu 1–5 chung một bản, mỗi câu từ 6 một bản). Câu 1 chờ "Lên ghế nóng" phát xong.
- Khóa đáp án: nhạc "Câu trả lời cuối cùng" từ câu 6 (câu n và n+5 dùng chung); câu 1–5 để nhạc nền chạy tiếp.
- Kết quả: nhạc đúng/sai theo câu (câu 15 đúng nối nhạc "Triệu phú"). Câu 11–14 sai dùng lại nhạc câu 6–9.
- Trợ giúp: 50:50, người đồng hành, gọi điện/nhà thông thái (nhạc "Sẵn sàng" rồi đồng hồ 30 giây); đóng hộp thoại sớm thì phát "kết thúc sớm". Xong thì quay lại nhạc nền.
- Dừng cuộc chơi: "Hết lượt chơi".

## Giấy phép

Âm thanh thuộc bản quyền chương trình (Sony Pictures Television / VTV, nhạc của Keith & Matthew Strachan, Ramon Covalo, Nick Magnus); nội dung wiki là CC-BY-SA nhưng không bao trùm tệp âm thanh. `public/audio/` được commit cùng repo (chủ dự án đã chọn vậy) để bản triển khai có âm thanh thật. Rủi ro bản quyền khi phân phối công khai tương tự bộ câu hỏi, xem `question-bank-licensing.md`; muốn gỡ thì xóa thư mục, game tự dùng chiptune.
