'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Bot, Phone, Key, ChevronDown, Save, CheckCircle2,
  Cpu, MessageSquareCode, Wifi, WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useModal } from '@/hooks/useModal'
import { Badge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'

type ConnectionType = 'ai' | 'tg_bot' | 'tg_account'

interface AIConfig { provider: string; api_key: string; model: string }
interface TgBotConfig { bot_token: string }
interface TgAccountConfig { phone: string; session_string: string }

const PROVIDERS = ['Claude (Anthropic)', 'OpenAI']
const CLAUDE_MODELS = ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001']
const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

function ConnectionCard({
  title, icon: Icon, color = 'var(--accent-soft)', connected = false, children,
}: {
  title: string
  icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>
  color?: string
  connected?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div variants={fadeUp} className="card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `color-mix(in srgb, ${color} 18%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} strokeWidth={1.75} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Badge variant={connected ? 'success' : 'neutral'} dot={connected}>
            {connected ? 'Подключено' : 'Не настроено'}
          </Badge>
        </div>
      </div>
      {children}
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function ConnectionsPage() {
  const router = useRouter()
  const [loaded, setLoaded]   = useState(false)
  const [ai, setAi]           = useState<AIConfig>({ provider: 'Claude (Anthropic)', api_key: '', model: CLAUDE_MODELS[0] })
  const [tgBot, setTgBot]     = useState<TgBotConfig>({ bot_token: '' })
  const [tgAcc, setTgAcc]     = useState<TgAccountConfig>({ phone: '', session_string: '' })
  const [saving, setSaving]   = useState<ConnectionType | null>(null)
  const [saved, setSaved]     = useState<ConnectionType | null>(null)
  const [pending, setPending] = useState<{ type: ConnectionType; config: object } | null>(null)

  const confirmModal = useModal()

  useEffect(() => {
    fetch('/api/connections')
      .then(r => r.json())
      .then(data => {
        if (data.ai)         setAi(prev  => ({ ...prev, ...data.ai }))
        if (data.tg_bot)     setTgBot(prev => ({ ...prev, ...data.tg_bot }))
        if (data.tg_account) setTgAcc(prev => ({ ...prev, ...data.tg_account }))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  function requestSave(type: ConnectionType, config: object) {
    setPending({ type, config })
    confirmModal.open()
  }

  async function confirmSave() {
    if (!pending) return
    confirmModal.close()
    const { type, config } = pending
    setSaving(type)
    await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, config }),
    })
    setSaving(null)
    setSaved(type)
    setTimeout(() => setSaved(null), 2500)
    setPending(null)
  }

  const models = ai.provider.startsWith('Claude') ? CLAUDE_MODELS : OPENAI_MODELS

  const isAiConnected   = Boolean(ai.api_key)
  const isBotConnected  = Boolean(tgBot.bot_token)
  const isAccConnected  = Boolean(tgAcc.session_string)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 760 }}>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Подключения</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Настройте AI-провайдера и источники Telegram
        </p>
      </motion.div>

      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate={loaded ? 'show' : 'hidden'}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {!loaded ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* AI */}
            <ConnectionCard title="Искусственный интеллект" icon={Cpu} color="var(--accent-soft)" connected={isAiConnected}>
              <Field label="Провайдер">
                <div style={{ position: 'relative' }}>
                  <select
                    value={ai.provider}
                    onChange={e => setAi({ ...ai, provider: e.target.value, model: e.target.value.startsWith('Claude') ? CLAUDE_MODELS[0] : OPENAI_MODELS[0] })}
                    style={{ appearance: 'none', paddingRight: 36, width: '100%' }}
                  >
                    {PROVIDERS.map(p => <option key={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>
              </Field>
              <Field label="API ключ">
                <div style={{ position: 'relative' }}>
                  <Key size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={ai.api_key}
                    onChange={e => setAi({ ...ai, api_key: e.target.value })}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </Field>
              <Field label="Модель">
                <div style={{ position: 'relative' }}>
                  <select
                    value={ai.model}
                    onChange={e => setAi({ ...ai, model: e.target.value })}
                    style={{ appearance: 'none', paddingRight: 36, width: '100%' }}
                  >
                    {models.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>
              </Field>
              <SaveButton
                saved={saved === 'ai'}
                loading={saving === 'ai'}
                onClick={() => requestSave('ai', ai)}
              />
            </ConnectionCard>

            {/* TG Bot */}
            <ConnectionCard title="Telegram Бот" icon={Bot} color="#5B8DF6" connected={isBotConnected}>
              <Field label="Bot Token">
                <div style={{ position: 'relative' }}>
                  <MessageSquareCode size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    placeholder="123456:ABC-DEF..."
                    value={tgBot.bot_token}
                    onChange={e => setTgBot({ bot_token: e.target.value })}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </Field>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Получи токен у{' '}
                <span style={{ color: 'var(--accent-soft)' }}>@BotFather</span>{' '}
                в Telegram
              </p>
              <SaveButton
                saved={saved === 'tg_bot'}
                loading={saving === 'tg_bot'}
                onClick={() => requestSave('tg_bot', tgBot)}
              />
            </ConnectionCard>

            {/* TG Account */}
            <ConnectionCard title="Telegram Аккаунт" icon={Phone} color="#a78bfa" connected={isAccConnected}>
              <Field label="Номер телефона">
                <div style={{ position: 'relative' }}>
                  <Phone size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    placeholder="+79991234567"
                    value={tgAcc.phone}
                    onChange={e => setTgAcc({ ...tgAcc, phone: e.target.value })}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </Field>
              <Field label="Session String">
                <textarea
                  placeholder="Строка сессии (gramjs/telethon)"
                  value={tgAcc.session_string}
                  onChange={e => setTgAcc({ ...tgAcc, session_string: e.target.value })}
                  rows={3}
                  style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, resize: 'vertical', width: '100%' }}
                />
              </Field>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Session string хранится зашифрованным (AES-256-GCM)
              </p>
              <SaveButton
                saved={saved === 'tg_account'}
                loading={saving === 'tg_account'}
                onClick={() => requestSave('tg_account', tgAcc)}
              />
            </ConnectionCard>
          </>
        )}
      </motion.div>

      <ConfirmModal
        open={confirmModal.isOpen}
        onClose={confirmModal.close}
        onConfirm={confirmSave}
        type="warning"
        title="Сохранить настройки?"
        description="Убедитесь, что введённые данные корректны. Неправильный ключ может нарушить работу сервиса."
        confirmText="Сохранить"
        cancelText="Отмена"
      />
    </div>
  )
}

function SaveButton({ saved, loading, onClick }: { saved: boolean; loading: boolean; onClick: () => void }) {
  return (
    <Button
      variant={saved ? 'secondary' : 'primary'}
      size="md"
      loading={loading}
      onClick={onClick}
      style={{ width: '100%' }}
    >
      {saved ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={14} strokeWidth={2} />
          Сохранено
        </span>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={14} strokeWidth={2} />
          Сохранить
        </span>
      )}
    </Button>
  )
}
