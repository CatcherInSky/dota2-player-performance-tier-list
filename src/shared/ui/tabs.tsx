import clsx from 'clsx'
import React, { createContext, useContext, useMemo, useState } from 'react'

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

interface TabsRootProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
}

export const TabsRoot: React.FC<TabsRootProps> = ({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')

  const currentValue = value ?? internalValue

  const context = useMemo<TabsContextValue>(
    () => ({
      value: currentValue,
      setValue: (next) => {
        setInternalValue(next)
        onValueChange?.(next)
      },
    }),
    [currentValue, onValueChange],
  )

  return (
    <TabsContext.Provider value={context}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children?: React.ReactNode
  className?: string
}

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  children?: React.ReactNode
  className?: string
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className, ...rest }) => {
  const context = useTabsContext()
  const isActive = context.value === value
  return (
    <button
      type="button"
      className={clsx(className, { 'data-[state=active]': isActive })}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => context.setValue(value)}
      {...rest}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children?: React.ReactNode
  className?: string
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
  const context = useTabsContext()
  if (context.value !== value) {
    return null
  }
  return <div className={className}>{children}</div>
}

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within TabsRoot')
  }
  return context
}

