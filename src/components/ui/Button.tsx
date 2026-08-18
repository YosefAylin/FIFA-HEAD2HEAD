'use client'

import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'ring-offset-background disabled:pointer-events-none disabled:opacity-50 min-h-[48px]'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  outline: 'border border-border bg-background text-foreground hover:bg-accent/10',
  ghost: 'text-foreground hover:bg-accent/10',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  success: 'bg-success text-white hover:bg-success/90',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-12 px-6 text-lg',
  icon: 'h-12 w-12',
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
