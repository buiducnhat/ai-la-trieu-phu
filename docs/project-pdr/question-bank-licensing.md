# Bộ câu hỏi công khai: nguồn, giấy phép, ràng buộc

| id              | Nguồn                                                                             | Số câu giữ lại | Giấy phép                         |
| --------------- | --------------------------------------------------------------------------------- | -------------- | --------------------------------- |
| `hf-thaotac870` | HuggingFace `nlplabtdtu/general-multi-choices-ailatrieuphu-870` (gốc thaotac.com) | 690            | không nêu                         |
| `gh-zero4897hn` | GitHub `zero4897hn/AiLaTrieuPhu` (3 file sqlite)                                  | 514            | không nêu (repo không có LICENSE) |

- Cả hai nguồn không công bố giấy phép: **rủi ro bản quyền khi phân phối công khai**; cân nhắc trước khi triển khai thương mại. Chi tiết và ghi công ở `src/data/bank/README.md`.
- Đã bỏ qua: `nlplabtdtu/ai_la_trieu_phu` (gated, cần đăng nhập), `ThanhAli-Official/ailatrieuphu` (câu hỏi dạng ảnh), `thiepcong/millionaire_mobile` (không có dữ liệu văn bản), repo GPL-3.0 chưa kiểm tra dữ liệu.
- Độ khó/thể loại do LLM chấm một lần (`data/bank-ratings.json`); ~234 câu bị loại vì LLM đánh giá đáp án sai/mơ hồ. Còn tồn tại: lỗi chính tả trong nguồn, vài câu lệch mức, vài đáp án đáng ngờ, thể loại "Văn hóa"/"Ngôn ngữ" bị gán nhiều.
- Phân bố hiện tại: 77–84 câu mỗi level 1–15.
