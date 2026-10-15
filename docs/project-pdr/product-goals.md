# Mục tiêu sản phẩm

Game **Ai Là Triệu Phú** tiếng Việt chạy trên web, giao diện 8-bit, một ứng dụng TanStack Start fullstack (không backend tách), triển khai trên Cloudflare Workers.

Yêu cầu ban đầu của chủ dự án:

- Luật chơi cập nhật mới nhất (2026), đúng mốc câu hỏi, quyền trợ giúp, tiền thưởng.
- Câu hỏi lấy từ bộ công khai trên internet, kèm tùy chọn sinh bằng LLM/AI cấu hình được.
- Dùng shadcn + 8bitcn và framework fullstack mới nhất. Ban đầu dựng bằng Next.js, sau đó chuyển sang TanStack Start (theo hướng dẫn migrate chính thức) để deploy Cloudflare Workers dễ hơn.

## Trường hợp sử dụng

- Người chơi chơi ván 15 câu với 4 quyền trợ giúp, có thể dừng để giữ tiền.
- Chọn nguồn câu hỏi (bộ có sẵn / AI / xen kẽ) và chủ đề ưu tiên.
- Chủ triển khai bật AI bằng biến môi trường, hoặc người chơi dùng khóa API riêng.
- Chủ triển khai thêm bộ câu hỏi công khai bằng `QUESTION_BANK_URLS`.

## Ngoài phạm vi hiện tại

Tài khoản/bảng xếp hạng chung, nhiều người chơi, lưu ván giữa chừng, phát âm thanh/giọng MC thật. Thành tích chỉ lưu cục bộ (10 ván gần nhất).
