export function safeJsonParse<T>(value: string | undefined | null): T | undefined {
  if (!value) return undefined
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn('[safeJsonParse] Failed to parse JSON', error, value)
    return undefined
  }
}

