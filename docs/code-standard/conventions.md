# Quy ước code

## Toolchain

- Vite+ (`vp`): `vp check --fix` (format Oxfmt + lint Oxlint type-aware + type-check), `vp test run` (Vitest). Import test từ `vite-plus/test`, không từ `vitest`. Rule `vite-plus/prefer-vite-plus-imports` được bật.
- Package manager: Bun (`bun add`, `bun run`). TanStack Start (Vite, React 19) chạy trên Cloudflare Workers (`@cloudflare/vite-plugin`, `wrangler`), Tailwind 4, TypeScript `strict` + `noUncheckedIndexedAccess`.
- Route là file trong `src/routes` (`createFileRoute`); `src/routeTree.gen.ts` do plugin sinh, không sửa tay. Runtime là Workers: không dùng `fs`/API Node ngoài những gì `nodejs_compat` hỗ trợ (`node:crypto`, `Buffer` đang dùng).
- Đọc `process.env` **bên trong handler/hàm được gọi mỗi request**, không đọc ở module scope (Workers chỉ nạp env lúc có request).

## Phân lớp

- `src/lib/game/*`: thuần, không phụ thuộc React/Node, dùng chung hai phía. Mọi hằng số luật chỉ ở `rules.ts`; UI/engine không hardcode số tiền hay số câu.
- `src/server/*`: bắt đầu bằng `import "@tanstack/react-start/server-only";` (import protection của Start chặn import từ client). Client chỉ import `src/server/game.functions.ts` (server function được thay bằng RPC stub trong bundle client).
- Client không bao giờ nhận đáp án; thao tác cần đáp án đi qua token + server function có `.validator(zod)`.
- Dữ liệu từ ngoài (body request, localStorage, JSON của LLM/URL) luôn parse bằng zod hoặc hàm chuẩn hóa; bỏ dòng hỏng thay vì ném lỗi.

## UI

- Dùng component 8bitcn từ `@/components/ui/8bit/*` (thêm bằng `bunx shadcn@latest add @8bitcn/<tên>`); không sửa file sinh ra trong `components/ui`.
- Khung pixel tự viết dùng class `.pixel-box` + `data-state` (`selected|correct|wrong`).
- Font: VT323 (có dấu tiếng Việt) cho chữ; Press Start 2P **chỉ cho chữ số** vì không có glyph tiếng Việt (ký hiệu "đ" dùng font thường — xem `Money`).
- Chữ hiển thị cho người dùng bằng tiếng Việt; định dạng tiền `formatVnd` (`1.000.000 đ`).
- Chỉ animation khi `prefers-reduced-motion: no-preference`; nút/đáp án có `aria-label`, vùng kết quả `role="status"`/`aria-live`.

## Test

- Test hành vi (luật, reducer, bất biến token, lọc/chọn câu, xác suất trợ giúp); LLM test bằng HTTP server giả cục bộ. `game-service.test.ts` chạy trên bank thật đóng gói trong repo.
- Hook async dùng `useRef` cập nhật trong `useEffect` để callback luôn thấy giá trị mới nhất.

## Dữ liệu bank

- Không sửa tay `src/data/bank/*.json`; chạy `bun run bank:import` (xác định, kết quả giống nhau nếu dữ liệu gốc + `data/bank-ratings.json` không đổi).

## Quy trình đóng góp

- Nhánh từ `main`, PR vào `main`; commit theo Conventional Commits (`feat:`, `fix:`, `docs:`). CI (`bun run check`, `bun run test`, `bun run build`) phải qua trước khi merge; merge vào `main` tự deploy. Chi tiết: `CONTRIBUTING.md`.
