import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import type { PaginatedResult } from '../../shared/types/api'

export type ColumnConfig<T> = {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Array<ColumnConfig<T>>
  data: T[]
  emptyText: string
  onRowClick?: (row: T) => void
  pagination?: PaginatedResult<T>
  onPageChange?: (page: number) => void
}

export function DataTable<T>({
  columns,
  data,
  emptyText,
  onRowClick,
  pagination,
  onPageChange,
}: DataTableProps<T>) {
  const { t } = useI18n()

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/60 shadow">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-800/80">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {data.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-400" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          )}
          {data.map((row, index) => (
            <tr
              key={index}
              className={onRowClick ? 'cursor-pointer hover:bg-slate-700/40' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => {
                const rawValue = column.render ? column.render(row) : (row as Record<string, unknown>)[column.key as string]
                const cellValue = column.render ? rawValue : String(rawValue ?? '--')
                return (
                  <td key={String(column.key)} className="px-4 py-2 text-sm">
                    {cellValue as ReactNode}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && onPageChange && (
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900/60 px-4 py-2 text-sm">
          <div>
            {pagination.total === 0
              ? ''
              : `${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )} / ${pagination.total}`}
          </div>
          <div className="flex gap-2">
            <button
              className="btn"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            >
              {t('nav.back')}
            </button>
            <button
              className="btn"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              {t('nav.forward')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

