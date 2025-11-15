/**
 * 安全解析JSON字符串
 * 如果解析失败，返回undefined而不是抛出异常
 * @returns 解析后的对象，如果失败则返回undefined
 */
export function safeJsonParse<T>(value: string | undefined | null): T | undefined {
  if (!value) return undefined
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn('[safeJsonParse] Failed to parse JSON', error, value)
    return undefined
  }
}

