import clsx from 'clsx'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

interface DialogRootProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export const DialogRoot: React.FC<DialogRootProps> = ({ open, defaultOpen, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false)
  const isControlled = typeof open === 'boolean'
  const currentOpen = isControlled ? open : internalOpen

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const context = useMemo<DialogContextValue>(
    () => ({
      open: currentOpen,
      setOpen,
    }),
    [currentOpen, setOpen],
  )

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>
}

interface DialogPortalProps {
  children?: React.ReactNode
}

export const DialogPortal: React.FC<DialogPortalProps> = ({ children }) => {
  if (typeof document === 'undefined') {
    return null
  }
  return createPortal(children, document.body)
}

interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogOverlay: React.FC<DialogOverlayProps> = ({ className, ...rest }) => {
  const context = useDialogContext()
  if (!context.open) return null
  return <div className={className} {...rest} />
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogContent: React.FC<DialogContentProps> = ({ className, children, ...rest }) => {
  const context = useDialogContext()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        context.setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [context])

  if (!context.open) return null
  return (
    <div className={className} role="dialog" {...rest}>
      {children}
    </div>
  )
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle: React.FC<DialogTitleProps> = ({ className, children, ...rest }) => {
  return (
    <h2 className={clsx('text-lg font-semibold', className)} {...rest}>
      {children}
    </h2>
  )
}

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const DialogClose: React.FC<DialogCloseProps> = ({ className, children, ...rest }) => {
  const context = useDialogContext()
  return (
    <button
      type="button"
      className={className}
      onClick={() => context.setOpen(false)}
      {...rest}
    >
      {children}
    </button>
  )
}

function useDialogContext() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog components must be used within DialogRoot')
  }
  return context
}

