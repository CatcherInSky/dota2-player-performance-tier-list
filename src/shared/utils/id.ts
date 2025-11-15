/**
 * 生成UUID
 * 优先使用crypto.randomUUID()，如果不支持则使用fallback实现
 * @returns UUID字符串
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  return template.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8
    return value.toString(16)
  })
}

