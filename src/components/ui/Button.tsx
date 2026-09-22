'use client'

import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  outline: 'border border-border bg-background text-foreground hover:bg-accent/10',
  ghost: 'text-foreground hover:bg-accent/10',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
}

// `sm` is deliberately compact (dense rows/filters); every other size keeps a
// 48px minimum touch target for one-thumb phone use.
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 min-h-[48px] px-5 text-base',
  lg: 'h-12 min-h-[48px] px-6 text-lg',
  icon: 'h-12 w-12 min-h-[48px] min-w-[48px]',
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
