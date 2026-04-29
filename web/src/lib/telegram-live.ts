import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { NewMessage, NewMessageEvent } from 'telegram/events'
import { Api } from 'telegram/tl'
import pool from './db'
import { decrypt } from './crypto'
import { isBlocked } from './chat-blocks'

const API_ID   = Number(process.env.TG_API_ID ?? 0)
const API_HASH = process.env.TG_API_HASH ?? ''

interface Live {
  client:  TelegramClient
  handler: (event: NewMessageEvent) => Promise<void>
}

const clients = new Map<number, Live>()
let bootstrapped = false

export async function bootstrap(): Promise<void> {
  if (bootstrapped) return
  bootstrapped = true

  if (!API_ID || !API_HASH) {
    console.warn('[telegram-live] TG_API_ID/TG_API_HASH не заданы — live-приёмник не запущен')
    return
  }

  // Ensure schema exists before we read tg_sessions
  try {
    const { migrate } = await import('./db')
    await migrate()
  } catch (err) {
    console.error('[telegram-live] migrate failed', err)
    return
  }

  const [rows] = await pool.execute('SELECT user_id FROM tg_sessions') as any[]
  // Sequential connect to be gentle on Telegram flood limits
  for (const row of rows as any[]) {
    try {
      await register(Number(row.user_id))
    } catch (err) {
      console.error('[telegram-live] failed to register user', row.user_id, err)
    }
  }
}

export async function register(userId: number): Promise<void> {
  if (clients.has(userId)) return

  const [rows] = await pool.execute(
    'SELECT session_string_enc FROM tg_sessions WHERE user_id = ?',
    [userId],
  ) as any[]
  const row = (rows as any[])[0]
  if (!row) return

  const sessionString = decrypt(row.session_string_enc)
  const client = new TelegramClient(
    new StringSession(sessionString),
    API_ID,
    API_HASH,
    { connectionRetries: 3, useWSS: false, autoReconnect: true },
  )
  await client.connect()

  const handler = async (event: NewMessageEvent) => {
    try { await handleMessage(userId, event) }
    catch (err) { console.error('[telegram-live] handler error', err) }
  }

  client.addEventHandler(handler, new NewMessage({}))
  clients.set(userId, { client, handler })
}

export async function unregister(userId: number): Promise<void> {
  const live = clients.get(userId)
  if (!live) return
  clients.delete(userId)
  try { live.client.removeEventHandler(live.handler, new NewMessage({})) } catch {}
  try { await live.client.disconnect() } catch {}
}

async function handleMessage(userId: number, event: NewMessageEvent) {
  const msg = event.message
  if (!msg || !msg.message?.trim()) return

  const chat = await msg.getChat().catch(() => null) as any
  if (!chat) return

  const chatId = BigInt(chat.id ?? 0)
  if (chatId === BigInt(0)) return

  if (await isBlocked(userId, chatId)) return

  const chatName = (chat.title ?? chat.firstName ?? chat.username ?? '') as string
  const chatType = getChatType(chat)
  const senderName = await resolveSenderName(event)

  await pool.execute(`
    INSERT IGNORE INTO messages
      (user_id, chat_id, chat_name, chat_type, message_id,
       sender_name, text, source, original_date, edited_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `, [
    userId,
    String(chatId),
    chatName,
    chatType,
    msg.id,
    senderName,
    msg.message,
    'live',
    new Date((msg.date ?? Math.floor(Date.now() / 1000)) * 1000),
    msg.editDate ? new Date(msg.editDate * 1000) : null,
  ])

  await pool.execute(`
    INSERT INTO contacts (user_id, tg_id, name, username, contact_type, first_seen, last_seen, msg_count)
    VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 1)
    ON DUPLICATE KEY UPDATE
      name      = COALESCE(VALUES(name), name),
      username  = COALESCE(VALUES(username), username),
      last_seen = NOW(),
      msg_count = msg_count + 1
  `, [
    userId,
    String(chatId),
    chatName || null,
    (chat.username ?? null) as string | null,
    contactTypeFor(chat),
  ])
}

async function resolveSenderName(event: NewMessageEvent): Promise<string> {
  try {
    const sender = await event.message.getSender() as any
    if (!sender) return ''
    if ('firstName' in sender) {
      return [sender.firstName, sender.lastName].filter(Boolean).join(' ')
    }
    if ('title' in sender) return sender.title as string
  } catch {}
  return ''
}

function getChatType(chat: any): 'private' | 'group' | 'channel' {
  const cls = chat.className ?? ''
  if (cls === 'Channel' && chat.broadcast) return 'channel'
  if (cls === 'Channel' || cls === 'Chat' || cls === 'ChatForbidden') return 'group'
  return 'private'
}

function contactTypeFor(chat: any): 'user' | 'bot' | 'channel' | 'group' {
  if (chat.bot) return 'bot'
  const t = getChatType(chat)
  if (t === 'private') return 'user'
  return t
}

// Suppress unused-import warning for Api in some builds
export type _LiveApi = typeof Api
