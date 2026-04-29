'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, User, Sparkles, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, Calendar, MessageSquare,
  AtSign, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonText, SkeletonRow } from '@/components/ui/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  tg_id:        string
  name:         string
  username:     string | null
  contact_type: string
  first_seen:   string | null
  last_seen:    string | null
  msg_count:    number
  has_profile:  boolean
}

// ─── Markdown renderer (simple, no deps) ──────────────────────────────────────

function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<span class="wikilink">$2</span>')
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink">$1</span>')
    .replace(/^→ (.+)$/gm, '<div class="link-line">→ $1</div>')
    .replace(/^- \[ \] (.+)$/gm, '<div class="checkbox unchecked">☐ $1</div>')
    .replace(/^- \[x\] (.+)$/gm, '<div class="checkbox checked">☑ $1</div>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/^(#\w+)/gm, '<span class="tag">$1</span>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\*(.+)\*$/gm, '<p class="muted-p">$1</p>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hup]|<div|<hr|<li)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hud])/g, '$1')
    .replace(/(<\/[hud][^>]*>)<\/p>/g, '$1')
}

// ─── Analyze job polling ───────────────────────────────────────────────────

function useAnalyzeJob() {
  const [jobId, setJobId]   = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [total, setTotal]   = useState(0)
  const [currentName, setCurrentName] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => () => clearInterval(pollRef.current), [])

  async function startJob() {
    setStatus('running'); setProgress(0); setTotal(0)
    const r = await fetch('/api/analyze', { method: 'POST' }).then(x => x.json())
    if (r.error) { setStatus('error'); return }
    setJobId(r.jobId)

    pollRef.current = setInterval(async () => {
      const p = await fetch(`/api/analyze?jobId=${r.jobId}`).then(x => x.json())
      setProgress(p.progress ?? 0)
      setTotal(p.total ?? 0)
      setCurrentName(p.currentName ?? '')
      if (p.status === 'done')  { setStatus('done');  clearInterval(pollRef.current) }
      if (p.status === 'error') { setStatus('error'); clearInterval(pollRef.current) }
    }, 1500)
  }

  return { jobId, status, progress, total, currentName, startJob }
}

// ─── Contact list item ─────────────────────────────────────────────────────

function ContactItem({
  contact, active, onClick,
}: {
  contact: Contact; active: boolean; onClick: () => void
}) {
  const lastSeen = contact.last_seen
    ? new Date(contact.last_seen).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : null

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: active ? 'var(--surface-2)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--accent-soft)' : 'transparent'}`,
        color: 'var(--text)',
        transition: 'background 0.12s',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: active ? 'rgba(138,227,238,0.15)' : 'var(--surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <User size={14} strokeWidth={1.75} color={active ? 'var(--accent-soft)' : 'var(--text-muted)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contact.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {contact.username && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{contact.username}</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MessageSquare size={9} strokeWidth={2} />{contact.msg_count}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {contact.has_profile && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
        )}
        {lastSeen && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lastSeen}</span>
        )}
      </div>
    </button>
  )
}

// ─── Profile view ──────────────────────────────────────────────────────────

function ProfileView({
  contact, onReanalyze,
}: {
  contact: Contact | null; onReanalyze?: () => void
}) {
  const [profile, setProfile]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [rerunning, setRerunning] = useState(false)

  useEffect(() => {
    if (!contact) { setProfile(null); return }
    setLoading(true); setProfile(null)
    fetch(`/api/crm/contacts/${contact.tg_id}`)
      .then(r => r.json())
      .then(d => { setProfile(d.profile ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [contact])

  if (!contact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <User size={40} strokeWidth={1} color="var(--text-muted)" style={{ opacity: 0.3 }} />
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Выберите контакт</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(138,227,238,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={18} strokeWidth={1.75} color="var(--accent-soft)" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{contact.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              {contact.username && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <AtSign size={11} strokeWidth={2} />@{contact.username}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MessageSquare size={11} strokeWidth={2} />{contact.msg_count} сообщений
              </span>
              {contact.last_seen && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Calendar size={11} strokeWidth={2} />
                  {new Date(contact.last_seen).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          loading={rerunning}
          onClick={async () => {
            setRerunning(true)
            await fetch(`/api/crm/contacts/${contact.tg_id}`, { method: 'POST' })
            // Poll for re-analysis completion
            setTimeout(() => {
              setRerunning(false)
              // Re-fetch profile
              fetch(`/api/crm/contacts/${contact.tg_id}`)
                .then(r => r.json())
                .then(d => setProfile(d.profile ?? null))
            }, 8000)
            onReanalyze?.()
          }}
        >
          <RefreshCw size={13} strokeWidth={2} style={{ marginRight: 4 }} />
          Обновить
        </Button>
      </div>

      {/* Profile content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SkeletonText lines={2} />
            <SkeletonText lines={4} />
            <SkeletonText lines={3} />
          </div>
        ) : profile ? (
          <div
            className="vault-profile"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(profile) }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <Sparkles size={32} strokeWidth={1} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Профиль ещё не создан</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, opacity: 0.7 }}>
              Запустите AI-анализ чтобы сгенерировать профиль
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [contacts, setContacts]     = useState<Contact[]>([])
  const [filtered, setFiltered]     = useState<Contact[]>([])
  const [selected, setSelected]     = useState<Contact | null>(null)
  const [loading, setLoading]       = useState(true)
  const [q, setQ]                   = useState('')
  const searchRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const { status, progress, total, currentName, startJob } = useAnalyzeJob()

  const loadContacts = useCallback(async () => {
    const data = await fetch('/api/crm/contacts').then(r => r.json())
    const list = data.contacts ?? []
    setContacts(list)
    setFiltered(list)
    setLoading(false)
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  // Reload contacts when analysis finishes
  useEffect(() => {
    if (status === 'done') loadContacts()
  }, [status, loadContacts])

  function onSearch(value: string) {
    setQ(value)
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      setFiltered(
        contacts.filter(c =>
          c.name?.toLowerCase().includes(value.toLowerCase()) ||
          c.username?.toLowerCase().includes(value.toLowerCase())
        )
      )
    }, 200)
  }

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700 }}>CRM</h1>

        <div style={{ flex: 1 }} />

        {/* Analysis status */}
        <AnimatePresence>
          {status === 'running' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
            >
              <Loader2 size={12} className="animate-spin" />
              <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-soft)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              <span>{currentName || 'Анализ...'} {progress}/{total}</span>
            </motion.div>
          )}
          {status === 'done' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}
            >
              <CheckCircle2 size={13} strokeWidth={2} /> Анализ завершён
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="primary" size="sm"
          loading={status === 'running'}
          onClick={startJob}
        >
          <Sparkles size={13} strokeWidth={2} style={{ marginRight: 5 }} />
          AI-анализ
        </Button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: contact list */}
        <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="search" placeholder="Поиск..." value={q}
                onChange={e => onSearch(e.target.value)}
                style={{ paddingLeft: 32, width: '100%', fontSize: 13, padding: '7px 10px 7px 32px' }}
              />
            </div>
          </div>

          {/* Stats */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{contacts.length} контактов</span>
            <span style={{ fontSize: 11, color: 'var(--success)' }}>
              {contacts.filter(c => c.has_profile).length} профилей
            </span>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4,5,6].map(i => <SkeletonRow key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                {q ? 'Ничего не найдено' : 'Нет контактов. Запустите импорт.'}
              </div>
            ) : (
              filtered.map(c => (
                <ContactItem
                  key={c.tg_id}
                  contact={c}
                  active={selected?.tg_id === c.tg_id}
                  onClick={() => setSelected(c)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: profile */}
        <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg)' }}>
          <ProfileView
            contact={selected}
            onReanalyze={() => {
              setTimeout(loadContacts, 10000)
            }}
          />
        </div>
      </div>

      <style>{`
        .vault-profile h1 { font-size: 20px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em; color: var(--text); }
        .vault-profile h2 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; color: var(--accent-soft); text-transform: uppercase; letter-spacing: 0.05em; }
        .vault-profile h3 { font-size: 13px; font-weight: 600; margin: 12px 0 6px; color: var(--text); }
        .vault-profile p { font-size: 13px; line-height: 1.6; color: var(--text); margin: 4px 0; }
        .vault-profile strong { font-weight: 600; }
        .vault-profile code { font-family: var(--font-geist-mono); font-size: 12px; background: var(--surface-2); padding: 1px 5px; border-radius: 4px; }
        .vault-profile ul { list-style: none; padding: 0; margin: 6px 0; }
        .vault-profile li { font-size: 13px; color: var(--text); padding: 3px 0 3px 16px; position: relative; }
        .vault-profile li::before { content: '·'; position: absolute; left: 4px; color: var(--accent-soft); }
        .vault-profile .checkbox { font-size: 13px; padding: 3px 0; color: var(--text); }
        .vault-profile .checked { color: var(--text-muted); text-decoration: line-through; }
        .vault-profile .wikilink { color: var(--accent-soft); cursor: default; }
        .vault-profile .tag { color: var(--signal); font-size: 12px; font-weight: 500; }
        .vault-profile .link-line { font-size: 12px; color: var(--text-muted); margin: 4px 0; }
        .vault-profile .muted-p { color: var(--text-muted) !important; font-size: 11px !important; }
        .vault-profile hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
      `}</style>
    </div>
  )
}
