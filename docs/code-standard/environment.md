# Biến môi trường và chạy dự án

Tất cả đều tùy chọn trừ `GAME_SECRET` ở production. Local/preview: sao chép `.env.example` thành `.dev.vars` (Cloudflare plugin đọc file này; bị gitignore). Production: `wrangler secret put GAME_SECRET` / `LLM_API_KEY`, biến không bí mật đặt trong khối `vars` của `wrangler.jsonc` hoặc dashboard. Env được đọc từ `process.env` (bật bởi `nodejs_compat`).

| Biến                                       | Tác dụng                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GAME_SECRET`                              | Khóa mã hóa token. **Bắt buộc ở production** (thiếu thì mọi lệnh phát câu hỏi lỗi). Ở dev/test bỏ trống thì dùng khóa ngẫu nhiên theo tiến trình.             |
| `QUESTION_SOURCE`                          | `bank` \| `llm` \| `mixed`. Mặc định: `mixed` nếu có LLM, ngược lại `bank`.                                                                                   |
| `QUESTION_BANK_URLS`                       | Danh sách URL JSON công khai, ngăn bằng dấu phẩy/khoảng trắng.                                                                                                |
| `LLM_PROVIDER`                             | `openai` \| `anthropic` \| `gemini` \| `openrouter` \| `groq` \| `custom`. Nếu bỏ trống: suy ra từ `LLM_BASE_URL`, `ANTHROPIC_API_KEY` hoặc `OPENAI_API_KEY`. |
| `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` | Khóa, model, URL (bắt buộc `LLM_BASE_URL` + `LLM_MODEL` với `custom`; `custom` không cần khóa).                                                               |
| `LLM_RATE_LIMIT_PER_10_MIN`                | Giới hạn gọi LLM bằng khóa server theo IP (mặc định 120).                                                                                                     |

## Lệnh

```bash
bun install
bun run dev                     # vp dev, http://localhost:3000 (SSR chạy trong workerd)
bun run build && bun run preview  # build + chạy bản production trong workerd
bun run deploy                  # build + wrangler deploy (cần `wrangler login`)
vp check --fix                  # format + lint + type
vp test run                     # unit test
bun run bank:import             # dựng lại bank công khai (cần mạng)
```

Cài đặt người chơi (nguồn, chủ đề, khóa riêng, âm thanh) và thành tích lưu ở `localStorage` (`altp:settings:v1`, `altp:stats:v1`).
