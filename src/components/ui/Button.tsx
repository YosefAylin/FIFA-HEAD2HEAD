'use client'

import { forwardRef } from 'react'

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon'

/* Pill-shaped controls (shape lock: interactive = full pill).
   Gold is the single loud action; everything else stays quiet. */
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold ' +
  'transition-all duration-150 active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ' +
  'focus-visible:ring-offset-2 ring-offset-pitch disabled:pointer-events-none disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-gold-ink hover:bg-gold-deep',
  outline:
    'border border-lines bg-transparent text-ink hover:bg-raised/60',
  ghost: 'text-ink-mid hover:bg-raised/60 hover:text-ink',
  destructive: 'bg-loss/15 text-loss hover:bg-loss/25',
  success: 'bg-win/15 text-win hover:bg-win/25',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-12 px-6 text-base',
  icon: 'h-11 w-11',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
)
Button.displayName = 'Button'