# Chính sách bảo mật

## Báo lỗ hổng

Vui lòng **không** tạo issue công khai. Báo riêng tư qua
[GitHub Security Advisories](https://github.com/buiducnhat/ai-la-trieu-phu/security/advisories/new)
hoặc email nhaths4701@gmail.com, kèm cách tái hiện. Dự án do một người bảo trì, thường phản hồi trong vòng vài ngày.

## Phạm vi

Chỉ nhánh `main` (bản đang chạy trên Cloudflare Workers) được hỗ trợ.

Lưu ý về thiết kế: token đáp án (AES-256-GCM) chỉ nhằm ngăn xem trộm đáp án qua DevTools, **không** chống gian lận có chủ đích; xem
[docs/architecture/game-flow.md](docs/architecture/game-flow.md). Báo cáo về việc này là hành vi đã biết, không phải lỗ hổng.

Không bao giờ commit `GAME_SECRET`, `LLM_API_KEY` hoặc file `.env` / `.dev.vars`. Nếu lỡ lộ khóa, hãy xoay khóa ngay.
