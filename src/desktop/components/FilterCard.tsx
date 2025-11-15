import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'

interface FilterCardProps {
  inputs: ReactNode
  onApply: () => void
  onReset: () => void
}

export function FilterCard({ inputs, onApply, onReset }: FilterCardProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{inputs}</div>
      <div className="mt-4 flex gap-2">
        <Button onClick={onApply}>{t('home.search')}</Button>
        <Button variant="secondary" onClick={onReset}>
          {t('home.reset')}
        </Button>
      </div>
    </div>
  )
}

interface InputFieldProps {
  label: string
  value: string
  type?: string
  placeholder?: string
  onChange: (value: string) => void
}

export function InputField({ label, value, onChange, type = 'text', placeholder }: InputFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs uppercase text-slate-400">{label}</span>}
      <input
        type={type}
        className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
