'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles, AlertCircle, RotateCcw } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  error?: boolean
}

const SUGGESTED = [
  'Кто из контактов ждёт от меня ответа?',
  'О чём я разговаривал с коллегами на этой неделе?',
  'Есть ли незакрытые договорённости?',
  'Какие темы чаще всего обсуждались?',
]

export default function ChatPage() {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...history, assistantMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-10).map(m => ({ role: m.role, content: m.content })),
          query: text,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Ошибка запроса')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            accumulated += parsed.text ?? ''
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: accumulated }
              return updated
            })
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Произошла ошибка. Попробуйте ещё раз.',
          error: true,
        }
        return updated
      })
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 800, margin: '0 auto', width: '100%' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 0' }}>

        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', paddingTop: 48 }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
              background: 'rgba(138,227,238,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={24} strokeWidth={1.5} color="var(--accent-soft)" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Второй мозг</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
              Задай вопрос по своим перепискам и контактам
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: 13,
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)', background: 'var(--surface)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 20,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'rgba(138,227,238,0.15)' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 2,
              }}>
                {msg.role === 'user'
                  ? <User size={14} strokeWidth={1.75} color="var(--accent-soft)" />
                  : <Bot size={14} strokeWidth={1.75} color="var(--text-muted)" />
                }
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: msg.role === 'user' ? 'rgba(138,227,238,0.12)' : 'var(--surface)',
                border: `1px solid ${msg.error ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
                fontSize: 14,
                lineHeight: '1.6',
                color: msg.error ? 'var(--danger)' : 'var(--text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content || (loading && i === messages.length - 1
                  ? <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0,1,2].map(d => (
                        <span key={d} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--text-muted)', opacity: 0.5,
                          animation: `pulse 1.2s ${d * 0.2}s ease-in-out infinite`,
                        }} />
                      ))}
                    </span>
                  : ''
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, opacity: 0.7 }}
          >
            <RotateCcw size={11} strokeWidth={2} /> Новый диалог
          </button>
        )}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14, padding: '10px 12px',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Задай вопрос... (Enter — отправить, Shift+Enter — перенос)"
            disabled={loading}
            rows={1}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', color: 'var(--text)',
              fontSize: 14, lineHeight: '1.5',
              fontFamily: 'inherit', maxHeight: 120,
            }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: input.trim() && !loading ? 'var(--accent-soft)' : 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              border: 'none',
            }}
          >
            <Send size={14} strokeWidth={2} color={input.trim() && !loading ? '#0d0d0f' : 'var(--text-muted)'} />
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center', opacity: 0.6 }}>
          Поиск по переписке через OpenAI GPT-4o-mini
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
