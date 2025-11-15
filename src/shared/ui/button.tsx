import clsx from 'clsx'
import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={clsx(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-slate-700 text-slate-100 hover:bg-slate-600': variant === 'default',
            'bg-slate-800 text-slate-200 hover:bg-slate-700': variant === 'secondary',
            'border border-slate-600 bg-transparent hover:bg-slate-700/60': variant === 'outline',
            'hover:bg-slate-800 hover:text-slate-100': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-500': variant === 'destructive',
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-md px-3': size === 'sm',
            'h-11 rounded-md px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

