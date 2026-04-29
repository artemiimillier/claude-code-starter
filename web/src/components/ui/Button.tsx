'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

const base = 'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium cursor-pointer border-0 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] disabled:pointer-events-none disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary:   'text-[#0d0d0f] font-semibold',
  secondary: 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-3)]',
  ghost:     'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
  danger:    'bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.25)] text-[var(--danger)] hover:bg-[rgba(248,113,113,0.2)]',
}

const sizes: Record<Size, string> = {
  sm: 'h-7  px-3   text-xs',
  md: 'h-9  px-4   text-sm',
  lg: 'h-11 px-5   text-sm',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon, children, className, disabled, style, ...props }, ref) => {
    const isPrimary = variant === 'primary'

    return (
      <motion.button
        ref={ref}
        whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.1 }}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        style={isPrimary ? { background: 'var(--gradient-accent)', ...style } : style}
        {...(props as any)}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
