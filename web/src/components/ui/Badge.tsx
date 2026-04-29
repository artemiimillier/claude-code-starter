import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
type TrendDirection = 'up' | 'down' | 'flat'

const statusStyles: Record<StatusVariant, string> = {
  success: 'bg-[rgba(74,222,128,0.12)] text-[var(--success)] border-[rgba(74,222,128,0.2)]',
  warning: 'bg-[rgba(251,191,36,0.12)]  text-[var(--warning)] border-[rgba(251,191,36,0.2)]',
  danger:  'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]  border-[rgba(248,113,113,0.2)]',
  info:    'bg-[rgba(138,227,238,0.12)] text-[var(--info)]    border-[rgba(138,227,238,0.2)]',
  neutral: 'bg-[var(--surface-2)]       text-[var(--text-muted)] border-[var(--border)]',
}

export function Badge({
  variant = 'neutral',
  children,
  className,
  dot,
}: {
  variant?: StatusVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        statusStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className="block h-1.5 w-1.5 rounded-full animate-pulse-dot"
          style={{ background: 'currentColor' }}
        />
      )}
      {children}
    </span>
  )
}

export function TrendBadge({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const direction: TrendDirection = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'

  const styles: Record<TrendDirection, string> = {
    up:   'text-[var(--success)] bg-[rgba(74,222,128,0.1)]',
    down: 'text-[var(--danger)]  bg-[rgba(248,113,113,0.1)]',
    flat: 'text-[var(--text-muted)] bg-[var(--surface-2)]',
  }

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular',
        styles[direction],
        className
      )}
    >
      <Icon size={11} strokeWidth={2.5} />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}
