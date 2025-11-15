import clsx from 'clsx'
import React from 'react'
import { Input } from './input'

interface DatePickerProps {
  value?: { start?: Date; end?: Date }
  onChange?: (value: { start?: Date; end?: Date }) => void
  placeholder?: { start?: string; end?: string }
  label?: string
  className?: string
  mode?: 'range' | 'single'
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = { start: '开始日期', end: '结束日期' },
  label,
  className,
  mode = 'range',
}) => {
  const parseDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined
    // Try parsing YYYY-MM-DD format (from date input)
    if (dateString.includes('-')) {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) return date
    }
    // Try parsing MM/DD/YYYY format
    const parts = dateString.split('/')
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1
      const day = parseInt(parts[1], 10)
      const year = parseInt(parts[2], 10)
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) return date
    }
    return undefined
  }

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const newStart = parseDate(inputValue)
    onChange?.({ ...value, start: newStart })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const newEnd = parseDate(inputValue)
    onChange?.({ ...value, end: newEnd })
  }

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && <label className="text-xs uppercase text-slate-400">{label}</label>}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Input
            type="date"
            placeholder={placeholder.start}
            value={value?.start ? value.start.toISOString().split('T')[0] : ''}
            onChange={handleStartChange}
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
        {mode === 'range' && (
          <div className="relative">
            <Input
              type="date"
              placeholder={placeholder.end}
              value={value?.end ? value.end.toISOString().split('T')[0] : ''}
              onChange={handleEndChange}
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

