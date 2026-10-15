export type LlmKind = "openai" | "anthropic";

export interface LlmPreset {
  id: string;
  label: string;
  /** "openai" = API tương thích OpenAI Chat Completions. */
  kind: LlmKind;
  baseUrl: string;
  defaultModel: string;
}

export const LLM_PRESETS: readonly LlmPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-haiku-4-5",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
  },
];

export function getPreset(id: string): LlmPreset | undefined {
  return LLM_PRESETS.find((p) => p.id === id);
}
