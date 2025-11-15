import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'

interface FilterCardProps {
  inputs: ReactNode
  onApply: () => void
  onReset: () => void
}

export function FilterCard({ inputs, onApply, onReset }: FilterCardProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">{inputs}</div>
      <div className="mt-4 flex gap-2">
        <button className="btn" onClick={onApply}>
          {t('home.search')}
        </button>
        <button className="btn-secondary" onClick={onReset}>
          {t('home.reset')}
        </button>
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
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-xs uppercase text-slate-400">{label}</span>}
      <input
        type={type}
        className="rounded border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

