'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Radio, Users, MessageSquare,
  Pencil, Check, X, ChevronLeft, ChevronRight,
  MoreVertical, Lock, LockOpen, Trash2, Ban,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { ChatDeleteModal } from '@/components/data/ChatDeleteModal'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'

interface Chat {
  chat_id:   number
  chat_name: string
  chat_type: 'private' | 'group' | 'channel'
  count:     number
  blocked:   boolean
}

interface Message {
  id: number
  chat_id: number
  chat_name: string
  chat_type: string
  sender_name: string
  text: string
  source: string
  original_date: string | null
  edited_at: string | null
}

function highlight(text: string, q: string) {
  if (!q || q.length < 2) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--signal)', color: '#0d0d0f', borderRadius: 2, padding: '0 2px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ChatTypeIcon({ type }: { type: string }) {
  if (type === 'channel') return <Radio size={12} strokeWidth={1.75} color="var(--text-muted)" />
  if (type === 'group')   return <Users size={12} strokeWidth={1.75} color="var(--text-muted)" />
  return <MessageSquare size={12} strokeWidth={1.75} color="var(--text-muted)" />
}

function chatTypeBadgeVariant(type: string): 'info' | 'neutral' | 'success' {
  if (type === 'channel') return 'info'
  if (type === 'group')   return 'success'
  return 'neutral'
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

function MessageCard({ msg, q, onSave }: { msg: Message; q: string; onSave: (id: number, text: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(msg.text)
  const [saving, setSaving]   = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  async function save() {
    setSaving(true)
    await onSave(msg.id, draft)
    setSaving(false)
    setEditing(false)
  }

  function cancel() { setDraft(msg.text); setEditing(false) }

  return (
    <motion.div
      layout
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        transition: 'border-color 0.15s',
      }}
      whileHover={{ borderColor: 'rgba(138,227,238,0.25)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px', minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{msg.sender_name || 'Неизвестно'}</span>
          <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-soft)' }}>
            <ChatTypeIcon type={msg.chat_type} />
            {msg.chat_name}
          </span>
          <Badge variant={chatTypeBadgeVariant(msg.chat_type)}>
            {msg.chat_type === 'channel' ? 'канал' : msg.chat_type === 'group' ? 'группа' : 'личка'}
          </Badge>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatDate(msg.original_date)}</span>
          {msg.edited_at && <span style={{ color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>изменено</span>}
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(msg.text); setEditing(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--text-muted)', fontSize: 12, flexShrink: 0,
              padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            <Pencil size={11} strokeWidth={2} />
            Изменить
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <textarea
              ref={ref}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={4}
              style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, resize: 'vertical', width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Button variant="ghost" size="sm" onClick={cancel}>
                <X size={13} strokeWidth={2} style={{ marginRight: 4 }} />
                Отмена
              </Button>
              <Button variant="primary" size="sm" loading={saving} onClick={save} disabled={!draft.trim()}>
                <Check size={13} strokeWidth={2} style={{ marginRight: 4 }} />
                Сохранить
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 14, lineHeight: '1.55', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)' }}
          >
            {highlight(msg.text, q)}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 32px' }}>
      <img
        src="/illustrations/empty.svg"
        alt=""
        style={{ width: 120, height: 120, margin: '0 auto 16px', opacity: 0.5 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
        {hasQuery ? 'Ничего не найдено' : 'Нет сообщений'}
      </p>
      {!hasQuery && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, opacity: 0.7 }}>
          Импортируйте данные через раздел Подключения
        </p>
      )}
    </div>
  )
}

export default function DataPage() {
  const [chats, setChats]       = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [page, setPage]         = useState(1)
  const [q, setQ]               = useState('')
  const [chatId, setChatId]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [deleteFor, setDeleteFor] = useState<Chat | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (query: string, chat: string, pg: number) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (chat) params.set('chat', chat)
    params.set('page', String(pg))
    const res = await fetch(`/api/data?${params}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setLoading(false)
  }, [])

  const loadChats = useCallback(async () => {
    const res = await fetch('/api/data/chats')
    const data = await res.json()
    setChats(data.chats ?? [])
  }, [])

  useEffect(() => { loadChats() }, [loadChats])

  useEffect(() => {
    load(q, chatId, page)
  }, [page, chatId, load])

  function onSearchChange(value: string) {
    setQ(value)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(value, chatId, 1), 300)
  }

  function selectChat(id: string) {
    setChatId(id)
    setPage(1)
    load(q, id, 1)
  }

  async function toggleBlock(c: Chat) {
    const next = !c.blocked
    await fetch(`/api/data/chats/${c.chat_id}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: next, name: c.chat_name, type: c.chat_type }),
    })
    await loadChats()
  }

  async function confirmDelete(block: boolean) {
    if (!deleteFor) return
    await fetch(`/api/data/chats/${deleteFor.chat_id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block }),
    })
    if (chatId === String(deleteFor.chat_id)) {
      setChatId('')
      setPage(1)
      load(q, '', 1)
    }
    await loadChats()
  }

  const active   = chats.filter(c => c.count > 0)
  const orphans  = chats.filter(c => c.count === 0 && c.blocked)
  const totalChats = active.reduce((s, c) => s + Number(c.count), 0)

  async function handleSave(id: number, text: string) {
    await fetch(`/api/data/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text, edited_at: new Date().toISOString() } : m))
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Chat sidebar */}
      <div style={{
        width: 250, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Чаты
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          <NavItem label="Все" count={totalChats} active={chatId === ''} onClick={() => selectChat('')} />
          {active.map(c => (
            <NavItem
              key={c.chat_id}
              label={c.chat_name || String(c.chat_id)}
              count={Number(c.count)}
              type={c.chat_type}
              blocked={c.blocked}
              active={chatId === String(c.chat_id)}
              onClick={() => selectChat(String(c.chat_id))}
              onToggleBlock={() => toggleBlock(c)}
              onDelete={() => setDeleteFor(c)}
            />
          ))}

          {orphans.length > 0 && (
            <>
              <div style={{
                padding: '14px 16px 6px', marginTop: 8,
                borderTop: '1px solid var(--border)',
                fontSize: 11, fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Ban size={12} strokeWidth={2} />
                Заблокированные
              </div>
              {orphans.map(c => (
                <NavItem
                  key={c.chat_id}
                  label={c.chat_name || String(c.chat_id)}
                  count={0}
                  type={c.chat_type}
                  blocked={true}
                  orphan
                  active={false}
                  onClick={() => {}}
                  onToggleBlock={() => toggleBlock(c)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--surface)',
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="search"
              placeholder="Поиск по сообщениям..."
              value={q}
              onChange={e => onSearchChange(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
          {total > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {total.toLocaleString('ru-RU')} сообщ.
            </span>
          )}
        </div>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : messages.length === 0 ? (
            <EmptyState hasQuery={Boolean(q)} />
          ) : (
            <motion.div
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden"
              animate="show"
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {messages.map(m => (
                <motion.div
                  key={m.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }}
                >
                  <MessageCard msg={m} q={q} onSave={handleSave} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {!loading && pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1}
                style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', color: page <= 1 ? 'var(--text-muted)' : 'var(--text)', opacity: page <= 1 ? 0.4 : 1, background: 'transparent', cursor: page <= 1 ? 'default' : 'pointer' }}
              >
                <ChevronLeft size={14} strokeWidth={2} />
              </button>

              {buildPageNumbers(page, pages).map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} style={{ color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(Number(p))}
                    style={{
                      minWidth: 32, height: 32, borderRadius: 8, fontSize: 13, border: '1px solid var(--border)',
                      background: p === page ? 'var(--accent-soft)' : 'transparent',
                      color: p === page ? '#0d0d0f' : 'var(--text-muted)',
                      fontWeight: p === page ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pages}
                style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', color: page >= pages ? 'var(--text-muted)' : 'var(--text)', opacity: page >= pages ? 0.4 : 1, background: 'transparent', cursor: page >= pages ? 'default' : 'pointer' }}
              >
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>

      <ChatDeleteModal
        open={deleteFor !== null}
        chatName={deleteFor?.chat_name ?? ''}
        count={deleteFor?.count ?? 0}
        onClose={() => setDeleteFor(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function NavItem({
  label, count, type, active, onClick, blocked, orphan, onToggleBlock, onDelete,
}: {
  label: string
  count: number
  type?: 'private' | 'group' | 'channel'
  active: boolean
  onClick: () => void
  blocked?: boolean
  orphan?: boolean
  onToggleBlock?: () => void
  onDelete?: () => void
}) {
  const [menu, setMenu] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useOnClickOutside(wrapRef, () => setMenu(false))

  const showActions = Boolean(onToggleBlock || onDelete)

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center',
        background: active ? 'var(--surface-2)' : 'transparent',
        borderLeft: active ? '3px solid var(--accent-soft)' : '3px solid transparent',
        transition: 'background 0.12s, color 0.12s',
        opacity: blocked ? 0.55 : 1,
      }}
    >
      <button
        onClick={onClick}
        disabled={orphan}
        style={{
          flex: 1, minWidth: 0, textAlign: 'left',
          padding: '7px 10px 7px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13,
          color: active ? 'var(--text)' : 'var(--text-muted)',
          background: 'transparent',
          cursor: orphan ? 'default' : 'pointer',
        }}
      >
        {type && <ChatTypeIcon type={type} />}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {blocked && (
          <Lock size={11} strokeWidth={2} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        )}
        {!orphan && (
          <span style={{ fontSize: 11, opacity: 0.55, flexShrink: 0 }}>
            {count.toLocaleString('ru-RU')}
          </span>
        )}
      </button>

      {showActions && (
        <button
          onClick={(e) => { e.stopPropagation(); setMenu(m => !m) }}
          aria-label="Действия"
          style={{
            flexShrink: 0,
            padding: '6px 8px',
            color: 'var(--text-muted)',
            background: menu ? 'var(--surface-3)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 6,
            marginRight: 4,
          }}
        >
          <MoreVertical size={14} strokeWidth={2} />
        </button>
      )}

      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: '100%', right: 4,
              zIndex: 20, marginTop: 2,
              minWidth: 220,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 4,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            {onToggleBlock && (
              <MenuItem
                onClick={() => { setMenu(false); onToggleBlock() }}
                icon={blocked ? <LockOpen size={13} strokeWidth={2} /> : <Lock size={13} strokeWidth={2} />}
              >
                {blocked ? 'Разблокировать загрузку' : 'Не загружать новые'}
              </MenuItem>
            )}
            {onDelete && (
              <MenuItem
                onClick={() => { setMenu(false); onDelete() }}
                icon={<Trash2 size={13} strokeWidth={2} />}
                danger
              >
                Удалить данные
              </MenuItem>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuItem({
  onClick, icon, children, danger,
}: {
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px',
        fontSize: 13,
        color: danger ? 'var(--danger)' : 'var(--text)',
        background: 'transparent',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      {children}
    </button>
  )
}
