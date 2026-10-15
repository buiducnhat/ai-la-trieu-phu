# Luật chơi 2026 áp dụng trong game

Nguồn: Ai là triệu phú Wiki (Phiên bản 15), Who Wants To Be A Millionaire Wiki (Ai Là Triệu Phú 2026), VTV/Tuổi Trẻ 31/03–01/04/2026. Phiên bản 15 phát sóng từ 31/03/2026. Cài đặt trong `src/lib/game/rules.ts`, có test.

## Thang tiền

| Câu   | Tiền                  | Câu    | Tiền                   |
| ----- | --------------------- | ------ | ---------------------- |
| 1     | 1.000.000             | 9      | 14.000.000             |
| 2     | 2.000.000             | **10** | **22.000.000** (mốc 2) |
| 3     | 3.000.000             | 11     | 30.000.000             |
| 4     | 4.000.000             | 12     | 60.000.000             |
| **5** | **5.000.000** (mốc 1) | 13     | 120.000.000            |
| 6     | 6.000.000             | 14     | 250.000.000            |
| 7     | 8.000.000             | **15** | **500.000.000**        |
| 8     | 10.000.000            |        |                        |

## Quy tắc

- Dừng cuộc chơi trước khi khóa: nhận tiền của câu đã trả lời đúng gần nhất (câu 1: 0 đ).
- Trả lời sai ở câu 1–5: 0 đ; câu 6–10: 5.000.000 đ; câu 11–15: 22.000.000 đ.
- Không giới hạn thời gian cho mỗi câu.
- Quyền trợ giúp (mỗi quyền một lần, được dùng nhiều quyền trong một câu): 50:50; gọi điện thoại cho người thân (30 giây); sự trợ giúp của người đồng hành; sự trợ giúp của hai nhà thông thái (30 giây, từ câu 6 đến 15). Quyền "hỏi ý kiến khán giả" không còn.

## Quyết định thiết kế

- Dữ liệu trợ giúp là mô phỏng (xem `docs/architecture/lifelines-simulation.md`); thời lượng 30 giây chỉ để hiển thị đồng hồ, không cắt gợi ý.
- Một số chi tiết chương trình thật (ví dụ đổi tên "câu khuyến mãi" thành "câu phần thưởng") không được mô phỏng vì không ảnh hưởng luật tiền thưởng.
- Nguồn công khai về luật có thể thay đổi; khi VTV đổi luật chỉ cần sửa `rules.ts` và test.
