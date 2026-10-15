import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { LIFELINE_IDS, type LifelineId } from "@/lib/game/rules";
import type { AnswerResult, IssuedQuestion, LifelineResult, PublicConfig } from "@/lib/game/types";

import { checkAnswer, getPublicConfig, issueQuestion, runLifeline } from "./game-service";
import { LifelineUnavailableError } from "./lifelines";
import { InvalidTokenError } from "./token";

/**
 * Server functions: ranh giới client/server của game. Mọi thao tác cần đáp án đúng
 * đi qua đây. Chỉ file này (và các `.server`/marker) được import từ client; phần thân
 * handler bị thay bằng RPC stub trong bundle client.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof InvalidTokenError || e instanceof LifelineUnavailableError) {
    return { ok: false, error: e.message };
  }
  console.error("[server fn]", e);
  return { ok: false, error: "Có lỗi máy chủ, vui lòng thử lại." };
}

export const getPublicConfigFn = createServerFn({ method: "GET" }).handler(
  (): Promise<PublicConfig> => getPublicConfig(),
);

const questionSchema = z.object({
  number: z.number().int().min(1).max(15),
  exclude: z.array(z.string().max(200)).max(15),
  avoid: z.array(z.string().max(600)).max(15),
  source: z.enum(["bank", "llm", "mixed"]),
  topic: z.string().max(80),
  llm: z.object({
    provider: z.string().max(40),
    model: z.string().max(120),
    apiKey: z.string().max(400),
  }),
});

function clientKey(): string {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    getRequestHeader("x-real-ip") ||
    "local"
  );
}

export const fetchQuestionFn = createServerFn({ method: "POST" })
  .validator(questionSchema)
  .handler(async ({ data }): Promise<ActionResult<IssuedQuestion>> => {
    try {
      return { ok: true, data: await issueQuestion({ ...data, clientKey: clientKey() }) };
    } catch (e) {
      return fail(e);
    }
  });

const answerSchema = z.object({
  token: z.string().max(4000),
  choice: z.number().int().min(0).max(3),
});

export const submitAnswerFn = createServerFn({ method: "POST" })
  .validator(answerSchema)
  .handler(({ data }): ActionResult<AnswerResult> => {
    try {
      return { ok: true, data: checkAnswer(data.token, data.choice) };
    } catch (e) {
      return fail(e);
    }
  });

const lifelineSchema = z.object({
  token: z.string().max(4000),
  id: z.enum(LIFELINE_IDS as [LifelineId, ...LifelineId[]]),
  removed: z.array(z.number().int().min(0).max(3)).max(3),
});

export const requestLifelineFn = createServerFn({ method: "POST" })
  .validator(lifelineSchema)
  .handler(({ data }): ActionResult<LifelineResult> => {
    try {
      return { ok: true, data: runLifeline(data.token, data.id, data.removed) };
    } catch (e) {
      return fail(e);
    }
  });
