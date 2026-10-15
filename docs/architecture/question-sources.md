# Nguồn câu hỏi: bộ công khai, URL ngoài, LLM

`issueQuestion` (`src/server/game-service.ts`) chọn nguồn theo `source` của người chơi.

| Chế độ  | Hành vi                                                                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bank`  | `pickFromBank`: loại câu đã ra, ưu tiên chủ đề (nếu ≥ 3 câu khớp), lấy câu có `level` gần số câu nhất, chọn ngẫu nhiên. Phương án được xáo trộn phía server (`shuffleOptions`). |
| `llm`   | Gọi LLM; lỗi/thiếu cấu hình/quá giới hạn thì **quay về bank** và trả `notice` hiển thị cho người chơi.                                                                          |
| `mixed` | 50% bank, 50% LLM (cùng cơ chế fallback).                                                                                                                                       |

Bank cạn: cho phép lặp câu thay vì kẹt ván.

## Bộ có sẵn và bộ từ URL (`src/server/bank.ts`)

- Đóng gói: `src/data/bank/questions.json` + `sources.json` (1.204 câu, level 1–15; xem `src/data/bank/README.md` về nguồn, giấy phép, cách import lại).
- Bổ sung: `QUESTION_BANK_URLS` (JSON công khai), tải lúc chạy, cache 1 giờ, URL lỗi bị bỏ qua. `normalizeExternal` chấp nhận nhiều dạng JSON (mảng hoặc `{questions:[...]}`; `options` là mảng chuỗi hoặc `{key,answer}`; `answer` là chỉ số/chữ cái/nội dung). Thiếu `level` thì gán ổn định theo hash id.

## LLM (`src/server/llm.ts`)

- Cấu hình server từ env (`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`); hỗ trợ API Anthropic và API tương thích OpenAI (preset trong `src/lib/llm-presets.ts`: openai, anthropic, gemini, openrouter, groq; `custom` cho Ollama/LM Studio/vLLM).
- Người chơi có thể nhập khóa riêng ở Cài đặt; chỉ nhận `provider` thuộc danh sách preset, không nhận URL tùy ý (tránh SSRF).
- Mỗi lần gọi LLM sinh **cả câu hỏi, 4 phương án, `answerIndex`, `category`, `explanation`** trong một JSON (`buildPrompt`/`parseGeneratedQuestion`); độ khó trong prompt theo số câu (`tierOf`). Đáp án vào token, không có lệnh gọi LLM nào khi chấm.
- Parse: bỏ tiền tố "A.", từ chối phương án trùng / "tất cả các đáp án". Chỉ thử lại khi JSON sai định dạng; lỗi HTTP/timeout (45 s) thì dừng và fallback. OpenAI-compatible thử lại không `response_format` khi nhận 400/422.
- Khóa của server bị giới hạn `LLM_RATE_LIMIT_PER_10_MIN` lượt/IP (`rate-limit.ts`, **bộ nhớ từng isolate Workers** nên chỉ là hàng rào mềm; cần giới hạn chặt thì dùng Cloudflare Rate Limiting/WAF). IP lấy từ `cf-connecting-ip`.
- Câu do LLM sinh **không được kiểm chứng đúng sai**; chất lượng phụ thuộc model.
