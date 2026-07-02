import { env } from "../config/env";

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * 真实 LLM 调用（OpenAI 兼容 /chat/completions 接口）。
 * 未配置 LLM_API_KEY/LLM_BASE_URL 时返回 null，调用方回退到规则版实现。
 * 任何错误都吞掉并返回 null，保证问答功能不因外部服务不可用而中断。
 */
export async function callLlm(messages: LlmMessage[]): Promise<string | null> {
  if (!env.llm.apiKey || !env.llm.baseUrl) return null;
  const model = env.llm.model || "gpt-4o-mini";
  try {
    const response = await fetch(`${env.llm.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.llm.apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch {
    return null;
  }
}

export const llmConfigured = Boolean(env.llm.apiKey && env.llm.baseUrl);
