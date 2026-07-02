export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmResult {
  messages: LlmMessage[];
  /** 模型返回内容；未配置或调用失败时为降级说明文本。 */
  content: string;
  /** 是否来自真实模型（false 表示走了降级）。 */
  fromModel: boolean;
}

const FALLBACK_NOTICE = "未配置 LLM 服务（LLM_API_KEY/LLM_BASE_URL），当前返回降级说明，未调用真实模型。";

/**
 * 统一 LLM 客户端（OpenAI 兼容 /chat/completions）。
 * 所有提示词都应包含"信息来源、置信度、需人工确认"的输出要求。
 * 未配置或出错时降级，绝不因外部服务不可用而中断审查流程。
 */
export async function callLlm(messages: LlmMessage[]): Promise<LlmResult> {
  const apiKey = process.env.LLM_API_KEY?.trim();
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const model = process.env.LLM_MODEL?.trim() || "gpt-4o-mini";

  if (!apiKey || !baseUrl) {
    return { messages, content: FALLBACK_NOTICE, fromModel: false };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      return { messages, content: `LLM 调用失败（HTTP ${response.status}），已降级。`, fromModel: false };
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) {
      return { messages, content: content.trim(), fromModel: true };
    }
    return { messages, content: "LLM 返回为空，已降级。", fromModel: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { messages, content: `LLM 调用异常（${reason}），已降级。`, fromModel: false };
  }
}
