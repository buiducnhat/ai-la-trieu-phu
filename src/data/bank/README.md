# Ngân hàng câu hỏi "Ai là triệu phú"

Bộ câu hỏi đóng gói sẵn cho game (1204 câu, 4 đáp án, mức độ 1–15).

## Nguồn và giấy phép

| id | Nguồn | Giấy phép |
|----|-------|-----------|
| `hf-thaotac870` | HuggingFace [`nlplabtdtu/general-multi-choices-ailatrieuphu-870`](https://huggingface.co/datasets/nlplabtdtu/general-multi-choices-ailatrieuphu-870) (gốc: thaotac.com) | không nêu (`unspecified`) |
| `gh-zero4897hn` | GitHub [`zero4897hn/AiLaTrieuPhu`](https://github.com/zero4897hn/AiLaTrieuPhu), file `Milionare1804/1805/1806.sqlite` | không nêu (repo không có LICENSE) |

Cả hai nguồn đều công khai tải được nhưng **không công bố giấy phép rõ ràng**; hãy xem đây là rủi ro bản quyền
khi phân phối công khai. Chi tiết và số câu giữ lại từng nguồn nằm trong `sources.json`.
Ghi công: nhóm tác giả `nlplabtdtu`, trang thaotac.com và tác giả `zero4897hn`.

## Cách nhập lại

```bash
bun scripts/import-bank.ts
```

Script tải dữ liệu gốc, chuẩn hóa, khử trùng (so khớp không dấu/không phân biệt hoa thường), bỏ câu tham chiếu hình/video,
câu có đáp án kiểu "cả A và B", câu không khớp đúng 1 đáp án, rồi áp `data/bank-ratings.json` và ghi lại
`questions.json` + `sources.json`. Kết quả xác định: cùng dữ liệu gốc + cùng ratings => cùng file.

`data/bank-ratings.json` (id → `{ level, ok, category, score }`) là kết quả một lần chấm bằng LLM: độ khó,
tính đúng/không mơ hồ (`ok=false` bị loại) và thể loại. Với sqlite, tier gốc (dễ/thường/khó) giới hạn mức vào 1–5 / 6–10 / 11–15,
điểm LLM chỉ dùng để sắp xếp trong tier; với bộ HF chỉ dùng điểm LLM (chia theo phân vị). Câu mới chưa có rating
sẽ nhận mức mặc định theo tier hoặc độ dài và script in cảnh báo.

## Schema (`questions.json`)

```ts
{
  id: string;            // "<sourceId>-<10 hex đầu của sha1(văn bản đã chuẩn hóa)>"
  question: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3; // chỉ số đáp án đúng
  level: number;         // 1..15 (1-5 dễ, 6-10 vừa, 11-15 khó)
  category?: string;     // thể loại tiếng Việt
  explanation?: string;
  source: string;        // id trong sources.json
}
```
