/**
 * SQLite 不便存原生数组/对象，这里统一用 JSON 字符串列。
 * 下面是安全的序列化/反序列化助手，解析失败时回退到默认值而非抛错。
 */
export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function parseObject<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}
