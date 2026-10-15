# Documentation Summary

Ai Là Triệu Phú 8-bit — game Ai Là Triệu Phú tiếng Việt, luật phiên bản 15 (2026), giao diện pixel 8-bit.
TanStack Start fullstack (Vite, React 19, server functions) triển khai Cloudflare Workers, shadcn/ui + 8bitcn, Tailwind 4, Vite+ (`vp`) cho lint/test, Bun; câu hỏi từ bộ công khai đóng gói sẵn hoặc do LLM tạo.

## Agent Context Guide

Before planning or implementing, read this `docs/SUMMARY.md` file first. Load only the detail docs relevant to the current task, and prioritize `Code Standard` docs for implementation conventions. If docs conflict with code or user intent, use the available question tool before making broad changes.

## Architecture

System design, component interactions, data flows, deployment, and external integrations.

| File                                                            | Description                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| [game-flow.md](architecture/game-flow.md)                       | Luồng chơi, ranh giới client/server (server function), token đáp án |
| [question-sources.md](architecture/question-sources.md)         | Bank, URL ngoài, LLM, fallback và giới hạn tần suất                 |
| [lifelines-simulation.md](architecture/lifelines-simulation.md) | Cách mô phỏng các quyền trợ giúp                                    |

## Codebase

Directory structure, entry points, API patterns, and key modules.

| File                                          | Description                                      |
| --------------------------------------------- | ------------------------------------------------ |
| [directory-map.md](codebase/directory-map.md) | Cấu trúc thư mục, điểm vào, nơi đặt từng loại mã |

## Code Standard

Conventions, naming rules, tech stack versions, and development workflows.

| File                                           | Description                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| [conventions.md](code-standard/conventions.md) | Toolchain, phân lớp lib/server/UI, quy ước 8bitcn/font/a11y, test |
| [environment.md](code-standard/environment.md) | Biến môi trường, lệnh chạy, dữ liệu localStorage                  |

## Project PDR

Product goals, use cases, business rules, and constraints.

| File                                                                 | Description                                     |
| -------------------------------------------------------------------- | ----------------------------------------------- |
| [product-goals.md](project-pdr/product-goals.md)                     | Mục tiêu, trường hợp sử dụng, ngoài phạm vi     |
| [game-rules-2026.md](project-pdr/game-rules-2026.md)                 | Thang tiền, mốc, trợ giúp, nguồn luật           |
| [question-bank-licensing.md](project-pdr/question-bank-licensing.md) | Nguồn bộ câu hỏi, giấy phép, chất lượng dữ liệu |

## Other

| File                                                     | Description                          |
| -------------------------------------------------------- | ------------------------------------ |
| [../src/data/bank/README.md](../src/data/bank/README.md) | Schema và cách import lại bộ câu hỏi |
