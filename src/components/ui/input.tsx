'use client'

import { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/* Control shape = 12px radius (shape lock). Resting fill is the raised panel so
   fields read as recessed wells on the surface, with a visible hairline. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`h-11 w-full rounded-xl border border-lines bg-raised/50 px-3.5 text-[15px] text-ink placeholder:text-ink-faint transition-colors focus-visible:outline-none focus-visible:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
)
Input.displayName = 'Input'