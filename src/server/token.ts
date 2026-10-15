import "@tanstack/react-start/server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * Token câu hỏi: toàn bộ câu hỏi + đáp án được mã hóa AES-256-GCM bằng khóa
 * chỉ máy chủ biết. Trình duyệt chỉ giữ chuỗi mờ, không thể đọc đáp án; máy
 * chủ không cần lưu phiên (stateless) nên chạy được trên Cloudflare Workers/serverless.
 */

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;

export const tokenPayloadSchema = z.object({
  id: z.string(),
  number: z.number().int().min(1).max(15),
  text: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().optional(),
  category: z.string().optional(),
  source: z.string(),
  origin: z.enum(["bank", "llm"]),
  exp: z.number(),
});

export type TokenPayload = z.infer<typeof tokenPayloadSchema>;

type GlobalWithSecret = typeof globalThis & { __altpDevSecret?: Buffer };

function getKey(): Buffer {
  const secret = process.env.GAME_SECRET;
  if (secret) return createHash("sha256").update(secret).digest();
  // Production (đặc biệt Cloudflare Workers: mỗi isolate là một "tiến trình") mà không có
  // khóa dùng chung thì token do isolate này cấp sẽ không giải mã được ở isolate khác.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Thiếu GAME_SECRET: bắt buộc khi chạy production (wrangler secret put GAME_SECRET)",
    );
  }
  // Dev/test: khóa ngẫu nhiên theo tiến trình (giữ qua HMR).
  const g = globalThis as GlobalWithSecret;
  g.__altpDevSecret ??= randomBytes(32);
  return g.__altpDevSecret;
}

export function sealQuestion(payload: Omit<TokenPayload, "exp">, now = Date.now()): string {
  const full: TokenPayload = { ...payload, exp: now + TOKEN_TTL_MS };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(full), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((b) => b.toString("base64url")).join(".");
}

export class InvalidTokenError extends Error {
  constructor(message = "Token câu hỏi không hợp lệ hoặc đã hết hạn") {
    super(message);
    this.name = "InvalidTokenError";
  }
}

export function openQuestion(token: string, now = Date.now()): TokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new InvalidTokenError();
  try {
    const [iv, tag, data] = parts.map((p) => Buffer.from(p, "base64url")) as [
      Buffer,
      Buffer,
      Buffer,
    ];
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const payload = tokenPayloadSchema.parse(JSON.parse(json));
    if (payload.exp < now) throw new InvalidTokenError("Câu hỏi đã hết hạn, hãy bắt đầu ván mới");
    return payload;
  } catch (e) {
    if (e instanceof InvalidTokenError) throw e;
    throw new InvalidTokenError();
  }
}
