import type { PaginatedResult } from '../../shared/types/api'

export const DEFAULT_PAGE_SIZE = 20

/**
 * 对数组进行分页处理
 * @param items - 要分页的数组
 * @param page - 页码（从1开始）
 * @param pageSize - 每页数量
 * @returns 分页结果（包含items、page、pageSize、total）
 */
export function paginate<T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): PaginatedResult<T> {
  const total = items.length
  const safePage = Math.max(page, 1)
  const safePageSize = Math.max(pageSize, 1)
  const start = (safePage - 1) * safePageSize
  const end = start + safePageSize

  return {
    items: items.slice(start, end),
    page: safePage,
    pageSize: safePageSize,
    total,
  }
}


