/**
 * 全局错误处理工具
 */

/**
 * 显示错误通知
 */
export function showError(message: string, error?: Error): void {
  console.error('[Error]', message, error);
  
  // TODO: 可以在这里集成通知系统
  // 例如 toast 通知
  alert(`错误: ${message}`);
}

/**
 * 包装异步函数，添加错误处理
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = errorMessage || '操作失败';
      showError(message, error as Error);
      throw error;
    }
  }) as T;
}

/**
 * 安全执行函数，捕获错误但不抛出
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  errorMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('[SafeExecute]', errorMessage || 'Error:', error);
    return defaultValue;
  }
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Retry] Attempt ${i + 1}/${maxRetries} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

