import clsx from 'clsx'
import React, { createContext, useContext, useState } from 'react'

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = createContext<SelectContextValue | null>(null)

interface SelectRootProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export const SelectRoot: React.FC<SelectRootProps> = ({ value, defaultValue, onValueChange, children }) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const [open, setOpen] = useState(false)
  const currentValue = value ?? internalValue

  const handleValueChange = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, className, ...props }) => {
  const context = useSelectContext()
  return (
    <button
      type="button"
      className={clsx(
        'flex h-10 w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children || <span className={context.value ? '' : 'text-slate-400'}>Select...</span>}
      <svg
        className="ml-2 h-4 w-4 opacity-50"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  const context = useSelectContext()
  if (!context.open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => context.setOpen(false)} />
      <div
        className={clsx(
          'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-700 bg-slate-800 py-1 shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </>
  )
}

interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  children: React.ReactNode
}

export const SelectItem: React.FC<SelectItemProps> = ({ value, children, className, ...props }) => {
  const context = useSelectContext()
  const isSelected = context.value === value

  return (
    <button
      type="button"
      className={clsx(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-700 focus:bg-slate-700',
        isSelected && 'bg-slate-700',
        className,
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

function useSelectContext() {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within SelectRoot')
  }
  return context
}

