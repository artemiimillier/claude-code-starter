'use client'

import { motion } from 'framer-motion'
import {
  LayoutDashboard, Database, MessageSquare,
  Plug, Settings, HelpCircle,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

const NAV_TOP = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Дашборд' },
  { href: '/dashboard/data',        icon: Database,        label: 'Данные' },
  { href: '/dashboard/chat',        icon: MessageSquare,   label: 'Чат' },
  { href: '/dashboard/connections', icon: Plug,            label: 'Подключения' },
  { href: '/dashboard/settings',    icon: Settings,        label: 'Настройки' },
]
const NAV_BOTTOM = [
  { href: '/dashboard/help', icon: HelpCircle, label: 'Помощь' },
]

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
  isMobile?: boolean
}

function NavItem({
  href,
  icon: Icon,
  label,
  isOpen,
  active,
  onClick,
}: {
  href: string
  icon: React.ElementType
  label: string
  isOpen: boolean
  active: boolean
  onClick?: () => void
}) {
  const item = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl transition-all duration-150 select-none',
        isOpen ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5',
        active
          ? 'border-l-[3px] rounded-l-none pl-[9px]'
          : 'border-l-[3px] border-l-transparent hover:opacity-80'
      )}
      style={{
        background: active ? 'var(--accent-glow)' : undefined,
        borderLeftColor: active ? 'var(--accent-soft)' : undefined,
        color: active ? 'var(--accent-soft)' : 'var(--text-muted)',
      }}
    >
      <Icon size={18} strokeWidth={active ? 2 : 1.75} className="flex-shrink-0" />
      {isOpen && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="text-sm font-medium whitespace-nowrap overflow-hidden"
          style={{ color: active ? 'var(--accent-soft)' : 'var(--text-muted)' }}
        >
          {label}
        </motion.span>
      )}
    </Link>
  )

  if (!isOpen) {
    return <Tooltip content={label} side="right">{item}</Tooltip>
  }
  return item
}

export function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <motion.aside
      animate={{ width: isOpen ? 240 : 64 }}
      initial={false}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="flex flex-col h-full overflow-hidden flex-shrink-0"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        width: isMobile ? 240 : undefined,
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center h-16 flex-shrink-0 overflow-hidden"
        style={{ borderBottom: '1px solid var(--border)', padding: isOpen ? '0 16px' : '0 22px' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--gradient-accent)', color: '#0d0d0f' }}
        >
          СМ
        </div>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-3 font-semibold text-sm whitespace-nowrap gradient-text"
          >
            Второй мозг
          </motion.span>
        )}
      </div>

      {/* Nav top */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 flex flex-col gap-0.5">
        {NAV_TOP.map(item => (
          <NavItem
            key={item.href}
            {...item}
            isOpen={isOpen}
            active={isActive(item.href)}
            onClick={isMobile ? onClose : undefined}
          />
        ))}
      </nav>

      {/* Nav bottom */}
      <div className="py-3 px-2 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--border)' }}>
        {NAV_BOTTOM.map(item => (
          <NavItem
            key={item.href}
            {...item}
            isOpen={isOpen}
            active={isActive(item.href)}
            onClick={isMobile ? onClose : undefined}
          />
        ))}
      </div>
    </motion.aside>
  )
}
