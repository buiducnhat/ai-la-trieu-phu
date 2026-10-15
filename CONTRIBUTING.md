# Đóng góp

Cảm ơn bạn quan tâm. Bằng việc tham gia, bạn đồng ý tuân theo [Bộ quy tắc ứng xử](CODE_OF_CONDUCT.md).

## Thiết lập

Cần [Bun](https://bun.sh) (phiên bản trong `package.json#devEngines`).

```bash
bun install
cp .env.example .dev.vars   # tùy chọn
bun run dev                 # http://localhost:3000
```

## Quy trình

1. Fork, tạo nhánh từ `main` (`feat/...`, `fix/...`, `docs/...`).
2. Đọc [docs/SUMMARY.md](docs/SUMMARY.md); quy ước code ở [docs/code-standard/conventions.md](docs/code-standard/conventions.md).
3. Chạy trước khi mở PR (CI chạy y hệt):
   ```bash
   bun run check   # format + lint + type-check (Vite+)
   bun run test    # Vitest
   bun run build
   ```
4. Mở Pull Request vào `main`, điền mẫu PR. Giữ PR nhỏ, một mục đích; commit theo [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`...).

## Lưu ý

- Hằng số luật chơi chỉ nằm ở `src/lib/game/rules.ts`; đổi luật phải kèm test và cập nhật `docs/project-pdr/game-rules-2026.md`.
- Không sửa tay `src/data/bank/*.json` và `src/routeTree.gen.ts`; dùng `bun run bank:import`.
- Không commit khóa/bí mật. Báo lỗ hổng theo [SECURITY.md](SECURITY.md).
- Bộ câu hỏi lấy từ nguồn không nêu giấy phép: đừng thêm dữ liệu có bản quyền rõ ràng mà không có giấy phép phù hợp.

Đóng góp của bạn được cấp phép theo [MIT](LICENSE).
