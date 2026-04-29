'use client'

import { Bell, ChevronRight, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Burger } from './Burger'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useModal } from '@/hooks/useModal'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'

interface HeaderProps {
  userEmail: string
  sidebarOpen: boolean
  onToggleSidebar: () => void
  isMobile: boolean
}

const LABELS: Record<string, string> = {
  dashboard:   'Дашборд',
  data:        'Данные',
  chat:        'Чат',
  connections: 'Подключения',
  settings:    'Настройки',
  help:        'Помощь',
}

function Breadcrumb() {
  const pathname = usePathname()
  const parts = pathname.replace('/dashboard', '').split('/').filter(Boolean)

  return (
    <nav className="hidden sm:flex items-center gap-1 text-sm overflow-hidden">
      <Link href="/dashboard" style={{ color: parts.length ? 'var(--text-muted)' : 'var(--text)' }}
        className="hover:opacity-80 transition-opacity whitespace-nowrap">
        Дашборд
      </Link>
      {parts.map((part, i) => (
        <span key={part} className="flex items-center gap-1 overflow-hidden">
          <ChevronRight size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          <span
            className="whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ color: i === parts.length - 1 ? 'var(--text)' : 'var(--text-muted)' }}
          >
            {LABELS[part] ?? part}
          </span>
        </span>
      ))}
    </nav>
  )
}

function AvatarDropdown({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOnClickOutside(ref, () => setOpen(false))
  const initial = email[0]?.toUpperCase() ?? 'U'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:opacity-80"
        style={{ border: '1px solid var(--border)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'var(--gradient-accent)', color: '#0d0d0f' }}
        >
          {initial}
        </div>
        <span className="hidden md:block text-sm max-w-[120px] truncate" style={{ color: 'var(--text-muted)' }}>
          {email}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] w-52 rounded-xl p-1.5 z-50"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div className="px-3 py-2 mb-1">
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{email}</p>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: 4 }} />
          <button
            onClick={() => { setOpen(false); onLogout() }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--danger)' }}
          >
            <LogOut size={15} />
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}

export function Header({ userEmail, sidebarOpen, onToggleSidebar, isMobile }: HeaderProps) {
  const router = useRouter()
  const logoutModal = useModal()

  async function doLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  return (
    <>
      <header
        className="flex items-center justify-between h-16 px-4 flex-shrink-0 z-30"
        style={{
          background: 'rgba(13,13,15,0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <Burger isOpen={isMobile ? sidebarOpen : false} onClick={onToggleSidebar} />
          <Breadcrumb />
        </div>

        <div className="flex items-center gap-2">
          {/* Bell — placeholder */}
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <Bell size={16} />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse-dot"
              style={{ background: 'var(--signal)' }}
            />
          </button>

          <AvatarDropdown email={userEmail} onLogout={logoutModal.open} />
        </div>
      </header>

      <ConfirmModal
        open={logoutModal.isOpen}
        onClose={logoutModal.close}
        onConfirm={doLogout}
        type="warning"
        title="Выйти из аккаунта?"
        description="Вы будете перенаправлены на страницу входа."
        confirmText="Выйти"
      />
    </>
  )
}
