export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callLlm(messages: LlmMessage[]) {
  // LLM 客户端：
  // 后续在这里统一接入模型服务，避免各模块直接调用模型导致规则分散。
  // 所有提示词都应包含“信息来源、置信度、需人工确认”的输出要求。
  return {
    messages,
    content: "当前为工程骨架，尚未接入真实 LLM 服务。",
  };
}
