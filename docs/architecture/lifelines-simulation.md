# Mô phỏng quyền trợ giúp

`src/server/lifelines.ts`, gọi qua `requestLifeline` với token (server biết đáp án).

- **50:50**: loại ngẫu nhiên 2 phương án sai.
- **Gọi điện / Đồng hành / Hai nhà thông thái**: mỗi người "biết đáp án" với xác suất nội suy tuyến tính theo số câu (`SKILLS`: phone 0.95→0.45, plusOne 0.90→0.40, wiseMen 0.97→0.72 từ câu 1 đến 15). Không biết thì đoán trong các phương án còn lại, nên có thể sai. Không bao giờ gợi ý phương án đã bị 50:50 loại.
- Lời thoại chọn theo mức tự tin (cao/vừa/thấp). Người đồng hành đôi khi kèm một phương án họ cho là sai (luôn là phương án sai thật).
- Cố ý **không** dùng LLM cho trợ giúp để câu càng khó lời khuyên càng kém và để không tốn token.
- Server từ chối quyền không hợp lệ ở câu hiện tại (`LifelineUnavailableError`, nhà thông thái từ câu 6). Việc "mỗi quyền một lần" do reducer phía client giữ.
