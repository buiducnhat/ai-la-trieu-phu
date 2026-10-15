# Cấu trúc thư mục

```
vite.config.ts         Plugin: cloudflare (ssr env) -> tanstackStart -> react; alias "@"; cấu hình vp (lint/fmt/test)
wrangler.jsonc         Worker: main = @tanstack/react-start/server-entry, nodejs_compat
src/router.tsx         getRouter() (createRouter từ routeTree.gen.ts)
src/routeTree.gen.ts   Sinh tự động bởi plugin Start (không sửa tay)
src/routes/
  __root.tsx           Document (html/head/body), meta, CSS, Toaster, TooltipProvider, class "dark"
  index.tsx            Route "/": loader getPublicConfigFn -> <GameApp/>
src/styles/globals.css Theme (biến màu oklch), font @fontsource, .pixel-box, animation
src/lib/game/           rules.ts (luật 2026), engine.ts (reducer), types.ts  [dùng được cả client lẫn server]
src/lib/                llm-presets.ts, sound.ts (WebAudio), storage.ts (localStorage), utils.ts (cn)
src/server/             game.functions.ts (createServerFn — ranh giới client/server) + bank, llm, lifelines, token, game-service, random, rate-limit  [marker "@tanstack/react-start/server-only"]
src/hooks/              use-game.ts (reducer <-> server), use-timers.ts (typewriter, countdown)
src/components/game/    menu, play screen, answer, ladder, lifeline bar/dialog, rules, settings, result, money
src/components/ui/      shadcn + 8bit/ (sinh bởi shadcn CLI từ registry @8bitcn; không sửa tay, bị lint/format bỏ qua)
src/data/bank/          questions.json, sources.json, README.md (sinh bởi scripts/import-bank.ts)
src/test/server-only.ts Stub cho marker server-only khi chạy test (alias trong vite.config.ts)
scripts/import-bank.ts  Tải nguồn công khai -> bank (chạy bằng Bun)
data/bank-ratings.json  Kết quả chấm độ khó/thể loại/ok bằng LLM (commit, để import không cần LLM)
.github/workflows/    ci.yml (PR + push main: check/test/build); deploy do Cloudflare Workers Builds, xem architecture/ci-cd-deployment.md
.github/              dependabot.yml, PULL_REQUEST_TEMPLATE.md, ISSUE_TEMPLATE/
LICENSE (MIT, chỉ phủ mã nguồn), CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md   Tệp cộng đồng mã nguồn mở
```

## Điểm vào

| Việc                                      | Nơi                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Hằng số luật (thang tiền, mốc, trợ giúp)  | `src/lib/game/rules.ts`                                                              |
| Một ván chơi (client)                     | `src/components/game/game-app.tsx` → `useGame`                                       |
| Phát câu hỏi                              | `src/server/game-service.ts#issueQuestion`                                           |
| Server function (lấy câu, chấm, trợ giúp) | `src/server/game.functions.ts`                                                       |
| Cấu hình môi trường                       | `.env.example`, `src/server/llm.ts#resolveEnvLlm`, `game-service.ts#getPublicConfig` |

Test nằm cạnh mã nguồn (`*.test.ts`), chạy bằng `vp test run`.
