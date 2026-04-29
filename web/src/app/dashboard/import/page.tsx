'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, CheckCircle2, AlertCircle, Loader2,
  Clock, Database, Phone, ShieldCheck, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ─── Auth flow ────────────────────────────────────────────────────────────────

type AuthStep = 'check' | 'phone' | 'code' | '2fa' | 'connected'

function TelegramAuthBlock({ onConnected }: { onConnected: () => void }) {
  const [step, setStep]           = useState<AuthStep>('check')
  const [phone, setPhone]         = useState('')
  const [code, setCode]           = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [connectedPhone, setConnectedPhone] = useState('')

  useEffect(() => {
    fetch('/api/telegram/auth/status')
      .then(r => r.json())
      .then(d => {
        if (d.connected) { setConnectedPhone(d.phone ?? ''); setStep('connected'); onConnected() }
        else setStep('phone')
      })
  }, [onConnected])

  async function sendCode() {
    setError(''); setLoading(true)
    const r = await fetch('/api/telegram/auth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.error) { setError(d.error); return }
    setStep('code')
  }

  async function verifyCode(pwd?: string) {
    setError(''); setLoading(true)
    const r = await fetch('/api/telegram/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, password: pwd }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.error) { setError(d.error); return }
    if (d.need2FA) { setStep('2fa'); return }
    setConnectedPhone(phone)
    setStep('connected')
    onConnected()
  }

  async function disconnect() {
    await fetch('/api/telegram/auth', { method: 'DELETE' })
    setStep('phone'); setPhone(''); setCode(''); setPassword(''); setConnectedPhone('')
  }

  if (step === 'check') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
        <Loader2 size={16} className="animate-spin" /> Проверка подключения...
      </div>
    )
  }

  if (step === 'connected') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(74,222,128,0.12)',
          }}>
            <CheckCircle2 size={18} color="var(--success)" strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>Аккаунт подключён</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{connectedPhone}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={disconnect}>Отключить</Button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AnimatePresence mode="wait" initial={false}>

        {step === 'phone' && (
          <motion.div key="phone"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Введите номер телефона в международном формате (+7...)
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="tel" placeholder="+79991234567" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendCode()}
                  style={{ paddingLeft: 36, width: '100%' }}
                />
              </div>
              <Button variant="primary" size="md" loading={loading} onClick={sendCode} disabled={!phone.trim()}>
                Получить код
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'code' && (
          <motion.div key="code"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Код отправлен в Telegram на номер <b style={{ color: 'var(--text)' }}>{phone}</b>.
              Введите его ниже.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text" placeholder="12345" value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyCode()}
                style={{ flex: 1, textAlign: 'center', fontSize: 20, letterSpacing: '0.2em', fontFamily: 'var(--font-geist-mono)' }}
                maxLength={10}
                autoFocus
              />
              <Button variant="primary" size="md" loading={loading} onClick={() => verifyCode()} disabled={!code.trim()}>
                Войти
              </Button>
            </div>
            <button onClick={() => setStep('phone')} style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'left' }}>
              ← Изменить номер
            </button>
          </motion.div>
        )}

        {step === '2fa' && (
          <motion.div key="2fa"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Требуется двухфакторный пароль облака Telegram.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <ShieldCheck size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password" placeholder="Облачный пароль" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verifyCode(password)}
                  style={{ paddingLeft: 36, width: '100%' }}
                  autoFocus
                />
              </div>
              <Button variant="primary" size="md" loading={loading} onClick={() => verifyCode(password)} disabled={!password.trim()}>
                Подтвердить
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle size={14} strokeWidth={2} />
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Import block ─────────────────────────────────────────────────────────────

type JobStatus = 'idle' | 'running' | 'done' | 'error'

const HOURS_OPTIONS = [
  { label: 'За последние 24 часа', value: 24 },
  { label: 'За последние 7 дней',  value: 168 },
  { label: 'За последние 30 дней', value: 720 },
  { label: 'За последние 3 месяца', value: 2160 },
  { label: 'Вся история',          value: 0 },
]

function ImportBlock({ canImport }: { canImport: boolean }) {
  const [hours, setHours]         = useState(24)
  const [jobId, setJobId]         = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle')
  const [progress, setProgress]   = useState(0)
  const [total, setTotal]         = useState(0)
  const [currentChat, setCurrentChat] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    return () => clearInterval(pollRef.current)
  }, [])

  async function startImport() {
    setError(''); setLoading(true); setJobStatus('idle'); setProgress(0); setTotal(0)
    const r = await fetch('/api/telegram/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.error) { setError(d.error); return }
    setJobId(d.jobId)
    setJobStatus('running')

    pollRef.current = setInterval(async () => {
      const p = await fetch(`/api/telegram/import?jobId=${d.jobId}`).then(x => x.json())
      setProgress(p.progress ?? 0)
      setTotal(p.total ?? 0)
      setCurrentChat(p.currentChat ?? '')
      if (p.status === 'done')  { setJobStatus('done');  clearInterval(pollRef.current) }
      if (p.status === 'error') { setJobStatus('error'); setError(p.error ?? ''); clearInterval(pollRef.current) }
    }, 1500)
  }

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hours selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Период импорта</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {HOURS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setHours(o.value)}
              disabled={jobStatus === 'running'}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, border: '1px solid var(--border)',
                background: hours === o.value ? 'var(--accent-soft)' : 'transparent',
                color: hours === o.value ? '#0d0d0f' : 'var(--text-muted)',
                fontWeight: hours === o.value ? 600 : 400,
                cursor: jobStatus === 'running' ? 'default' : 'pointer',
                opacity: jobStatus === 'running' ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <Button
        variant="primary"
        size="md"
        loading={loading || jobStatus === 'running'}
        disabled={!canImport}
        onClick={startImport}
        style={{ alignSelf: 'flex-start' }}
      >
        <Download size={15} strokeWidth={2} style={{ marginRight: 6 }} />
        {jobStatus === 'running' ? 'Импортируется...' : 'Начать импорт'}
      </Button>

      {!canImport && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Сначала подключите Telegram-аккаунт выше.
        </p>
      )}

      {/* Progress */}
      <AnimatePresence>
        {(jobStatus === 'running' || jobStatus === 'done') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: 'linear', duration: 0.3 }}
                  style={{ height: '100%', borderRadius: 3, background: jobStatus === 'done' ? 'var(--success)' : 'var(--accent-soft)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {jobStatus === 'running'
                    ? <><Loader2 size={11} className="animate-spin" /> {currentChat || 'Обработка...'}</>
                    : <><CheckCircle2 size={11} color="var(--success)" /> Импорт завершён</>
                  }
                </span>
                <span>{progress} / {total > 0 ? total : '...'} чатов</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {jobStatus === 'error' && error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [tgConnected, setTgConnected] = useState(false)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 720 }}>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Импорт данных</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Подключите аккаунт Telegram и загрузите историю переписок
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Step 1: Auth */}
        <Section
          step={1}
          icon={Phone}
          title="Подключение аккаунта"
          description="Авторизуйтесь через номер телефона. Код придёт в Telegram."
        >
          <TelegramAuthBlock onConnected={() => setTgConnected(true)} />
        </Section>

        {/* Step 2: Import */}
        <Section
          step={2}
          icon={Download}
          title="Загрузка истории"
          description="Выберите период и запустите импорт всех чатов."
          dim={!tgConnected}
        >
          <ImportBlock canImport={tgConnected} />
        </Section>

        {/* Info */}
        <Section
          step={3}
          icon={Database}
          title="После импорта"
          description="Сообщения сохраняются в базу данных. AI-анализ запускается автоматически и строит профили контактов."
          dim={true}
          noBody
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: Clock,    text: 'Вся история: ~15–30 мин для активного аккаунта' },
              { icon: Database, text: 'Дедупликация: повторный импорт не создаёт дубликатов' },
              { icon: RefreshCw, text: 'Инкрементальный импорт: выбирайте "За последние 24 часа" для обновлений' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                <Icon size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                {text}
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}

function Section({
  step, icon: Icon, title, description, children, dim = false, noBody = false,
}: {
  step: number
  icon: React.FC<any>
  title: string
  description: string
  children?: React.ReactNode
  dim?: boolean
  noBody?: boolean
}) {
  return (
    <motion.div
      className="card"
      style={{ padding: '20px 24px', opacity: dim ? 0.55 : 1, transition: 'opacity 0.3s' }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: dim ? 0.55 : 1, y: 0 }}
      transition={{ duration: 0.38, delay: step * 0.06 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: children && !noBody ? 20 : 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: 'rgba(138,227,238,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} strokeWidth={1.75} color="var(--accent-soft)" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{description}</div>
        </div>
        <div style={{
          marginLeft: 'auto', flexShrink: 0,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        }}>
          {step}
        </div>
      </div>
      {children && !noBody && children}
      {noBody && children}
    </motion.div>
  )
}
