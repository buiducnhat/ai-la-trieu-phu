# Ai Là Triệu Phú 8-bit

Trò chơi **Ai Là Triệu Phú** tiếng Việt, luật chơi **phiên bản 15 (phát sóng từ 31/03/2026, VTV3)**, giao diện pixel 8-bit.
[TanStack Start](https://tanstack.com/start) fullstack (Vite + React 19, server functions, không có backend tách rời) chạy trên **Cloudflare Workers**, shadcn/ui + [8bitcn](https://www.8bitcn.com/),
câu hỏi lấy từ bộ dữ liệu công khai hoặc do LLM/AI tạo (cấu hình được).

## Tài liệu

Xem [docs/SUMMARY.md](docs/SUMMARY.md) (kiến trúc, cấu trúc mã, quy ước, yêu cầu sản phẩm).

## Chạy thử

```bash
bun install
cp .env.example .dev.vars    # tùy chọn: bật AI, nguồn câu hỏi... (dev không cần GAME_SECRET)
bun run dev                  # http://localhost:3000 (SSR chạy trong workerd)
```

## Deploy Cloudflare Workers

```bash
bunx wrangler login
bunx wrangler secret put GAME_SECRET      # BẮT BUỘC (chuỗi ngẫu nhiên dài); thiếu thì mọi câu hỏi lỗi
bunx wrangler secret put LLM_API_KEY      # tùy chọn, nếu dùng AI
bun run deploy                            # vp build && wrangler deploy
```

Biến không bí mật (`LLM_PROVIDER`, `LLM_MODEL`, `QUESTION_SOURCE`, `QUESTION_BANK_URLS`...) thêm vào khối `vars` của
`wrangler.jsonc` hoặc trên dashboard. Thử bản production ngay trên máy: `bun run build && bun run preview`
(đặt `GAME_SECRET` trong `.dev.vars` trước khi build).

| Lệnh                                | Việc                                       |
| ----------------------------------- | ------------------------------------------ |
| `bun run dev` / `build` / `preview` | Vite+ (`vp`) + Cloudflare plugin (workerd) |
| `bun run deploy`                    | Build + `wrangler deploy`                  |
| `vp check`                          | Format + lint + type-check (Vite+)         |
| `vp test run`                       | Unit test (Vitest qua Vite+)               |
| `bun run bank:import`               | Tải lại và dựng lại bộ câu hỏi công khai   |

## Luật chơi (cập nhật 2026)

Nguồn: Ai là triệu phú Wiki (Phiên bản 15), Who Wants To Be A Millionaire Wiki, VTV / Tuổi Trẻ ngày 31/03–01/04/2026.
Toàn bộ hằng số nằm ở [`src/lib/game/rules.ts`](src/lib/game/rules.ts) (có test).

- 15 câu hỏi 4 phương án, không giới hạn thời gian; chọn đáp án rồi **khóa đáp án**. Trước khi khóa được **dừng cuộc chơi**.
- Thang tiền: 1 – 2 – 3 – 4 – **5 triệu** (mốc 1) – 6 – 8 – 10 – 14 – **22 triệu** (mốc 2) – 30 – 60 – 120 – 250 – **500 triệu** (câu 15, "triệu phú").
- Sai ở câu 1–5: 0 đ · câu 6–10: 5.000.000 đ · câu 11–15: 22.000.000 đ.
- 4 quyền trợ giúp, mỗi quyền một lần (có thể dùng nhiều quyền trong một câu):
  **50:50**, **Gọi điện thoại cho người thân** (30 giây), **Sự trợ giúp của người đồng hành**,
  **Sự trợ giúp của hai nhà thông thái** (30 giây, chỉ từ câu 6). "Hỏi ý kiến khán giả" không còn trong luật 2026.
- Người trợ giúp là mô phỏng: xác suất họ biết đáp án giảm dần theo độ khó (có thể sai), không phải AI "biết hết".

## Câu hỏi

Ba chế độ, chọn trong **Cài đặt** (mặc định theo `QUESTION_SOURCE`):

| Chế độ  | Hoạt động                                                                              |
| ------- | -------------------------------------------------------------------------------------- |
| `bank`  | Bộ câu hỏi công khai đóng gói sẵn (1.204 câu, mức độ 1–15) + `QUESTION_BANK_URLS`.     |
| `llm`   | AI soạn từng câu theo đúng độ khó/chủ đề; lỗi thì tự dùng bộ có sẵn và báo người chơi. |
| `mixed` | Ngẫu nhiên xen kẽ hai nguồn trên.                                                      |

**Bộ công khai** ([`src/data/bank`](src/data/bank/README.md)): HuggingFace `nlplabtdtu/general-multi-choices-ailatrieuphu-870`
và GitHub `zero4897hn/AiLaTrieuPhu`. Cả hai **không nêu giấy phép** — cân nhắc rủi ro bản quyền trước khi phân phối công khai.
Độ khó/thể loại do LLM chấm một lần (`data/bank-ratings.json`), `bun run bank:import` dựng lại mà không cần LLM.

**Thêm bộ từ internet**: đặt `QUESTION_BANK_URLS` (JSON công khai, tải lúc chạy, cache 1 giờ). Chấp nhận mảng hoặc
`{ "questions": [...] }` với `question|q|text`, `options|choices|answers` (mảng chuỗi hoặc `{key, answer}`), `answer` (chỉ số 0–3,
chữ cái A–D hoặc nội dung đáp án), `level|difficulty` (1–15 hoặc `easy|medium|hard`; thiếu thì gán ổn định theo id).

**AI tạo câu hỏi** — cấu hình trên máy chủ bằng biến môi trường (xem [`.env.example`](.env.example)):

```bash
LLM_PROVIDER=openai        # openai | anthropic | gemini | openrouter | groq | custom
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
# Ollama / LM Studio / vLLM (tương thích OpenAI):
# LLM_PROVIDER=custom LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=qwen2.5:14b
```

Người chơi cũng có thể nhập **khóa API riêng** trong Cài đặt (lưu ở trình duyệt, chỉ chọn được nhà cung cấp trong danh
sách để tránh SSRF). Khóa của máy chủ có giới hạn mềm `LLM_RATE_LIMIT_PER_10_MIN` lượt/IP (theo từng isolate Workers).

## Kiến trúc

```
src/routes/                        __root.tsx (document), index.tsx (loader lấy cấu hình công khai)
src/server/game.functions.ts      server function: fetchQuestionFn / submitAnswerFn / requestLifelineFn / getPublicConfigFn
src/lib/game/                     rules (hằng số luật), engine (reducer thuần), types
src/server/                       bank, llm, lifelines, token, game-service (marker server-only)
src/hooks/use-game.ts             nối reducer với server function, nạp trước câu kế tiếp khi dùng AI
src/components/game, ui/8bit      giao diện (8bitcn / shadcn)
```

- **Không lộ đáp án**: máy chủ gửi câu hỏi kèm _token_ mã hóa AES-256-GCM (chứa đáp án + hạn 6 giờ); chấm điểm và quyền
  trợ giúp đều qua server function. Phiên là stateless nên chạy được trên Workers — **`GAME_SECRET` bắt buộc ở production**
  (mỗi isolate Workers có bộ nhớ riêng, khóa ngẫu nhiên theo tiến trình sẽ làm token không giải mã được ở nơi khác).
  Đây là chống nhìn trộm qua DevTools, không phải chống gian lận có chủ đích.
- Phương án được xáo trộn phía server cho mọi câu hỏi (bộ dữ liệu thường có đáp án lệch về một vị trí).
- Phông: VT323 (đủ dấu tiếng Việt) cho chữ, Press Start 2P chỉ cho chữ số — Press Start 2P không có glyph tiếng Việt.
- Âm thanh 8-bit tổng hợp bằng WebAudio, không cần file; thành tích lưu `localStorage`.
