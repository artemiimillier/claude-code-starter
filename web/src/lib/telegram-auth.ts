import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram/tl'
import { computeCheck } from 'telegram/Password'
import pool from './db'
import { encrypt, decrypt } from './crypto'

const API_ID   = Number(process.env.TG_API_ID ?? 0)
const API_HASH = process.env.TG_API_HASH ?? ''

interface PendingAuth {
  client:        TelegramClient
  phoneCodeHash: string
  phone:         string
  expiresAt:     number
}

// In-memory state for the two-step auth handshake
const pendingAuth = new Map<number, PendingAuth>()

function makeClient(session = '') {
  return new TelegramClient(new StringSession(session), API_ID, API_HASH, {
    connectionRetries: 3,
    useWSS: false,
  })
}

export async function sendCode(userId: number, phone: string): Promise<string> {
  const existing = pendingAuth.get(userId)
  if (existing) {
    await existing.client.disconnect().catch(() => {})
    pendingAuth.delete(userId)
  }

  const client = makeClient()
  await client.connect()

  const { phoneCodeHash } = await client.sendCode(
    { apiId: API_ID, apiHash: API_HASH },
    phone,
  )

  pendingAuth.set(userId, {
    client,
    phoneCodeHash,
    phone,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })

  return phoneCodeHash
}

export type VerifyResult =
  | { ok: true }
  | { need2FA: true }

export async function verifyCode(userId: number, code: string): Promise<VerifyResult> {
  const pending = pendingAuth.get(userId)
  if (!pending || Date.now() > pending.expiresAt) {
    throw new Error('Сессия истекла. Начните заново.')
  }

  const { client, phone, phoneCodeHash } = pending

  try {
    await client.invoke(new Api.auth.SignIn({
      phoneNumber:   phone,
      phoneCodeHash: phoneCodeHash,
      phoneCode:     code,
    }))
  } catch (err: any) {
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      return { need2FA: true }
    }
    throw new Error(err.errorMessage ?? String(err))
  }

  await persistSession(userId, client, phone)
  pendingAuth.delete(userId)
  return { ok: true }
}

export async function verify2FA(userId: number, password: string): Promise<void> {
  const pending = pendingAuth.get(userId)
  if (!pending || Date.now() > pending.expiresAt) {
    throw new Error('Сессия истекла. Начните заново.')
  }

  const { client, phone } = pending

  // Get SRP password params from Telegram
  const passwordData = await client.invoke(new Api.account.GetPassword())
  const passwordCheck = await computeCheck(passwordData, password)

  try {
    await client.invoke(new Api.auth.CheckPassword({ password: passwordCheck }))
  } catch (err: any) {
    throw new Error(err.errorMessage ?? 'Неверный пароль')
  }

  await persistSession(userId, client, phone)
  pendingAuth.delete(userId)
}

async function persistSession(userId: number, client: TelegramClient, phone: string) {
  const session = (client.session as StringSession).save()
  const enc = encrypt(session)
  await pool.execute(`
    INSERT INTO tg_sessions (user_id, session_string_enc, phone)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE session_string_enc = VALUES(session_string_enc),
                            phone = VALUES(phone),
                            updated_at = NOW()
  `, [userId, enc, phone])
  await client.disconnect()
}

export async function disconnectUser(userId: number) {
  const pending = pendingAuth.get(userId)
  if (pending) {
    await pending.client.disconnect().catch(() => {})
    pendingAuth.delete(userId)
  }
  await pool.execute('DELETE FROM tg_sessions WHERE user_id = ?', [userId])
}

export async function getConnectedClient(userId: number): Promise<TelegramClient | null> {
  const [rows] = await pool.execute(
    'SELECT session_string_enc FROM tg_sessions WHERE user_id = ?',
    [userId],
  ) as any[]

  const row = (rows as any[])[0]
  if (!row) return null

  const session = decrypt(row.session_string_enc)
  const client  = makeClient(session)
  await client.connect()
  return client
}

export async function getAuthStatus(userId: number): Promise<{ connected: boolean; phone?: string }> {
  const [rows] = await pool.execute(
    'SELECT phone FROM tg_sessions WHERE user_id = ?',
    [userId],
  ) as any[]
  const row = (rows as any[])[0]
  return row ? { connected: true, phone: row.phone } : { connected: false }
}
