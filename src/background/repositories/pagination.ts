import type { PaginatedResult } from '../../shared/types/api'

export const DEFAULT_PAGE_SIZE = 20

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


